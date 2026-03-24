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
import { useDiscoveredProviders } from '../../utils/wallet-discovery';
import { useLobstr } from '../../hooks/useLobstr';
import { useAuth } from '../../context/AuthContext';

// ---------------------------------------------------------------------------
// Type definitions (JSDoc interfaces)
// ---------------------------------------------------------------------------

/**
 * @typedef {'stellar' | 'starknet' | 'evm' | 'starknet_generic'} WalletType
 * Identifies which network / protocol the wallet uses.
 *
 * | Value             | Network     | Example wallets          |
 * |-------------------|-------------|--------------------------|
 * | `'stellar'`       | Stellar     | LOBSTR                   |
 * | `'starknet'`      | Starknet    | Argent X                 |
 * | `'evm'`           | EVM         | MetaMask, Phantom, Base  |
 * | `'starknet_generic'` | Starknet | Braavos, any injected    |
 */

/**
 * @typedef {'not_installed' | 'failed' | 'already_connecting'} WalletErrorCode
 * Standardised error codes surfaced from `connectWalletFn`.
 *
 * | Code               | Meaning                                                  |
 * |--------------------|----------------------------------------------------------|
 * | `'not_installed'`  | Extension / app is not present in the browser            |
 * | `'failed'`         | Connection attempt rejected or errored out               |
 * | `'already_connecting'` | A connection attempt is already in flight           |
 */

/**
 * @typedef {Object} ConnectWalletResult
 * Shape returned by `connectWalletFn`.
 *
 * @property {true}  [success]  - Present and `true` when the wallet connected successfully.
 * @property {WalletErrorCode} [error] - Present when the connection did not succeed.
 *   - `'not_installed'`      — wallet extension / app absent from browser
 *   - `'already_connecting'` — a prior attempt is still in progress
 *   - Any other string       — generic failure (user rejected, timeout, etc.)
 */

/**
 * @typedef {Object} LobstrConnectResult
 * Shape returned by `useLobstr().connect()`.
 * Mirrors the LOBSTR Signer Extension API response, normalised by `useLobstr`.
 *
 * @property {true}   [success]  - Set when the connection succeeded.
 * @property {string} [address]  - The Stellar public key (G-address) of the connected account.
 * @property {'PUBLIC' | 'TESTNET'} [network] - The Stellar network the wallet is on.
 * @property {string} [error]    - Error token on failure.
 *   Known values:
 *   - `'NOT_INSTALLED'`  — LOBSTR extension not detected
 *   - `'LOCKED'`         — Extension is installed but password-locked
 *   - `'ACCESS_DENIED'`  — User denied the connection request
 */

/**
 * @typedef {Object} WalletErrorState
 * Internal error state stored in `ConnectWalletModal`.
 *
 * @property {WalletType} type    - Which wallet provider triggered the error.
 * @property {WalletErrorCode} code - Normalised error code for rendering the
 *   correct error message and install-link.
 * @property {string} [message]  - Raw error token forwarded from the provider
 *   (e.g. `'LOCKED'`, `'ACCESS_DENIED'`). Used for fine-grained messaging.
 */

/**
 * @typedef {Object} InstalledWallets
 * Map of detected (installed) wallet providers in the current browser.
 * Built by `useWalletDetection` and updated asynchronously.
 *
 * @property {boolean}  lobstr    - LOBSTR Stellar extension is detected.
 * @property {boolean}  argent    - Argent X (Starknet) extension is detected.
 * @property {boolean}  metamask  - MetaMask extension is detected.
 * @property {boolean}  phantom   - Phantom wallet is detected.
 * @property {boolean}  base      - Coinbase / Base wallet is detected.
 * @property {Array<import('../../utils/wallet-discovery').EIP6963ProviderDetail>} discovered
 *   - Full list of EIP-6963 discovered providers, used to extract the
 *     matching `provider` object when initiating an EVM connection.
 */

