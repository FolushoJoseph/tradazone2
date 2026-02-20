import { createContext, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
        avatar: null,
        isAuthenticated: true
    });

    const [wallet, setWallet] = useState({
        address: '',
        balance: '0',
        currency: 'STRK',
        isConnected: false,
        chainId: ''
    });

    const login = (email, password) => {
        // Mock login
        setUser(prev => ({ ...prev, isAuthenticated: true, email }));
        return true;
    };

    const logout = () => {
        setUser(prev => ({ ...prev, isAuthenticated: false }));
    };

    const connectWallet = async () => {
        try {
            const { connect } = await import('get-starknet');
            // Connect to Argent X or Braavos
            const starknet = await connect();

            if (!starknet) {
                throw new Error("User rejected wallet selection or silent connect found nothing");
            }

            // Enable the wallet
            await starknet.enable({ showModal: true });

            if (starknet.isConnected) {
                const addr = starknet.selectedAddress;
                setWallet(prev => ({
                    ...prev,
                    address: addr,
                    isConnected: true,
                    chainId: starknet.chainId
                }));

                // Also authenticate the user via wallet
                setUser(prev => ({
                    ...prev,
                    isAuthenticated: true,
                    name: starknet.name || `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                    walletAddress: addr,
                }));

                // Listen for account changes
                starknet.on('accountsChanged', (accounts) => {
                    if (accounts.length === 0) {
                        disconnectWallet();
                    } else {
                        setWallet(prev => ({
                            ...prev,
                            address: accounts[0],
                            isConnected: true
                        }));
                    }
                });

                return true;
            }
            return false;
        } catch (error) {
            console.error("Failed to connect wallet:", error);
            // Mock wallet connect for development
            const mockAddr = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
            setWallet(prev => ({
                ...prev,
                address: mockAddr,
                isConnected: true,
                chainId: 'SN_MAIN'
            }));
            setUser(prev => ({
                ...prev,
                isAuthenticated: true,
                name: 'Wallet User',
                walletAddress: mockAddr,
            }));
            return true;
        }
    };

    const disconnectWallet = async () => {
        try {
            const { disconnect } = await import('get-starknet');
            await disconnect();
            setWallet({
                address: '',
                balance: '0',
                currency: 'STRK',
                isConnected: false,
                chainId: ''
            });
        } catch (error) {
            console.error("Failed to disconnect wallet:", error);
        }
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
            disconnectWallet
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
