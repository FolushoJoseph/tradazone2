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
};

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const saved = loadSession();
        return saved ?? { ...EMPTY_USER };
    });

    const [wallet, setWallet] = useState({
        address: user.walletAddress || '',
        balance: '0',
        currency: 'STRK',
        isConnected: !!user.walletAddress,
        chainId: '',
    });

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
    };

    const connectWallet = async () => {
        try {
            const { connect } = await import('get-starknet');
            const starknet = await connect();

            if (!starknet) throw new Error('No wallet selected');

            await starknet.enable({ showModal: true });

            if (starknet.isConnected) {
                const addr = starknet.selectedAddress;

                const walletState = { address: addr, isConnected: true, chainId: starknet.chainId, balance: '0', currency: 'STRK' };
                setWallet(walletState);
                localStorage.setItem(WALLET_KEY, addr);

                const userData = {
                    id: addr,
                    name: starknet.name || `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                    email: '',
                    avatar: null,
                    isAuthenticated: true,
                    walletAddress: addr,
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
            console.error('Wallet connect failed:', error);

            // Check if Argent is installed
            if (error.message?.includes('No wallet') || error.message?.includes('rejected')) {
                return { success: false, error: 'not_installed' };
            }

            // Dev / demo fallback
            const mockAddr = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
            const walletState = { address: mockAddr, isConnected: true, chainId: 'SN_MAIN', balance: '0', currency: 'STRK' };
            setWallet(walletState);
            localStorage.setItem(WALLET_KEY, mockAddr);

            const userData = {
                id: mockAddr,
                name: 'Wallet User',
                email: '',
                avatar: null,
                isAuthenticated: true,
                walletAddress: mockAddr,
            };
            setUser(userData);
            saveSession(userData);
            return { success: true };
        }
    };

    const disconnectWallet = async () => {
        try {
            const { disconnect } = await import('get-starknet');
            await disconnect();
        } catch (_) { /* swallow */ }
        logout();
    };

    return (
        <AuthContext.Provider value={{
            user,
            setUser,
            wallet,
            setWallet,
            login,
            logout,
            connectWallet,
            disconnectWallet,
            lastWallet,
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