/**
 * @typedef {Object} ConnectWalletModalProps
 * Props accepted by the `ConnectWalletModal` component.
 *
 * @property {boolean} isOpen
 *   Controls modal visibility. The component renders `null` when `false`.
 *
 * @property {() => void} onClose
 *   Called when the user dismisses the modal (backdrop click or ✕ button).
 *   Not called while a connection attempt is in flight (`connecting !== null`).
 *
 * @property {(walletType: WalletType) => void} [onConnect]
 *   Optional success callback. Invoked after a wallet connects successfully,
 *   receiving the `WalletType` string of the connected wallet.
 *
 * @property {(type: WalletType, provider?: unknown) => Promise<ConnectWalletResult>} connectWalletFn
 *   Async function that performs the actual wallet connection. Typically
 *   sourced from `useAuth().connectWallet`.
 *
 *   Parameters:
 *   - `type`     — `WalletType` indicating which protocol to use.
 *   - `provider` — Optional EIP-6963 provider object for EVM wallets.
 *     When `undefined`, the function should fall back to `window.ethereum`.
 *
 *   Returns a `ConnectWalletResult` promise.
 */

// ---------------------------------------------------------------------------
// Internal icon components
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} IconProps
 * @property {number} [size=20] - Width and height of the SVG in pixels.
 */

/**
 * Stellar star icon used for the LOBSTR wallet button.
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
function StellarIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.4 9.6H22.4L16 14.1L18.4 21.7L12 17.2L5.6 21.7L8 14.1L1.6 9.6H9.6L12 2Z" fill="#3B82F6" />
        </svg>
    );
}

/**
 * Argent X icon used for the Starknet wallet button.
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
function ArgentIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 20 20" fill="none">
            <path d="M10 2L4 18h4.5L10 13l1.5 5H16L10 2z" fill="#FF875B" />
        </svg>
    );
}

/**
 * Generic wallet icon used as a fallback for unknown / generic wallets.
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
function WalletIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
            <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
            <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
        </svg>
    );
}

/**
 * MetaMask fox icon used for the MetaMask wallet button.
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
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

/**
 * Phantom ghost icon used for the Phantom wallet button.
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
function PhantomIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <path d="M16 4C9.37 4 4 9.37 4 16C4 22.63 9.37 28 16 28C22.63 28 28 22.63 28 16C28 9.37 22.63 4 16 4ZM19.5 16C18.12 16 17 14.88 17 13.5C17 12.12 18.12 11 19.5 11C20.88 11 22 12.12 22 13.5C22 14.88 20.88 16 19.5 16ZM12.5 16C11.12 16 10 14.88 10 13.5C10 12.12 11.12 11 12.5 11C13.88 11 15 12.12 15 13.5C15 14.88 13.88 16 12.5 16Z" fill="#AB9FF2"/>
        </svg>
    );
}

/**
 * Base / Coinbase Wallet icon used for the Base Account wallet button.
 * @param {IconProps} props
 * @returns {JSX.Element}
 */
function BaseIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="12" fill="#0052FF" />
            <path d="M21 16C21 18.7614 18.7614 21 16 21C13.2386 21 11 18.7614 11 16C11 13.2386 13.2386 11 16 11H25V16H21Z" fill="#FFFFFF" />
        </svg>
    );
}

// ---------------------------------------------------------------------------
// useWalletDetection hook
// ---------------------------------------------------------------------------

/**
 * Detects which wallet extensions / apps are present in the current browser.
 *
 * Detection strategy:
 * - **EIP-6963** (`useDiscoveredProviders`): Standard discovery for EVM wallets.
 *   Provider objects are matched by their `rdns` identifier.
 * - **Window sniffing**: Used for Stellar (`window.lobstr`) and Starknet
 *   (`window.starknet_argentX` / `window.starknet?.argentX`) which do not
 *   participate in EIP-6963.
 * - **Legacy `window.ethereum` flags** (`isMetaMask`, `isPhantom`, etc.): Checked
 *   as a fallback for EVM wallets not yet using EIP-6963.
 *
 * Two follow-up checks are scheduled at 1 s and 2.5 s after mount because some
 * extensions (especially LOBSTR and Argent) inject their objects into `window`
 * after the initial render cycle.
 *
 * @returns {InstalledWallets} Snapshot of detected wallet providers.
 */
