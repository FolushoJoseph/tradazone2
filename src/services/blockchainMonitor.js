// Public RPC endpoints — override via env vars for testnet/private nodes
const ENDPOINTS = {
    ethereum: import.meta.env.VITE_ETH_RPC || 'https://eth.llamarpc.com',
    starknet: import.meta.env.VITE_STARKNET_RPC || 'https://free-rpc.nethermind.io/mainnet-juno',
    stellar: import.meta.env.VITE_STELLAR_HORIZON || 'https://horizon.stellar.org',
};

const POLL_MS = {
    ethereum: 15_000,
    starknet: 20_000,
    stellar: 8_000,
};

// Tolerance: accept 1% less than requested (covers minor rounding)
const AMOUNT_TOLERANCE = 0.99;

// ─── Low-level helpers ─────────────────────────────────────────────────────

async function ethRpc(method, params) {
    const res = await fetch(ENDPOINTS.ethereum, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json.result;
}

async function starkRpc(method, params) {
    const res = await fetch(ENDPOINTS.starknet, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error.message);
    return json.result;
}

// ─── Per-network checkers ──────────────────────────────────────────────────

async function checkEthereum(merchantAddress, minEth, seenHashes, monitorStartMs) {
    const latestHex = await ethRpc('eth_blockNumber', []);
    const latest = parseInt(latestHex, 16);

    // Scan last 3 blocks to avoid missing the tx if we polled late
    for (let i = 0; i < 3; i++) {
        const blockHex = `0x${(latest - i).toString(16)}`;
        const block = await ethRpc('eth_getBlockByNumber', [blockHex, true]);
        if (!block?.transactions) continue;

        for (const tx of block.transactions) {
            if (seenHashes.has(tx.hash)) continue;
            seenHashes.add(tx.hash);

            if (tx.to?.toLowerCase() !== merchantAddress.toLowerCase()) continue;

            const valueWei = BigInt(tx.value || '0x0');
            const ethValue = Number(valueWei) / 1e18;

            if (ethValue >= minEth * AMOUNT_TOLERANCE) {
                return { hash: tx.hash, amount: ethValue.toFixed(8), currency: 'ETH', network: 'ethereum' };
            }
        }
    }
    return null;
}

async function checkStarknet(merchantAddress, minStrk, seenHashes) {
    // STRK ERC-20 contract on mainnet
    const STRK_CONTRACT = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

    // Transfer event key (keccak of "Transfer")
    const TRANSFER_KEY = '0x0099cd8bde557814842a3121e8ddfd433a539b8c9f14bf31ebf108d12e6196e9';

    let events;
    try {
        const result = await starkRpc('starknet_getEvents', [{
            address: STRK_CONTRACT,
            keys: [[TRANSFER_KEY]],
            from_block: { block_tag: 'latest' },
            to_block: { block_tag: 'latest' },
            chunk_size: 100,
        }]);
        events = result?.events || [];
    } catch {
        return null;
    }

    for (const event of events) {
        if (seenHashes.has(event.transaction_hash)) continue;
        seenHashes.add(event.transaction_hash);

        // ERC-20 Transfer event data: [from, to, amount_low, amount_high]
        const data = event.data || [];
        if (data.length < 4) continue;

        const toAddress = data[1];
        if (toAddress?.toLowerCase() !== merchantAddress.toLowerCase()) continue;

        const amountLow = BigInt(data[2] || '0x0');
        const amountHigh = BigInt(data[3] || '0x0');
        const amountRaw = amountHigh * (2n ** 128n) + amountLow;
        const strkValue = Number(amountRaw) / 1e18;

        if (strkValue >= minStrk * AMOUNT_TOLERANCE) {
            return { hash: event.transaction_hash, amount: strkValue.toFixed(6), currency: 'STRK', network: 'starknet' };
        }
    }
    return null;
}

async function checkStellar(merchantAddress, minAmount, currency, seenHashes, monitorStartMs) {
    const url = `${ENDPOINTS.stellar}/accounts/${merchantAddress}/payments?order=desc&limit=20`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;

    const data = await res.json();
    const records = data._embedded?.records || [];

    for (const record of records) {
        if (seenHashes.has(record.id)) continue;

        // Skip payments that predate when we started monitoring
        const recordTs = new Date(record.created_at).getTime();
        if (recordTs < monitorStartMs - 30_000) continue;

        if (record.type !== 'payment') continue;
        if (record.to !== merchantAddress) continue;

        const assetCode = record.asset_type === 'native' ? 'XLM' : record.asset_code;
        if (assetCode !== currency.toUpperCase()) continue;

        const amount = parseFloat(record.amount);
        if (amount >= minAmount * AMOUNT_TOLERANCE) {
            seenHashes.add(record.id);
            return {
                hash: record.transaction_hash,
                amount: amount.toFixed(7),
                currency: assetCode,
                network: 'stellar',
            };
        }
    }
    return null;
}

// ─── BlockchainMonitor class ───────────────────────────────────────────────

export class BlockchainMonitor {
    constructor({ network, merchantAddress, expectedAmount, currency }) {
        this.network = network;
        this.merchantAddress = merchantAddress;
        this.expectedAmount = parseFloat(expectedAmount);
        this.currency = currency;
        this._active = false;
        this._timerId = null;
        this._seenHashes = new Set();
        this._startMs = Date.now();
        this._retryDelay = 1_000;
        this._maxRetryDelay = 30_000;
    }

    start(onDetected, onError) {
        if (this._active) return;
        this._active = true;

        const poll = async () => {
            if (!this._active) return;
            try {
                const result = await this._check();
                this._retryDelay = 1_000; // reset backoff on success
                if (result) {
                    this.stop();
                    onDetected(result);
                    return;
                }
            } catch (err) {
                if (onError) onError(err.message);
                // Exponential backoff on RPC failure
                this._retryDelay = Math.min(this._retryDelay * 2, this._maxRetryDelay);
            }

            if (this._active) {
                const interval = POLL_MS[this.network] || 15_000;
                this._timerId = setTimeout(poll, Math.max(interval, this._retryDelay));
            }
        };

        poll();
    }

    stop() {
        this._active = false;
        if (this._timerId) {
            clearTimeout(this._timerId);
            this._timerId = null;
        }
    }

    async _check() {
        switch (this.network) {
            case 'ethereum':
                return checkEthereum(this.merchantAddress, this.expectedAmount, this._seenHashes, this._startMs);
            case 'starknet':
                return checkStarknet(this.merchantAddress, this.expectedAmount, this._seenHashes);
            case 'stellar':
                return checkStellar(this.merchantAddress, this.expectedAmount, this.currency, this._seenHashes, this._startMs);
            default:
                return null;
        }
    }
}
