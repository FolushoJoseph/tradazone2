/**
 * @fileoverview ConnectWalletModal — multi-network wallet connection modal.
 *
 * Supports the following wallet providers:
 *  - LOBSTR  (Stellar / XLM)
 *  - Argent  (Starknet / STRK)
 *  - MetaMask (EVM)
 *  - Phantom  (Solana / EVM)
 *  - Base Account / Coinbase Wallet (EVM)
 *  - Generic Starknet wallets (Braavos, etc.)
 *  - Generic EVM / browser-injected wallets
 *
 * Wallet discovery relies on EIP-6963 (`useDiscoveredProviders`) for EVM
 * providers, and on direct `window` object sniffing for Stellar/Starknet.
 *
 * @module ConnectWalletModal
 */

import { useState, useEffect } from 'react';
import { X, ExternalLink, AlertCircle, ChevronLeft } from 'lucide-react';
import Logo from './Logo';
import { useLobstr } from '../../hooks/useLobstr';
import { useAuth } from '../../context/AuthContext';

// ---------------------------------------------------------------------------
// Type definitions (JSDoc interfaces)
// ---------------------------------------------------------------------------

/**
 * @typedef {'stellar' | 'starknet' | 'evm' | 'starknet_generic'} WalletType
 */

/**
 * @typedef {'not_installed' | 'failed' | 'already_connecting'} WalletErrorCode
 */

/**
 * @typedef {Object} ConnectWalletResult
 */

/**
 * @typedef {Object} WalletErrorState
 */

// ---------------------------------------------------------------------------
// Internal icon components
// ---------------------------------------------------------------------------

function StellarIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.4 9.6H22.4L16 14.1L18.4 21.7L12 17.2L5.6 21.7L8 14.1L1.6 9.6H9.6L12 2Z" fill="#3B82F6" />
        </svg>
    );
}

function ArgentIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
            <path d="M10 2L4 18h4.5L10 13l1.5 5H16L10 2z" fill="#FF875B" />
        </svg>
    );
}

function WalletIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
    );
}

function MetaMaskIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <path d="M29.5 5.5L20.5 13L24 19L29.5 24L31 16L29.5 5.5Z" fill="#E2761B"/>
            <path d="M2.5 5.5L11.5 13L8 19L2.5 24L1 16L2.5 5.5Z" fill="#E2761B"/>
            <path d="M24 19L20.5 13L16 2L11.5 13L8 19L16 22.5L24 19Z" fill="#E4761B"/>
            <path d="M24 19L16 22.5L16 30L21.5 28.5L29.5 24L24 19Z" fill="#D7C1B3"/>
            <path d="M8 19L16 22.5L16 30L10.5 28.5L2.5 24L8 19Z" fill="#D7C1B3"/>
            <path d="M16 22.5L21.5 28.5L16 30L10.5 28.5L16 22.5Z" fill="#F6851B"/>
        </svg>
    );
}

function PhantomIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <path d="M16 4C9.37 4 4 9.37 4 16C4 22.63 9.37 28 16 28C22.63 28 28 22.63 28 16C28 9.37 22.63 4 16 4ZM19.5 16C18.12 16 17 14.88 17 13.5C17 12.12 18.12 11 19.5 11C20.88 11 22 12.12 22 13.5C22 14.88 20.88 16 19.5 16ZM12.5 16C11.12 16 10 14.88 10 13.5C10 12.12 11.12 11 12.5 11C13.88 11 15 12.12 15 13.5C15 14.88 13.88 16 12.5 16Z" fill="#AB9FF2"/>
        </svg>
    );
}

function BaseIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="12" fill="#0052FF" />
            <path d="M21 16C21 18.7614 18.7614 21 16 21C13.2386 21 11 18.7614 11 16C11 13.2386 13.2386 11 16 11H25V16H21Z" fill="#FFFFFF" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// ConnectWalletModal component
// ---------------------------------------------------------------------------