function useWalletDetection() {
    const discoveredProviders = useDiscoveredProviders();

    /** @type {[InstalledWallets, React.Dispatch<React.SetStateAction<InstalledWallets>>]} */
    const [installed, setInstalled] = useState({
        lobstr: false,
        argent: false,
        metamask: false,
        phantom: false,
        base: false,
        discovered: [],
    });

    useEffect(() => {
        const checkInstallations = () => {
            const eth = window.ethereum;

            const hasLobstr = typeof window !== 'undefined' && !!window.lobstr;
            const hasArgent = typeof window !== 'undefined' && !!(window.starknet_argentX || window.starknet?.argentX);

            const hasMetaMask = discoveredProviders.some(p => p.info.rdns === 'io.metamask') || !!(eth && eth.isMetaMask);
            const hasPhantom  = discoveredProviders.some(p => p.info.rdns === 'app.phantom')  || !!(window.phantom?.ethereum || (eth && eth.isPhantom));
            const hasBase     = discoveredProviders.some(p => p.info.rdns === 'com.coinbase.wallet') || !!window.coinbaseWalletExtension || !!(eth && eth.isCoinbaseWallet);

            setInstalled({
                lobstr: hasLobstr,
                argent: hasArgent,
                metamask: hasMetaMask,
                phantom: hasPhantom,
                base: hasBase,
                discovered: discoveredProviders,
            });
        };

        checkInstallations();

        // Some extensions (LOBSTR, Argent) inject into window after first render
        const timer  = setTimeout(checkInstallations, 1000);
        const timer2 = setTimeout(checkInstallations, 2500);

        return () => {
            clearTimeout(timer);
            clearTimeout(timer2);
        };
    }, [discoveredProviders]);

    return installed;
}

// ---------------------------------------------------------------------------
// ConnectWalletModal component
// ---------------------------------------------------------------------------

/**
 * ConnectWalletModal
 *
 * A bottom-sheet (mobile) / centred dialog (desktop) that lets the user
 * connect one of several supported wallets to Tradazone.
 *
 * ## Connection flows
 *
 * ### LOBSTR (Stellar)
 * Bypasses `connectWalletFn` and calls `useLobstr().connect()` directly,
 * then calls `completeWalletLogin(address, 'stellar')` from `useAuth` to
 * persist the session.
 *
 * Expected `LobstrConnectResult` on success:
 * ```json
 * { "success": true, "address": "GABC...XYZ", "network": "PUBLIC" }
 * ```
 *
 * Expected `LobstrConnectResult` on failure:
 * ```json
 * { "success": false, "error": "LOCKED" }
 * ```
 *
 * ### Argent / Starknet
 * Calls `connectWalletFn('starknet')`.
 * Expected `ConnectWalletResult` on success:
 * ```json
 * { "success": true }
 * ```
 *
 * ### MetaMask / Phantom / Base (EVM — named)
 * Extracts the matching EIP-6963 provider from `installed.discovered` and
 * calls `connectWalletFn('evm', provider)`.
 * Expected `ConnectWalletResult` on success:
 * ```json
 * { "success": true }
 * ```
 *
 * ### Generic Starknet wallets (Braavos, etc.)
 * Calls `connectWalletFn('starknet_generic')` with no provider.
 *
 * ### Generic EVM / browser wallets
 * Calls `connectWalletFn('evm')` with no provider, relying on the
 * implementation to fall back to `window.ethereum`.
 *
 * ## Error handling
 *
 * `connectWalletFn` must resolve (never reject) and return a
 * `ConnectWalletResult`. The component maps the `error` field:
 *
 * | `error` value          | UX behaviour                              |
 * |------------------------|-------------------------------------------|
 * | `'not_installed'`      | Shows install banner with extension link  |
 * | `'already_connecting'` | Silently ignored; spinner stays visible   |
 * | Anything else          | Shows generic "Connection failed" banner  |
 *
 * @param {ConnectWalletModalProps} props
 * @returns {JSX.Element | null} The modal element, or `null` when `isOpen` is `false`.
 */
