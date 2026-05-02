import { ethers } from 'ethers';
import { Provider as StarknetProvider } from 'starknet';
import * as StellarSdk from 'stellar-sdk';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const monitorEthereum = async (address, expectedAmount, onTxDetected, signal) => {
    try {
        const provider = new ethers.JsonRpcProvider('https://cloudflare-eth.com'); // Public RPC
        const expectedWei = ethers.parseEther(expectedAmount.toString());

        provider.on('block', async (blockNumber) => {
            if (signal?.aborted) return;
            try {
                const block = await provider.getBlock(blockNumber, true);
                for (const tx of block.prefetchedTransactions) {
                    if (tx.to?.toLowerCase() === address.toLowerCase()) {
                        if (tx.value >= expectedWei) {
                            onTxDetected({
                                detected: true,
                                txDetails: {
                                    hash: tx.hash,
                                    network: 'Ethereum',
                                    amount: ethers.formatEther(tx.value),
                                    currency: 'ETH'
                                }
                            });
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error('Error processing block ETH:', err);
            }
        });
    } catch (err) {
        console.error('Error monitoring Ethereum:', err);
    }
};

const monitorStarknet = async (address, expectedAmount, onTxDetected, signal) => {
    try {
        const provider = new StarknetProvider({ nodeUrl: 'https://starknet-mainnet.public.blastapi.io' }); // Public RPC
        
        // Polling loop since Starknet provider doesn't have a simple block event listener
        while (!signal?.aborted) {
            try {
                // In a real app we would check transfer events for the STRK token address
                // and the destination address. This is a simplified polling simulation.
                const block = await provider.getBlockWithTxs('latest');
                
                // Note: accurate scanning requires parsing events on the ERC20 contract.
                // For demonstration, simulating logic:
                for (const tx of block.transactions) {
                    // Check if tx is a transfer to the target address (simplified)
                    // Starknet txs require more complex parsing of calldata/events
                    if (JSON.stringify(tx).includes(address)) {
                         onTxDetected({
                             detected: true,
                             txDetails: {
                                 hash: tx.transaction_hash,
                                 network: 'Starknet',
                                 amount: expectedAmount.toString(),
                                 currency: 'STRK'
                             }
                         });
                         return;
                    }
                }
            } catch (err) {
                console.error('Error processing block STRK:', err);
            }
            await delay(10000); // 10s polling
        }
    } catch (err) {
         console.error('Error monitoring Starknet:', err);
    }
};

const monitorStellar = async (address, expectedAmount, onTxDetected, signal) => {
    try {
        const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
        
        server.payments()
            .forAccount(address)
            .cursor('now')
            .stream({
                onmessage: (payment) => {
                    if (signal?.aborted) return;
                    
                    if (payment.type === 'payment' && payment.asset_type === 'native') {
                        if (parseFloat(payment.amount) >= parseFloat(expectedAmount)) {
                            onTxDetected({
                                detected: true,
                                txDetails: {
                                    hash: payment.transaction_hash,
                                    network: 'Stellar',
                                    amount: payment.amount,
                                    currency: 'XLM'
                                }
                            });
                        }
                    }
                },
                onerror: (err) => {
                    console.error('Stellar stream error:', err);
                }
            });
    } catch (err) {
        console.error('Error monitoring Stellar:', err);
    }
};

export const blockchainMonitor = {
    startMonitoring: (network, address, expectedAmount, onTxDetected, signal) => {
        if (!address || !expectedAmount) return;

        switch (network) {
            case 'ETH':
                monitorEthereum(address, expectedAmount, onTxDetected, signal);
                break;
            case 'STRK':
                monitorStarknet(address, expectedAmount, onTxDetected, signal);
                break;
            case 'XLM':
                monitorStellar(address, expectedAmount, onTxDetected, signal);
                break;
            default:
                console.error('Unsupported network for monitoring');
        }
    }
};
