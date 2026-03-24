/**
 * @fileoverview AuthContext — application-wide authentication and wallet state.
 *
 * Manages user identity, wallet connection, and session persistence for
 * Tradazone. Exposes a `connectWallet` function that is the primary entry
 * point used by {@link ConnectWalletModal}.
 *
 * ## Session storage
 * Sessions are persisted to `localStorage` under the key `tradazone_auth`
 * as a JSON envelope `{ user, expiresAt }`. Sessions expire after 7 days.
 * The last-connected wallet address is separately stored under `tradazone_last_wallet`
 * to power the "welcome back" hint on the sign-in page.
 *
 * ## Wallet types supported
 * | Type               | Network   | Connection method          |
 * |--------------------|-----------|----------------------------|
 * | `'stellar'`        | Stellar   | `connectStellarWallet()`   |
 * | `'starknet'`       | Starknet  | `connectStarknetWallet()`  |
 * | `'starknet_generic'` | Starknet | `connectStarknetWallet()`  |
 * | `'evm'`            | EVM       | `connectEvmWallet()`       |
 *
 * @module AuthContext
 */

import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SESSION_KEY = "tradazone_auth";
const WALLET_KEY  = "tradazone_last_wallet";
/** @type {number} Session TTL: 7 days in milliseconds */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Type definitions
// ---------------------------------------------------------------------------

/**
 * @typedef {'stellar' | 'starknet' | 'evm' | 'starknet_generic'} WalletType
 * Identifies which blockchain network/protocol a wallet uses.
 */

/**
 * @typedef {Object} UserData
 * Shape of the authenticated user record stored in state and localStorage.
 *
 * @property {string | null} id              - Wallet address used as the user ID.
 * @property {string}        name            - Abbreviated wallet address, e.g. `"GABC12...XY56"`.
 * @property {string}        email           - Always `""` for wallet-auth users.
 * @property {string | null} avatar          - Profile image URL or `null`.
 * @property {boolean}       isAuthenticated - `true` once a wallet is connected.
 * @property {string | null} walletAddress   - Full connected wallet address.
 * @property {WalletType | null} walletType  - Which network the wallet is on.
 */

/**
 * @typedef {Object} WalletState
 * Runtime wallet state held in context.
 *
 * @property {string}  address     - Full wallet address (empty string if not connected).
 * @property {string}  balance     - String representation of the balance, e.g. `"0"`.
 * @property {'XLM' | 'STRK' | 'ETH'} currency - Native currency token of the network.
 * @property {boolean} isConnected - Whether a wallet is currently connected.
 * @property {string}  chainId     - Network identifier:
 *   - `"stellar"` for Stellar
 *   - `"SN_MAIN"` / `"0x534e5f4d41494e"` for Starknet mainnet
 *   - EIP-155 numeric chain ID string (e.g. `"1"`) for EVM
 *   - `""` when not connected or unknown
 */

/**
 * @typedef {Object} ConnectWalletResult
 * Shape returned by {@link AuthContextValue#connectWallet} and all
 * internal `connect*` functions.
 *
 * On success:
 * ```json
 * { "success": true }
 * ```
 *
 * On failure:
 * ```json
 * { "success": false, "error": "not_installed" }
 * ```
 *
 * @property {true}   [success] - Present when connection succeeded.
 * @property {false}  [success] - Present when connection failed (with `error`).
 * @property {string} [error]   - Error code on failure. Known values:
 *   - `"not_installed"`     — wallet extension not found
 *   - `"rejected"`          — user dismissed / denied the request
 *   - `"already_connecting"` — an EVM connection attempt is already in flight
 *   - `"failed"`            — generic / unexpected failure
 *   - `"Wallet not connected"` — Starknet enable returned no accounts
 */