function ConnectWalletModal({ isOpen, onClose, onConnect, connectWalletFn }) {
    /**
     * Tracks which wallet type is currently mid-connection.
     * `null` means no connection is in progress.
     * @type {[WalletType | null, React.Dispatch<React.SetStateAction<WalletType | null>>]}
     */
    const [connecting, setConnecting] = useState(null);

    /**
     * Stores the most recent connection error for display in the modal.
     * Reset to `null` on every new connection attempt and when the modal opens.
     * @type {[WalletErrorState | null, React.Dispatch<React.SetStateAction<WalletErrorState | null>>]}
     */
    const [error, setError] = useState(null);

    /**
     * Controls which wallet list is rendered.
     * - `'primary'`   — main wallets (LOBSTR, Argent, MetaMask, Phantom, Base)
     * - `'secondary'` — overflow wallets (generic Starknet / EVM)
     * @type {['primary' | 'secondary', React.Dispatch<React.SetStateAction<'primary' | 'secondary'>>]}
     */
    const [view, setView] = useState('primary');

    const { completeWalletLogin, isConnecting: isAuthConnecting } = useAuth();
    const lobstrHook = useLobstr();
    const installed = useWalletDetection();

    // Reset transient state each time the modal is opened
    useEffect(() => {
        if (isOpen) {
            setConnecting(null);
            setError(null);
            setView('primary');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    /**
     * Initiates a wallet connection via `connectWalletFn`.
     *
     * Used for all wallets **except** LOBSTR (which uses `useLobstr().connect()`
     * directly and has its own inline handler).
     *
     * @param {WalletType} type - The wallet protocol to connect.
     * @param {unknown} [provider] - Optional EIP-6963 provider object. When
     *   supplied, `connectWalletFn` should use this provider instead of
     *   `window.ethereum`. Pass `null` / `undefined` for non-EVM wallets.
     * @returns {Promise<void>}
     */
    const handleConnect = async (type, provider = null) => {
        if (connecting) return; // Guard: prevent double-invocation
        setConnecting(type);
        setError(null);
        try {
            /** @type {ConnectWalletResult} */
            const result = await connectWalletFn(type, provider);
            if (result.success) {
                if (onConnect) onConnect(type);
            } else if (result.error === 'not_installed') {
                setError({ type, code: 'not_installed' });
                setConnecting(null);
            } else if (result.error === 'already_connecting') {
                // A prior attempt is still in flight — leave spinner visible
            } else {
                setError({ type, code: 'failed' });
                setConnecting(null);
            }
        } catch {
            setError({ type, code: 'failed' });
            setConnecting(null);
        }
    };

    return (
        <>
            {/* Backdrop — clicking dismisses the modal unless connecting */}
            <div
                className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity"
                onClick={() => !connecting && onClose()}
            />

            {/* Modal container */}
            <div className="
                fixed z-40
                bottom-0 left-0 right-0
                lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md
                bg-white shadow-2xl rounded-t-2xl lg:rounded-2xl flex flex-col max-h-[90vh] overflow-hidden
                animate-slide-up lg:animate-none lg:zoom-in
            ">
                {/* Mobile drag handle */}
                <div className="lg:hidden w-10 h-1 bg-border rounded-full mx-auto my-3" />

                <div className="flex-1 overflow-y-auto w-full">
                    {/* Header */}
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
                            Choose how you'd like to connect to Tradazone to start accepting payments.
                        </p>

                        <div className="flex flex-col gap-3">
                            {view === 'primary' ? (
                                <>
                                    {/* -------------------------------------------------- */}
                                    {/* LOBSTR — Stellar / XLM                             */}
                                    {/* Uses useLobstr().connect() directly, then calls    */}
                                    {/* completeWalletLogin(address, 'stellar') on success. */}
                                    {/* -------------------------------------------------- */}
                                    <button
                                        onClick={async () => {
                                            /** @type {LobstrConnectResult} */
                                            const result = await lobstrHook.connect();
                                            if (result?.success) {
                                                // Persist wallet session via AuthContext
                                                completeWalletLogin(result.address, 'stellar');
                                                if (onConnect) onConnect('stellar');
                                            } else if (result?.error) {
                                                setError({
                                                    type: 'stellar',
                                                    code: result.error === 'NOT_INSTALLED' ? 'not_installed' : 'failed',
                                                    message: result.error,
                                                });
                                            }
                                        }}
                                        disabled={connecting !== null || lobstrHook.isConnecting}
                                        className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all outline-none 
                                            ${connecting === 'stellar' || lobstrHook.isConnecting ? 'border-blue-400 bg-blue-50/50' : connecting !== null ? 'border-border/50 opacity-50' : 'border-border hover:border-blue-300 hover:bg-blue-50/30'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                <StellarIcon size={22} />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-t-primary flex items-center gap-2">
                                                    LOBSTR
                                                    <span className="text-[10px] uppercase font-bold tracking-wide bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                        Recommended
                                                    </span>
                                                </div>
                                                <div className="text-xs text-t-muted">Stellar Network</div>
                                            </div>
                                        </div>
                                        {lobstrHook.isConnecting ? (
                                            <span className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                                        ) : installed.lobstr && (
                                            <span className="text-[10px] uppercase font-bold tracking-wide text-green-600 bg-green-50 px-2 py-1 rounded-md">Installed</span>
                                        )}
                                    </button>

                                    {/* -------------------------------------------------- */}
                                    {/* Argent X — Starknet / STRK                         */}
                                    {/* connectWalletFn('starknet')                        */}
                                    {/* -------------------------------------------------- */}
                                    <button
                                        onClick={() => handleConnect('starknet')}
                                        disabled={connecting !== null}
                                        className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all outline-none 
                                            ${connecting === 'starknet' ? 'border-brand/40 bg-brand/5' : connecting !== null ? 'border-border/50 opacity-50' : 'border-border hover:border-brand/30 hover:bg-brand/5'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-[#FF875B]/10 flex items-center justify-center flex-shrink-0">
                                                <ArgentIcon size={20} />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-t-primary">Argent</div>
                                                <div className="text-xs text-t-muted">Starknet Network</div>
                                            </div>
                                        </div>
                                        {connecting === 'starknet' ? (
                                            <span className="w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                                        ) : installed.argent && (
                                            <span className="text-[10px] uppercase font-bold tracking-wide text-green-600 bg-green-50 px-2 py-1 rounded-md">Installed</span>
                                        )}
                                    </button>

                                    {/* -------------------------------------------------- */}
                                    {/* MetaMask — EVM                                      */}
                                    {/* Extracts EIP-6963 provider (rdns: io.metamask)      */}
                                    {/* connectWalletFn('evm', provider)                   */}
                                    {/* -------------------------------------------------- */}
                                    <button
                                        onClick={() => {
                                            const provider = installed.discovered.find(p => p.info.rdns === 'io.metamask')?.provider;
                                            handleConnect('evm', provider);
                                        }}
                                        disabled={connecting !== null}
                                        className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all outline-none 
                                            ${connecting === 'evm' ? 'border-orange-200 bg-orange-50/50' : connecting !== null ? 'border-border/50 opacity-50' : 'border-border hover:border-orange-200 hover:bg-orange-50/30'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center flex-shrink-0">
                                                <MetaMaskIcon size={24} />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-t-primary">MetaMask</div>
                                                <div className="text-xs text-t-muted">EVM Network</div>
                                            </div>
                                        </div>
                                        {connecting === 'evm' ? (
                                            <span className="w-4 h-4 border-2 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
                                        ) : installed.metamask && (
                                            <span className="text-[10px] uppercase font-bold tracking-wide text-green-600 bg-green-50 px-2 py-1 rounded-md">Installed</span>
                                        )}
                                    </button>

                                    {/* -------------------------------------------------- */}
                                    {/* Phantom — Solana / EVM                             */}
                                    {/* Extracts EIP-6963 provider (rdns: app.phantom)     */}
                                    {/* connectWalletFn('evm', provider)                   */}
                                    {/* -------------------------------------------------- */}
                                    <button
                                        onClick={() => {
                                            const provider = installed.discovered.find(p => p.info.rdns === 'app.phantom')?.provider;
                                            handleConnect('evm', provider);
                                        }}
                                        disabled={connecting !== null}
                                        className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all outline-none 
                                            ${connecting === 'evm' ? 'border-purple-200 bg-purple-50/50' : connecting !== null ? 'border-border/50 opacity-50' : 'border-border hover:border-purple-200 hover:bg-purple-50/30'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
                                                <PhantomIcon size={24} />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-t-primary">Phantom</div>
                                                <div className="text-xs text-t-muted">Solana / EVM</div>
                                            </div>
                                        </div>
                                        {connecting === 'evm' ? (
                                            <span className="w-4 h-4 border-2 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                                        ) : installed.phantom && (
                                            <span className="text-[10px] uppercase font-bold tracking-wide text-green-600 bg-green-50 px-2 py-1 rounded-md">Installed</span>
                                        )}
                                    </button>

                                    {/* -------------------------------------------------- */}
                                    {/* Base Account — Coinbase Smart Wallet / EVM         */}
                                    {/* Extracts EIP-6963 provider (rdns: com.coinbase…)   */}
                                    {/* connectWalletFn('evm', provider)                   */}
                                    {/* -------------------------------------------------- */}
                                    <button
                                        onClick={() => {
                                            const provider = installed.discovered.find(p => p.info.rdns === 'com.coinbase.wallet')?.provider;
                                            handleConnect('evm', provider);
                                        }}
                                        disabled={connecting !== null}
                                        className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all outline-none 
                                            ${connecting === 'evm' ? 'border-blue-200 bg-blue-50/50' : connecting !== null ? 'border-border/50 opacity-50' : 'border-border hover:border-blue-200 hover:bg-blue-50/30'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                                                <BaseIcon size={24} />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-t-primary">Base Account</div>
                                                <div className="text-xs text-t-muted">Smart Wallet / EVM</div>
                                            </div>
                                        </div>
                                        {connecting === 'evm' ? (
                                            <span className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin" />
                                        ) : installed.base && (
                                            <span className="text-[10px] uppercase font-bold tracking-wide text-green-600 bg-green-50 px-2 py-1 rounded-md">Installed</span>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => setView('secondary')}
                                        disabled={connecting !== null}
                                        className="w-full mt-2 text-center text-sm font-semibold text-t-secondary hover:text-brand transition-colors p-3 rounded-lg border border-transparent hover:border-border hover:bg-gray-50 disabled:opacity-50"
                                    >
                                        View more options
                                    </button>
                                </>
                            ) : (
                                <>
                                    {/* -------------------------------------------------- */}
                                    {/* Other Starknet wallets (Braavos, etc.)             */}
                                    {/* connectWalletFn('starknet_generic')                */}
                                    {/* -------------------------------------------------- */}
                                    <button
                                        onClick={() => handleConnect('starknet_generic')}
                                        disabled={connecting !== null}
                                        className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all outline-none 
                                            ${connecting === 'starknet_generic' ? 'border-gray-400 bg-gray-50/50' : connecting !== null ? 'border-border/50 opacity-50' : 'border-border hover:border-gray-300 hover:bg-gray-50/30'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500">
                                                <WalletIcon size={20} />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-t-primary">Other Starknet Wallets</div>
                                                <div className="text-xs text-t-muted">Braavos, etc.</div>
                                            </div>
                                        </div>
                                        {connecting === 'starknet_generic' && (
                                            <span className="w-4 h-4 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                                        )}
                                    </button>

                                    {/* -------------------------------------------------- */}
                                    {/* Generic EVM / browser-injected wallet              */}
                                    {/* connectWalletFn('evm') — falls back to window.ethereum */}
                                    {/* -------------------------------------------------- */}
                                    <button
                                        onClick={() => handleConnect('evm')}
                                        disabled={connecting !== null}
                                        className={`w-full text-left p-4 rounded-xl border flex items-center justify-between transition-all outline-none 
                                            ${connecting === 'evm' ? 'border-gray-400 bg-gray-50/50' : connecting !== null ? 'border-border/50 opacity-50' : 'border-border hover:border-gray-300 hover:bg-gray-50/30'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 text-gray-500">
                                                <WalletIcon size={20} />
                                            </div>
                                            <div>
                                                <div className="font-semibold text-t-primary">EVM / Browser Wallets</div>
                                                <div className="text-xs text-t-muted">Any injected Web3 provider</div>
                                            </div>
                                        </div>
                                        {connecting === 'evm' && (
                                            <span className="w-4 h-4 border-2 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
                                        )}
                                    </button>
                                </>
                            )}
                        </div>

                        {/* ---------------------------------------------------------------- */}
                        {/* Error banners                                                    */}
                        {/*                                                                  */}
                        {/* not_installed → show wallet-specific install link               */}
                        {/* failed        → show error message / instructions               */}
                        {/* ---------------------------------------------------------------- */}

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
                    </div>
                </div>
            </div>
        </>
    );
}

export default ConnectWalletModal;