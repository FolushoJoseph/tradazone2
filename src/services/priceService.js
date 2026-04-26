const CACHE = new Map();
const CACHE_TTL = 60_000; // 60 seconds — matches CoinGecko free-tier guidance

const COIN_IDS = {
    ETH: 'ethereum',
    STRK: 'starknet',
    XLM: 'stellar',
    USDC: 'usd-coin',
    BTC: 'bitcoin',
};

const SUPPORTED_SYMBOLS = Object.keys(COIN_IDS);

export function isSupportedCrypto(symbol) {
    return SUPPORTED_SYMBOLS.includes(symbol?.toUpperCase());
}

// Returns the fiat price of 1 unit of cryptoSymbol, or null on failure
export async function getPrice(cryptoSymbol, fiatCurrency = 'usd') {
    const coinId = COIN_IDS[cryptoSymbol?.toUpperCase()];
    if (!coinId) return null;

    const fiat = fiatCurrency.toLowerCase();
    const cacheKey = `${coinId}:${fiat}`;
    const cached = CACHE.get(cacheKey);

    if (cached && Date.now() - cached.ts < CACHE_TTL) {
        return cached.price;
    }

    try {
        const res = await fetch(
            `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=${fiat}`,
            { headers: { Accept: 'application/json' } }
        );

        if (res.status === 429) {
            // Rate-limited — serve stale cache if available
            return cached?.price ?? null;
        }

        const data = await res.json();
        const price = data[coinId]?.[fiat] ?? null;

        if (price !== null) {
            CACHE.set(cacheKey, { price, ts: Date.now() });
        }

        return price;
    } catch {
        return cached?.price ?? null;
    }
}

// Returns how many units of cryptoSymbol equal fiatAmount in fiatCurrency
export async function convertFiatToCrypto(fiatAmount, fiatCurrency, cryptoSymbol) {
    const price = await getPrice(cryptoSymbol, fiatCurrency);
    if (!price) return null;
    const units = parseFloat(fiatAmount) / price;
    return isFinite(units) ? units.toFixed(6) : null;
}

// Returns the fiat value of cryptoAmount units
export async function convertCryptoToFiat(cryptoAmount, cryptoSymbol, fiatCurrency = 'usd') {
    const price = await getPrice(cryptoSymbol, fiatCurrency);
    if (!price) return null;
    const value = parseFloat(cryptoAmount) * price;
    return isFinite(value) ? value.toFixed(2) : null;
}

// Returns the age in seconds of the cached price, or null if not cached
export function getCacheAge(cryptoSymbol, fiatCurrency = 'usd') {
    const coinId = COIN_IDS[cryptoSymbol?.toUpperCase()];
    if (!coinId) return null;
    const cached = CACHE.get(`${coinId}:${fiatCurrency.toLowerCase()}`);
    if (!cached) return null;
    return Math.floor((Date.now() - cached.ts) / 1000);
}