/**
 * @typedef {Object} AuthContextValue
 * Shape of the value provided by {@link AuthProvider} and consumed via
 * {@link useAuth}.
 *
 * @property {UserData}   user        - Current authenticated user record.
 * @property {React.Dispatch<React.SetStateAction<UserData>>} setUser
 *   Direct state setter — use with care; prefer `login` / `logout` instead.
 *
 * @property {WalletState} wallet     - Current wallet connection state.
 * @property {React.Dispatch<React.SetStateAction<WalletState>>} setWallet
 *   Direct state setter — use with care.
 *
 * @property {WalletType | null} walletType - Which wallet type is connected.
 *
 * @property {(userData: UserData) => void} login
 *   Authenticates a user from non-wallet credentials (email/password, OAuth).
 *   Persists a session to localStorage.
 *
 * @property {() => void} logout
 *   Clears session, resets user and wallet state to defaults.
 *
 * @property {(type?: WalletType, provider?: unknown) => Promise<ConnectWalletResult>} connectWallet
 *   Entry point for wallet connection. Dispatches to the appropriate internal
 *   handler based on `type`. Passed as `connectWalletFn` prop to
 *   {@link ConnectWalletModal}.
 *
 *   Parameters:
 *   - `type`     — defaults to `'starknet'`.
 *   - `provider` — optional EIP-6963 provider object for `'evm'` connections.
 *     When omitted, falls back to `window.ethereum`.
 *
 * @property {() => Promise<void>} disconnectWallet
 *   Disconnects the current wallet. For Starknet, calls `disconnect()` from
 *   `get-starknet`. For Stellar/EVM there is no programmatic disconnect —
 *   simply calls `logout()`.
 *
 * @property {(address: string, type: WalletType) => void} completeWalletLogin
 *   Called directly by {@link ConnectWalletModal} for the LOBSTR flow (which
 *   manages its own connection state via `useLobstr`). Accepts the resolved
 *   address and type, then updates wallet state, user state, and session.
 *
 *   Payload:
 *   - `address` — the connected wallet's public address
 *   - `type`    — the wallet type (`'stellar'`, etc.)
 *
 * @property {string | null} lastWallet
 *   The address from the most recent successful connection, read from
 *   localStorage. Used by `SignIn` to show a "welcome back" hint.
 *
 * @property {boolean} isConnecting
 *   `true` while an EVM connection (`connectEvmWallet`) is in progress.
 *   Shared with consumers to disable re-entrant connection attempts.
 */

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

/**
 * Loads a valid (non-expired) session from localStorage.
 *
 * @returns {UserData | null} The stored user data, or `null` if absent/expired.
 */
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

/**
 * Persists a user session to localStorage with a rolling TTL.
 *
 * @param {UserData} userData - The user data to persist.
 * @returns {void}
 */
function saveSession(userData) {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        user: userData,
        expiresAt: Date.now() + SESSION_TTL_MS,
    }));
}

/**
 * Removes the session from localStorage.
 * @returns {void}
 */
function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------

/**
 * Default (unauthenticated) user object.
 * @type {UserData}
 */
const EMPTY_USER = {
    id: null,
    name: "",
    email: "",
    avatar: null,
    isAuthenticated: false,
    walletAddress: null,
    walletType: null,
};

// ---------------------------------------------------------------------------
// Provider component
// ---------------------------------------------------------------------------

/**
 * AuthProvider
 *
 * Wraps the application (or a subtree) with authentication and wallet state.
 * Must be an ancestor of any component that calls {@link useAuth}.
 *
 * @param {{ children: React.ReactNode }} props
 * @returns {JSX.Element}
 */
