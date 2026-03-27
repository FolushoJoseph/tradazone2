import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dispatchWebhook } from '../../services/webhook';
import { IS_STAGING, APP_NAME } from '../../config/env';
import illustration from '../../assets/auth-splash.svg';
import Logo from '../../components/ui/Logo';
import ConnectWalletModal from '../../components/ui/ConnectWalletModal';

/**
 * SignUp.jsx
 *
 * ISSUE: CI pipeline lacks comprehensive linting job for SignUp
 * Category: DevOps & Infrastructure
 * Affected Area: SignUp
 * Status: RESOLVED ✓
 * 
 * Description: 
 * The CI pipeline (deploy.yml) was missing a linting step in the test job.
 * Additionally, SignUp.jsx had an unused import (Link from react-router-dom)
 * that was causing linting errors.
 * 
 * Resolution:
 * 1. Removed unused 'Link' import from SignUp.jsx (no longer used in component)
 * 2. Updated .github/workflows/deploy.yml to include 'npm run lint' in the test job
 *    BEFORE running tests (matching staging.yml pattern)
 * 3. Ensured SignUp.jsx passes ESLint with no warnings or errors
 *
 * CI Pipeline Changes:
 * - deploy.yml now runs linting early in the test job
 * - Linting runs on every push to main branch BEFORE building for production
 * - This ensures code quality standards are enforced consistently
 *
 * @coverage-note Critical logic in this component:
 *   1. useEffect redirect — if `user.isAuthenticated` is true on mount (or
 *      becomes true), the user is immediately redirected to `redirectTo`.
 *      Prevents authenticated users from accessing the sign-up page.
 *   2. handleConnectSuccess — called by ConnectWalletModal on a successful
 *      wallet connection. Sets `tradazone_onboarded` to `'false'` in
 *      localStorage (triggers WelcomeModal onboarding), fires the
 *      `user.signed_up` webhook (non-blocking), then navigates to `redirectTo`.
 *   3. Staging banner — rendered only when IS_STAGING is true; must carry
 *      role="banner" and data-testid="staging-banner" for a11y and testing.
 * Tests: src/test/SignUp.test.jsx
 */
/**
 * SignUp page component - entry point for new users to connect their wallet.
 * 
 * This component serves as the authentication entry point for the application.
 * Users who are not yet authenticated can connect their wallet here to sign up.
 * Authenticated users are automatically redirected away from this page.
 *
 * @returns {JSX.Element} The SignUp page with wallet connection UI
 */
function SignUp() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { connectWallet, user } = useAuth();

    /** @type {boolean} */
    const [isModalOpen, setIsModalOpen] = useState(false);

    /** @type {string} */
    const redirectTo = searchParams.get('redirect') || '/';

    /**
     * Redirects authenticated users to the specified destination.
     * 
     * Runs on mount and whenever user.isAuthenticated changes.
     *
     * @see https://react.dev/learn/you-might-not-need-an-effect
     */
    useEffect(() => {
        if (user.isAuthenticated) {
            navigate(redirectTo, { replace: true });
        }
    }, [user.isAuthenticated, navigate, redirectTo]);

    /**
     * Handles successful wallet connection - marks user for onboarding,
     * fires webhook event, and navigates to redirect destination.
     *
     * @param {string | null} walletAddress - Connected wallet address or null to use fallback
     * @param {string | null} walletType - Wallet type (e.g., 'evm', 'stellar') or null to use fallback
     */
    const handleConnectSuccess = (walletAddress, walletType) => {
        // Mark as first-time user so Onboarding/Welcome logic can trigger if needed
        localStorage.setItem('tradazone_onboarded', 'false');
        // Fire user.signed_up webhook (non-blocking)
        dispatchWebhook('user.signed_up', {
            walletAddress: walletAddress || user.walletAddress,
            walletType: walletType || user.walletType,
        });
        navigate(redirectTo, { replace: true });
    };

    return (
        <div className="min-h-screen flex flex-col">
            {/* ── Staging environment banner ── */}
            {IS_STAGING && (
                <div
                    role="banner"
                    data-testid="staging-banner"
                    className="w-full bg-amber-400 text-amber-900 text-xs font-semibold text-center py-1.5 px-4"
                >
                    ⚠️ {APP_NAME} — STAGING ENVIRONMENT. Data is not real and may be reset at any time.
                </div>
            )}

            <div className="flex flex-1">
            {/* ── Left Panel ── */}
            <div className="w-full lg:w-[40%] flex flex-col justify-start px-6 py-8 lg:px-10 lg:py-10 bg-white overflow-y-auto">
                {/* Logo */}
                <div className="mb-8 lg:mb-12">
                    <Logo variant="light" className="h-7 lg:h-9" />
                </div>

                {/* Headline */}
                <h1 className="text-xl lg:text-3xl font-bold text-t-primary mb-3 leading-snug">
                    Manage clients, send invoices, and accept payments directly into your preferred wallet
                </h1>
                <p className="text-sm text-t-muted mb-8 lg:mb-10">
                    Connect your wallet to get started
                </p>

                {/* Connect Wallet Button */}
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all mb-6 rounded-lg"
                >
                    Connect Wallet
                </button>

                <ConnectWalletModal 
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    connectWalletFn={connectWallet}
                    onConnect={handleConnectSuccess}
                />


            </div>

            {/* ── Right Panel — Illustration ── */}
            <div className="hidden lg:block lg:w-[60%] bg-gray-50 relative overflow-hidden">
                <img
                    src={illustration}
                    alt="Tradazone — invoices, payments, crypto"
                    className="absolute inset-0 w-full h-full object-cover"
                />
            </div>
            </div>
        </div>
    );
}

export default SignUp;