function ConnectWalletModal({ isOpen, onClose, onConnect, connectWalletFn }) {
    /**
     * Tracks which wallet type is currently mid-connection.
     */
    const [connecting, setConnecting] = useState(null);

    /**
     * Stores the most recent connection error.
     */
    const [error, setError] = useState(null);

    /**
     * Controls which network filter is active.
     */
    const [filterNetwork, setFilterNetwork] = useState('all');

    /**
     * Search query for filtering wallets by name.
     */
    const [searchQuery, setSearchQuery] = useState('');

    /**
     * Controls primary vs secondary view.
     */
    const [view, setView] = useState('primary');

    const {
        completeWalletLogin,
        isConnecting: isAuthConnecting,
        wallet,
        disconnectAll,
        installed,
        availableWallets
    } = useAuth();

    const lobstrHook = useLobstr();

    // Reset transient state each time the modal is opened
    useEffect(() => {
        if (isOpen) {
            setConnecting(null);
            setError(null);
            setView('primary');
            setSearchQuery('');
            setFilterNetwork('all');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    /**
     * Filter and Sort logic
     */
    const filteredAndSortedWallets = availableWallets
        .filter(w => {
            // Search filter
            if (searchQuery && !w.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            // Network filter
            if (filterNetwork !== 'all' && w.network !== filterNetwork) return false;
            // View filter (Primary vs Secondary)
            if (view === 'primary' && w.isSecondary && !searchQuery && filterNetwork === 'all') return false;
            if (view === 'secondary' && !w.isSecondary && !searchQuery && filterNetwork === 'all') return false;
            return true;
        })
        .sort((a, b) => {
            // 1. Sort by installation status (Installed first)
            if (a.isInstalled && !b.isInstalled) return -1;
            if (!a.isInstalled && b.isInstalled) return 1;
            // 2. Sort recommended first
            if (a.isRecommended && !b.isRecommended) return -1;
            if (!a.isRecommended && b.isRecommended) return 1;
            return 0;
        });

    /**
     * Maps wallet ID to the correct icon component.
     */
    const getWalletIcon = (w) => {
        if (w.iconUri) return <img src={w.iconUri} alt={w.name} className="w-6 h-6" />;
        switch (w.id) {
            case 'stellar': return <StellarIcon size={22} />;
            case 'starknet': return <ArgentIcon size={20} />;
            case 'metamask': return <MetaMaskIcon size={24} />;
            case 'phantom': return <PhantomIcon size={24} />;
            case 'base': return <BaseIcon size={24} />;
            default: return <WalletIcon size={20} />;
        }
    };

    /**
     * Initiates a wallet connection.
     */
    const handleConnect = async (w) => {
        if (connecting) return;
        
        // Special case for LOBSTR as it uses a separate hook
        if (w.id === 'stellar') {
            const result = await lobstrHook.connect();
            if (result?.success) {
                completeWalletLogin(result.address, 'stellar');
                if (onConnect) onConnect('stellar');
            } else if (result?.error) {
                setError({
                    type: 'stellar',
                    code: result.error === 'NOT_INSTALLED' ? 'not_installed' : 'failed',
                    message: result.error,
                });
            }
            return;
        }

        const type = w.id === 'starknet_generic' ? 'starknet_generic' : w.network;
        const provider = w.rdns ? installed.discovered.find(p => p.info.rdns === w.rdns)?.provider : (w.provider || null);

        setConnecting(w.id);
        setError(null);
        try {
            const result = await connectWalletFn(type, provider);
            if (result.success) {
                if (onConnect) onConnect(type);
            } else if (result.error === 'not_installed') {
                setError({ type: w.network, code: 'not_installed' });
                setConnecting(null);
            } else if (result.error === 'already_connecting') {
                // leave spinner visible
            } else {
                setError({ type: w.network, code: 'failed' });
                setConnecting(null);
            }
        } catch {
            setError({ type: w.network, code: 'failed' });
            setConnecting(null);
        }
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity"
                onClick={() => !connecting && onClose()}
            />

            <div className="
                fixed z-40
                bottom-0 left-0 right-0
                lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md
                bg-white shadow-2xl rounded-t-2xl lg:rounded-2xl flex flex-col max-h-[90vh] overflow-hidden
                animate-slide-up lg:animate-none lg:zoom-in
            ">
                <div className="lg:hidden w-10 h-1 bg-border rounded-full mx-auto my-3" />

                <div className="flex-1 overflow-y-auto w-full">
                    <div className="px-6 pt-2 pb-4 flex justify-between items-center relative border-b border-border/50">
                        {view === 'primary' ? (
                            <div className="flex items-center gap-3">
                                <Logo variant="light" className="h-6" />
                            </div>
                        ) : (
                            <button
                                onClick={() => setView('primary')}
                                className="flex items-center gap-1.5 text-sm font-semibold text-t-primary hover:text-brand transition-colors"
                            >
                                <ChevronLeft size={18} />
                                Back
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            disabled={connecting !== null}
                            className="text-t-muted hover:text-t-primary transition-colors disabled:opacity-50"
                            aria-label="Close modal"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6">
                        <h2 className="text-xl font-bold text-t-primary mb-2">Connect your wallet</h2>
                        <p className="text-sm text-t-muted mb-6">
                            Choose how you'd like to connect to Tradazone.
                        </p>

                        <div className="mb-6 space-y-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search wallets..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-border rounded-xl text-sm focus:ring-2 focus:ring-brand/20 focus:border-brand outline-none transition-all"
                                />
                                <div className="absolute left-3 top-2.5 text-t-muted">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="11" cy="11" r="8" />
                                        <path d="m21 21-4.3-4.3" />
                                    </svg>
                                </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {['all', 'stellar', 'starknet', 'evm'].map((net) => (
                                    <button
                                        key={net}
                                        onClick={() => setFilterNetwork(net)}
                                        className={`px-3 py-1 rounded-full text-xs font-semibold capitalize transition-all
                                            ${filterNetwork === net
                                                ? 'bg-brand text-white shadow-md shadow-brand/20'
                                                : 'bg-gray-100 text-t-muted hover:bg-gray-200'}`}
                                    >
                                        {net}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            {filteredAndSortedWallets.map((w) => (
                                <button
                                    key={w.id}
                                    onClick={() => handleConnect(w)}
                                    disabled={connecting !== null || (w.id === 'stellar' && lobstrHook.isConnecting)}
                                    className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all outline-none
                                        ${connecting === w.id || (w.id === 'stellar' && lobstrHook.isConnecting) ? 'border-brand/40 bg-brand/5' : connecting !== null ? 'border-border/50 opacity-50' : 'border-border hover:border-brand/30 hover:bg-brand/5'}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0
                                            ${w.network === 'stellar' ? 'bg-blue-50' : w.network === 'starknet' ? 'bg-[#FF875B]/10' : 'bg-gray-100'}`}>
                                            {getWalletIcon(w)}
                                        </div>
                                        <div>
                                            <div className="font-semibold text-t-primary flex items-center gap-2">
                                                {w.name}
                                                {w.isRecommended && (
                                                    <span className="text-[10px] uppercase font-bold tracking-wide bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                        Recommended
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-t-muted">{w.networkName}</div>
                                        </div>
                                    </div>
                                    {connecting === w.id || (w.id === 'stellar' && lobstrHook.isConnecting) ? (
                                        <span className="w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                                    ) : (w.isInstalled || w.rdns) && (
                                        <span className="text-[10px] uppercase font-bold tracking-wide text-green-600 bg-green-50 px-2 py-1 rounded-md">Installed</span>
                                    )}
                                </button>
                            ))}

                            {filteredAndSortedWallets.length === 0 && (
                                <div className="text-center py-8 text-t-muted text-sm italic">
                                    No wallets found matching your search.
                                </div>
                            )}

                            {view === 'primary' && !searchQuery && filterNetwork === 'all' && (
                                <button
                                    onClick={() => setView('secondary')}
                                    disabled={connecting !== null}
                                    className="w-full mt-2 text-center text-sm font-semibold text-t-secondary hover:text-brand transition-colors p-3 rounded-lg border border-transparent hover:border-border hover:bg-gray-50 disabled:opacity-50"
                                >
                                    View more options
                                </button>
                            )}
                        </div>

                        {error?.code === 'not_installed' && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-sm text-red-800 animate-fade-in">
                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
                                <div>
                                    <p className="font-medium">
                                        {error.type === 'stellar'  ? 'LOBSTR is not installed.'       :
                                         error.type === 'starknet' ? 'Argent is not installed.'        :
                                         error.type === 'evm'      ? 'EVM wallet not detected in browser.' :
                                         'Wallet is not installed.'}
                                    </p>
                                    {(error.type === 'stellar' || error.type === 'starknet') && (
                                        <a
                                            href={error.type === 'stellar' ? 'https://lobstr.co/' : 'https://www.argent.xyz/argent-x/'}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 font-semibold underline mt-1"
                                        >
                                            Install extension <ExternalLink size={12} />
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}

                        {error?.code === 'failed' && (
                            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-2 text-sm text-red-800 animate-fade-in">
                                <AlertCircle size={16} className="flex-shrink-0 mt-0.5 text-red-500" />
                                <div>
                                    <p className="font-medium">
                                        {error.message === 'LOCKED'       ? 'LOBSTR is locked'  :
                                         error.message === 'ACCESS_DENIED' ? 'Access denied'     :
                                         'Connection failed'}
                                    </p>
                                    <div className="text-xs mt-1 opacity-80">
                                        {error.message === 'LOCKED' ? (
                                            <span>Open the extension and enter your password.</span>
                                        ) : error.message === 'ACCESS_DENIED' ? (
                                            <span>Open LOBSTR and allow this site to connect.</span>
                                        ) : (
                                            error.message || 'The connection was cancelled or failed. Please try again.'
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {wallet.isConnected && (
                            <button
                                onClick={async () => {
                                    await disconnectAll();
                                    onClose();
                                }}
                                disabled={connecting !== null}
                                className="mt-5 w-full text-center text-sm font-semibold text-red-500 hover:text-red-700 transition-colors p-3 rounded-lg border border-transparent hover:border-red-100 hover:bg-red-50 disabled:opacity-50"
                            >
                                Disconnect all wallets
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default ConnectWalletModal;