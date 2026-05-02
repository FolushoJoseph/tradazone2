const CACHE_TTL = 60 * 1000; // 60 seconds
let priceCache = {};
let cacheTimestamp = 0;

export const priceService = {
    getRates: async () => {
        const now = Date.now();
        if (now - cacheTimestamp < CACHE_TTL && Object.keys(priceCache).length > 0) {
            return priceCache;
        }

        try {
            // Fetch prices for Ethereum, Starknet, and Stellar against USD
            const response = await fetch(
                'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,starknet,stellar&vs_currencies=usd'
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch prices');
            }

            const data = await response.json();
            
            priceCache = {
                ETH: data.ethereum?.usd || 0,
                STRK: data.starknet?.usd || 0,
                XLM: data.stellar?.usd || 0,
            };
            cacheTimestamp = now;

            return priceCache;
        } catch (error) {
            console.error('Error fetching crypto prices:', error);
            // Return cached values if available even if expired, as fallback
            if (Object.keys(priceCache).length > 0) {
                return priceCache;
            }
            // Defaults in worst case scenario
            return { ETH: 3000, STRK: 1.5, XLM: 0.1 }; 
        }
    },

    convertFiatToCrypto: async (amountUSD, cryptoSymbol) => {
        const rates = await priceService.getRates();
        const rate = rates[cryptoSymbol];
        if (!rate) return 0;
        
        return parseFloat((amountUSD / rate).toFixed(6));
    }
};