export function AuthProvider({ children }) {
    /** @type {[UserData, React.Dispatch<React.SetStateAction<UserData>>]} */
    const [user, setUser] = useState(() => {
        const saved = loadSession();
        return saved ?? { ...EMPTY_USER };
    });

    /**
     * Guards against concurrent EVM connection attempts.
     * @type {[boolean, React.Dispatch<React.SetStateAction<boolean>>]}
     */
    const [isConnecting, setIsConnecting] = useState(false);

    /**
     * Runtime wallet connection state.
     * @type {[WalletState, React.Dispatch<React.SetStateAction<WalletState>>]}
     */
    const [wallet, setWallet] = useState({
        address: user.walletAddress || "",
        balance: "0",
        currency: user.walletType === "stellar" ? "XLM" : "STRK",
        isConnected: !!user.walletAddress,
        chainId: user.walletType === "stellar" ? "stellar" : "",
    });

    /** @type {[WalletType | null, React.Dispatch<React.SetStateAction<WalletType | null>>]} */
    const [walletType, setWalletType] = useState(user.walletType || null);

    // ── completeWalletLogin ──────────────────────────────────────────────────

    /**
     * Finalises a wallet login when the connection flow is managed externally
     * (e.g. by `useLobstr` in {@link ConnectWalletModal}).
     *
     * Updates wallet state, user state, and persists the session.
     *
     * @param {string} address - Connected wallet address.
     * @param {WalletType} type - Wallet network type.
     * @returns {void}
     */
    const completeWalletLogin = (address, type) => {
        const currency = type === "stellar" ? "XLM" : "STRK";
        const chainId  = type === "stellar" ? "stellar" : "";

        /** @type {WalletState} */
        const walletState = { address, isConnected: true, chainId, balance: "0", currency };
        setWallet(walletState);
        setWalletType(type);
        localStorage.setItem(WALLET_KEY, address);

        /** @type {UserData} */
        const userData = {
            id: address,
            name: `${address.slice(0, 6)}...${address.slice(-4)}`,
            email: "",
            avatar: null,
            isAuthenticated: true,
            walletAddress: address,
            walletType: type,
        };
        setUser(userData);
        saveSession(userData);
    };

    // Last-connected wallet address for "welcome back" hint
    const lastWallet = localStorage.getItem(WALLET_KEY);

    // ── Standard auth ────────────────────────────────────────────────────────

    /**
     * Authenticates a user from non-wallet credentials.
     *
     * @param {UserData} userData - User data from external auth provider.
     * @returns {void}
     */
    const login = (userData) => {
        const authed = { ...userData, isAuthenticated: true };
        setUser(authed);
        saveSession(authed);
    };

    /**
     * Clears session data and resets all state to unauthenticated defaults.
     * @returns {void}
     */
    const logout = () => {
        clearSession();
        setUser({ ...EMPTY_USER });
        setWallet({ address: "", balance: "0", currency: "STRK", isConnected: false, chainId: "" });
        setWalletType(null);
    };

    // ── Starknet (Argent / Braavos) ──────────────────────────────────────────

    /**
     * Connects a Starknet wallet (Argent X, Braavos, or any `window.starknet`
     * provider).
     *
     * ### Detection order
     * 1. `window.starknet_argentX` — Argent X dedicated key
     * 2. `window.starknet`         — generic Starknet provider
     *
     * ### `enable()` call
     * Calls `starknetProvider.enable({ starknetVersion: "v4" })` and falls back
     * to `enable()` without arguments if the first call throws (version
     * negotiation fallback).
     *
     * ### Address extraction
     * Address may be at:
     * - `starknetProvider.selectedAddress`
     * - `starknetProvider.account.address`
     * - `enableResult[0]` (first element of accounts array)
     *
     * ### Dev fallback
     * If all real connection attempts fail for unexpected reasons, the function
     * falls back to a hardcoded mock address for local development. This is
     * intentional and should be removed before production deployment.
     *
     * @returns {Promise<ConnectWalletResult>}
     */
    const connectStarknetWallet = async () => {
        try {
            const starknetProvider = window.starknet_argentX || window.starknet;

            if (!starknetProvider) {
                throw new Error("No Starknet wallet extension found");
            }

            // Request account access; try v4 first then fall back
            const enableResult = await starknetProvider.enable({ starknetVersion: "v4" }).catch(() => {
                return starknetProvider.enable();
            });

            if (starknetProvider.isConnected || (enableResult && enableResult.length > 0)) {
                const addr =
                    starknetProvider.selectedAddress ||
                    (starknetProvider.account && starknetProvider.account.address) ||
                    enableResult[0];

                if (!addr) {
                    throw new Error("Could not retrieve Starknet address");
                }

                const chainIdInfo = starknetProvider.chainId || "SN_MAIN";

                /** @type {WalletState} */
                const walletState = { address: addr, isConnected: true, chainId: chainIdInfo, balance: "0", currency: "STRK" };
                setWallet(walletState);
                setWalletType("starknet");
                localStorage.setItem(WALLET_KEY, addr);

                /** @type {UserData} */
                const userData = {
                    id: addr,
                    name: starknetProvider.name || `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                    email: "",
                    avatar: null,
                    isAuthenticated: true,
                    walletAddress: addr,
                    walletType: "starknet",
                };
                setUser(userData);
                saveSession(userData);

                // Subscribe to account changes for the session lifetime
                if (starknetProvider.on) {
                    starknetProvider.on("accountsChanged", (accounts) => {
                        if (!accounts || accounts.length === 0) {
                            logout();
                        } else {
                            setWallet((prev) => ({ ...prev, address: accounts[0] }));
                        }
                    });
                }

                return { success: true };
            }

            return { success: false, error: "Wallet not connected" };
        } catch (error) {
            console.error("Starknet native connect failed:", error);

            if (error.message?.includes("No Starknet wallet") || error.message?.includes("not found")) {
                return { success: false, error: "not_installed" };
            }

            if (error.message?.includes("User rejected") || error.message?.includes("declined")) {
                return { success: false, error: "rejected" };
            }

            // ── Dev / demo fallback ─────────────────────────────────────────────
            // TODO: Remove before production. This mock address allows local
            // development without a real Starknet wallet installed.
            const mockAddr = "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7";
            /** @type {WalletState} */
            const walletState = { address: mockAddr, isConnected: true, chainId: "SN_MAIN", balance: "0", currency: "STRK" };
            setWallet(walletState);
            setWalletType("starknet");
            localStorage.setItem(WALLET_KEY, mockAddr);

            /** @type {UserData} */
            const userData = {
                id: mockAddr,
                name: "Wallet User",
                email: "",
                avatar: null,
                isAuthenticated: true,
                walletAddress: mockAddr,
                walletType: "starknet",
            };
            setUser(userData);
            saveSession(userData);
            return { success: true };
        }
    };

    // ── Stellar (LOBSTR via AuthContext — alternative path) ─────────────────

    /**
     * Connects a Stellar wallet via the LOBSTR Signer Extension API.
     *
     * > **Note:** {@link ConnectWalletModal} uses `useLobstr().connect()` and
     * > then calls `completeWalletLogin()` directly, bypassing this function.
     * > `connectStellarWallet` is therefore an alternative/fallback path
     * > (e.g. for use outside the modal).
     *
     * ### Public-key normalisation
     * The LOBSTR `getPublicKey()` API may return:
     * - A plain G‑address string
     * - `{ publicKey: "G..." }`
     * - `{ error: "LOCKED" | ... }`
     *
     * @returns {Promise<ConnectWalletResult>}
     */
    const connectStellarWallet = async () => {
        try {
            const lobstr = await import("@lobstrco/signer-extension-api");

            // Check extension presence (soft check; getPublicKey prompts anyway)
            await lobstr.isConnected();

            const pkResult = await lobstr.getPublicKey();

            let addr = "";
            if (typeof pkResult === "string" && pkResult.startsWith("G")) {
                addr = pkResult;
            } else if (pkResult && pkResult.publicKey) {
                addr = pkResult.publicKey;
            } else if (pkResult && pkResult.error) {
                throw new Error(pkResult.error);
            } else {
                throw new Error("Could not retrieve public key from LOBSTR");
            }

            /** @type {WalletState} */
            const walletState = { address: addr, isConnected: true, chainId: "stellar", balance: "0", currency: "XLM" };
            setWallet(walletState);
            setWalletType("stellar");
            localStorage.setItem(WALLET_KEY, addr);

            /** @type {UserData} */
            const userData = {
                id: addr,
                name: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                email: "",
                avatar: null,
                isAuthenticated: true,
                walletAddress: addr,
                walletType: "stellar",
            };
            setUser(userData);
            saveSession(userData);

            return { success: true };
        } catch (error) {
            console.error("Stellar wallet connect failed:", error);

            if (error.message?.includes("not installed") || error.message?.includes("LOBSTR")) {
                return { success: false, error: "not_installed" };
            }

            if (error.message?.includes("User declined") ||
                error.message?.includes("rejected") ||
                error.message?.includes("cancelled")) {
                return { success: false, error: "rejected" };
            }

            return { success: false, error: "failed", message: error.message };
        }
    };

    // ── EVM / Browser Wallets ────────────────────────────────────────────────

    /**
     * Connects an EVM wallet using `eth_requestAccounts` (EIP-1102).
     *
     * ### Provider resolution
     * - If `specificProvider` is supplied (from EIP-6963 discovery), uses it.
     * - Otherwise falls back to `window.ethereum` (legacy injection).
     *
     * ### Request payload sent to the wallet
     * ```js
     * provider.send('eth_requestAccounts', [])
     * // Returns: string[] — array of hex-encoded EVM addresses
     * ```
     *
     * ### Account-change subscription
     * After connection, subscribes to `accountsChanged` events on the provider.
     * If all accounts are removed (user disconnects in the extension), `logout()`
     * is called automatically.
     *
     * @param {import('ethers').Eip1193Provider | null} [specificProvider=null]
     *   Optional EIP-6963 provider. When `null`, falls back to `window.ethereum`.
     * @returns {Promise<ConnectWalletResult>}
     */
    const connectEvmWallet = async (specificProvider = null) => {
        // Guard: prevent double-invocation (returned to caller as an error code)
        if (isConnecting) return { success: false, error: "already_connecting" };

        setIsConnecting(true);
        try {
            const injectedProvider = specificProvider || window.ethereum;

            if (!injectedProvider) {
                throw new Error("EVM Wallet not installed");
            }

            const { BrowserProvider } = await import("ethers");
            const provider = new BrowserProvider(injectedProvider);

            // EIP-1102: request account access — prompts user in extension
            const accounts = await provider.send("eth_requestAccounts", []);
            if (!accounts || accounts.length === 0) {
                throw new Error("No accounts returned");
            }

            const addr    = accounts[0];
            const network = await provider.getNetwork();

            /** @type {WalletState} */
            const walletState = {
                address: addr,
                isConnected: true,
                chainId: network.chainId.toString(),
                balance: "0",
                currency: "ETH",
            };
            setWallet(walletState);
            setWalletType("evm");
            localStorage.setItem(WALLET_KEY, addr);

            /** @type {UserData} */
            const userData = {
                id: addr,
                name: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
                email: "",
                avatar: null,
                isAuthenticated: true,
                walletAddress: addr,
                walletType: "evm",
            };
            setUser(userData);
            saveSession(userData);

            // Subscribe to account changes for the session lifetime
            if (injectedProvider.on) {
                injectedProvider.on("accountsChanged", (newAccounts) => {
                    if (newAccounts.length === 0) {
                        logout();
                    } else {
                        setWallet((prev) => ({ ...prev, address: newAccounts[0] }));
                    }
                });
            }

            setIsConnecting(false);
            return { success: true };
        } catch (error) {
            console.error("EVM wallet connect failed:", error);

            if (error.message?.includes("not installed") || error.message?.includes("EVM")) {
                return { success: false, error: "not_installed" };
            }

            // EIP-1193 user-rejection error code
            if (error.code === 4001 || error.message?.includes("rejected")) {
                return { success: false, error: "rejected" };
            }

            setIsConnecting(false);
            return { success: false, error: "failed" };
        }
    };

    // ── Public: connectWallet ────────────────────────────────────────────────

    /**
     * Public wallet connection entry point. Used as the `connectWalletFn` prop
     * on {@link ConnectWalletModal} and as `connectWallet` from `useAuth()`.
     *
     * Dispatches to the appropriate internal handler based on `type`.
     *
     * | `type`               | Internal function           |
     * |----------------------|-----------------------------|
     * | `'stellar'`          | `connectStellarWallet()`    |
     * | `'evm'`              | `connectEvmWallet(provider)`|
     * | `'starknet_generic'` | `connectStarknetWallet()`   |
     * | `'starknet'`         | `connectStarknetWallet()`   |
     * | _(default)_          | `connectStarknetWallet()`   |
     *
     * @param {WalletType} [type='starknet'] - Wallet protocol to connect.
     * @param {import('ethers').Eip1193Provider | null} [provider=null]
     *   Optional EIP-6963 provider object. Only used when `type === 'evm'`.
     * @returns {Promise<ConnectWalletResult>}
     */
    const connectWallet = async (type = "starknet", provider = null) => {
        if (type === "stellar")          return connectStellarWallet();
        if (type === "evm")              return connectEvmWallet(provider);
        if (type === "starknet_generic") return connectStarknetWallet();
        return connectStarknetWallet();
    };

    // ── disconnectWallet ─────────────────────────────────────────────────────

    /**
     * Disconnects the current wallet and clears the session.
     *
     * For Starknet, attempts a programmatic disconnect via `get-starknet`.
     * For Stellar and EVM wallets there is no programmatic disconnect in the
     * respective extension APIs — the function simply calls `logout()` to
     * clear local state.
     *
     * @returns {Promise<void>}
     */
    const disconnectWallet = async () => {
        if (walletType === "starknet") {
            try {
                const { disconnect } = await import("get-starknet");
                await disconnect();
            } catch (_) {
                // Swallow: disconnect is best-effort; always clear local state
            }
        }
        logout();
    };

    // ── Context value ────────────────────────────────────────────────────────

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

// ---------------------------------------------------------------------------
// Consumer hook
// ---------------------------------------------------------------------------

/**
 * useAuth
 *
 * Returns the {@link AuthContextValue} from the nearest `AuthProvider`.
 * Throws if called outside of an `AuthProvider` tree.
 *
 * @returns {AuthContextValue}
 * @throws {Error} If called outside an `AuthProvider`.
 *
 * @example
 * const { connectWallet, user, wallet } = useAuth();
 */
export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within an AuthProvider");
    return context;
}