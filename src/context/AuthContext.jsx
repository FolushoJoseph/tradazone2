import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

const SESSION_KEY = 'tradazone_auth';
const WALLET_KEY = 'tradazone_last_wallet';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function loadSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (Date.now() > parsed.expiresAt) {
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
        return parsed.user;
    } catch {
        return null;
    }
}

function saveSession(userData) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        user: userData,
        expiresAt: Date.now() + SESSION_TTL_MS,
    }));
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

const EMPTY_USER = {
    id: null,
    name: '',
    email: '',
    avatar: null,
    isAuthenticated: false,
    walletAddress: null,
    walletType: null, // 'starknet' | 'stellar'
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const saved = loadSession();
        return saved ?? { ...EMPTY_USER };
    });

    const [isConnecting, setIsConnecting] = useState(false);

    const [wallet, setWallet] = useState({
        address: user.walletAddress || '',
        balance: '0',
        currency: user.walletType === 'stellar' ? 'XLM' : 'STRK',
        isConnected: !!user.walletAddress,
        chainId: user.walletType === 'stellar' ? 'stellar' : '',
    });

    // Derived: which wallet type is currently connected
    const [walletType, setWalletType] = useState(user.walletType || null);

    const completeWalletLogin = (address, type) => {
        const currency = type === 'stellar' ? 'XLM' : 'STRK';
        const chainId = type === 'stellar' ? 'stellar' : '';
        
        const walletState = { address, isConnected: true, chainId, balance: '0', currency };
        setWallet(walletState);
        setWalletType(type);
        localStorage.setItem(WALLET_KEY, address);

        const userData = {
            id: address,
            name: `${address.slice(0, 6)}...${address.slice(-4)}`,
            email: '',
            avatar: null,
            isAuthenticated: true,
            walletAddress: address,
            walletType: type,
        };
        setUser(userData);
        saveSession(userData);
    };

    // Returns last connected wallet address (for "welcome back" hint)
    const lastWallet = localStorage.getItem(WALLET_KEY);

    const login = (userData) => {
        const authed = { ...userData, isAuthenticated: true };
        setUser(authed);
        saveSession(authed);
    };

    const logout = () => {
        clearSession();
        setUser({ ...EMPTY_USER });
        setWallet({ address: '', balance: '0', currency: 'STRK', isConnected: false, chainId: '' });
        setWalletType(null);
    };

    // ── Starknet (Argent) ────────────────────────────────────────────────────
    const connectStarknetWallet = async () => {
        try {
            const { connect } = await import('get-starknet');
            const starknet = await connect();

            if (!starknet) throw new Error('No wallet selected');
            
            // For v3 of get-starknet we just use the connect() method which returns the selected connection
            const isPreauthorized = await starknet.isPreauthorized();
            if (!isPreauthorized) {
                await starknet.enable({ starknetVersion: "v4" }).catch(() => {
                     // try v3 as fallback
                     return starknet.enable();
                });
            }

            if (starknet.isConnected) {
                const addr = starknet.selectedAddress;

                const walletState = { address: addr, isConnected: true, chainId: starknet.chainId, balance: '0', currency: 'STRK' };
                setWallet(walletState);
                setWalletType('starknet');
                localStorage.setItem(WALLET_KEY, addr);

                const userData = {
                    id: addr,
                    name: starknet.name || `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                    email: '',
                    avatar: null,
                    isAuthenticated: true,
                    walletAddress: addr,
                    walletType: 'starknet',
                };
                setUser(userData);
                saveSession(userData);

                starknet.on('accountsChanged', (accounts) => {
                    if (accounts.length === 0) {
                        logout();
                    } else {
                        setWallet(prev => ({ ...prev, address: accounts[0] }));
                    }
                });

                return { success: true };
            }
            return { success: false, error: 'Wallet not connected' };
        } catch (error) {
            console.error('Starknet wallet connect failed:', error);

            if (error.message?.includes('No wallet') || error.message?.includes('rejected')) {
                return { success: false, error: 'not_installed' };
            }

            // Dev / demo fallback
            const mockAddr = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
            const walletState = { address: mockAddr, isConnected: true, chainId: 'SN_MAIN', balance: '0', currency: 'STRK' };
            setWallet(walletState);
            setWalletType('starknet');
            localStorage.setItem(WALLET_KEY, mockAddr);

            const userData = {
                id: mockAddr,
                name: 'Wallet User',
                email: '',
                avatar: null,
                isAuthenticated: true,
                walletAddress: mockAddr,
                walletType: 'starknet',
            };
            setUser(userData);
            saveSession(userData);
            return { success: true };
        }
    };

    // ── Stellar (Freighter) ──────────────────────────────────────────────────
    const connectStellarWallet = async () => {
        try {
            const freighter = await import('@stellar/freighter-api');

            // Check if Freighter is installed
            const connected = await freighter.isConnected();
            if (!connected) {
                throw new Error('Freighter not installed');
            }

            // Request access (prompts the user)
            const accessResult = await freighter.requestAccess();
            if (accessResult.error) {
                throw new Error(accessResult.error);
            }

            const pkResult = await freighter.getPublicKey();
            
            // Freighter API can return an object with { publicKey } or just { error }
            // or in some versions the result directly.
            let addr = '';
            if (typeof pkResult === 'string' && pkResult.startsWith('G')) {
                addr = pkResult;
            } else if (pkResult && pkResult.publicKey) {
                addr = pkResult.publicKey;
            } else if (pkResult && pkResult.error) {
                throw new Error(pkResult.error);
            } else {
                // If getPublicKey failed or returned nothing, try requestAccess as fallback/second-attempt
                const accessResult = await freighter.requestAccess();
                if (typeof accessResult === 'string' && accessResult.startsWith('G')) {
                    addr = accessResult;
                } else if (accessResult && Array.isArray(accessResult) && accessResult.length > 0) {
                    addr = accessResult[0];
                } else if (accessResult && accessResult.address) {
                    addr = accessResult.address;
                } else if (accessResult && accessResult.error) {
                    throw new Error(accessResult.error);
                } else {
                    throw new Error('Could not retrieve public key from Freighter');
                }
            }

            const walletState = { address: addr, isConnected: true, chainId: 'stellar', balance: '0', currency: 'XLM' };
            setWallet(walletState);
            setWalletType('stellar');
            localStorage.setItem(WALLET_KEY, addr);

            const userData = {
                id: addr,
                name: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                email: '',
                avatar: null,
                isAuthenticated: true,
                walletAddress: addr,
                walletType: 'stellar',
            };
            setUser(userData);
            saveSession(userData);

            return { success: true };
        } catch (error) {
            console.error('Stellar wallet connect failed:', error);

            if (error.message?.includes('not installed') || error.message?.includes('Freighter')) {
                return { success: false, error: 'not_installed' };
            }

            if (error.message?.includes('User declined') || 
                error.message?.includes('rejected') || 
                error.message?.includes('cancelled')) {
                return { success: false, error: 'rejected' };
            }

            // Return the specific error message if possible to help debugging
            return { success: false, error: 'failed', message: error.message };
        }
    };

    // ── EVM / Browser Wallets (MetaMask, Trust, etc.) ────────────────────────
    const connectEvmWallet = async (specificProvider = null) => {
        if (isConnecting) return { success: false, error: 'already_connecting' };
        
        setIsConnecting(true);
        try {
            const injectedProvider = specificProvider || window.ethereum;
            
            if (!injectedProvider) {
                throw new Error('EVM Wallet not installed');
            }

            const { BrowserProvider } = await import('ethers');
            const provider = new BrowserProvider(injectedProvider);

            // Request Accounts
            const accounts = await provider.send('eth_requestAccounts', []);
            if (!accounts || accounts.length === 0) {
                throw new Error('No accounts returned');
            }

            const addr = accounts[0];
            const network = await provider.getNetwork();

            const walletState = { 
                address: addr, 
                isConnected: true, 
                chainId: network.chainId.toString(), 
                balance: '0', 
                currency: 'ETH' 
            };
            setWallet(walletState);
            setWalletType('evm');
            localStorage.setItem(WALLET_KEY, addr);

            const userData = {
                id: addr,
                name: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                email: '',
                avatar: null,
                isAuthenticated: true,
                walletAddress: addr,
                walletType: 'evm',
            };
            setUser(userData);
            saveSession(userData);

            // Listen for account changes
            if (injectedProvider.on) {
                injectedProvider.on('accountsChanged', (newAccounts) => {
                    if (newAccounts.length === 0) {
                        logout();
                    } else {
                        setWallet(prev => ({ ...prev, address: newAccounts[0] }));
                    }
                });
            }

            setIsConnecting(false);
            return { success: true };
        } catch (error) {
            console.error('EVM wallet connect failed:', error);

            if (error.message?.includes('not installed') || error.message?.includes('EVM')) {
                return { success: false, error: 'not_installed' };
            }

            if (error.code === 4001 || error.message?.includes('rejected')) {
                return { success: false, error: 'rejected' };
            }

            setIsConnecting(false);
            return { success: false, error: 'failed' };
        }
    };

    // ── Public: connectWallet(type, provider) ──────────────────────────────────────────
    const connectWallet = async (type = 'starknet', provider = null) => {
        if (type === 'stellar') return connectStellarWallet();
        if (type === 'evm') return connectEvmWallet(provider);
        if (type === 'starknet_generic') {
            return connectStarknetWallet();
        }
        return connectStarknetWallet();
    };

    const disconnectWallet = async () => {
        if (walletType === 'starknet') {
            try {
                const { disconnect } = await import('get-starknet');
                await disconnect();
            } catch (_) { /* swallow */ }
        }
        // Freighter has no programmatic disconnect API
        logout();
    };

    return (
        <AuthContext.Provider value={{
            user,
            setUser,
            wallet,
            setWallet,
            walletType,
            login,
            logout,
            connectWallet,
            disconnectWallet,
            completeWalletLogin,
            lastWallet,
            isConnecting,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within an AuthProvider');
    return context;
}
