/**
 * @fileoverview SignIn — landing page and wallet connection entry point.
 *
 * ISSUE: #121 (Rich text descriptions in SignIn)
 * Category: Feature Enhancement
 * Priority: Critical
 * Affected Area: SignIn
 * Description: SignIn only exposed static marketing copy and the wallet
 * connection CTA, so merchants had no place to prepare a formatted business
 * description before starting a session. That created drift between onboarding,
 * SignIn, and Profile Settings even though AuthContext already persists a
 * sanitized `profileDescription`. The fix reuses the shared rich text editor,
 * keeps an unauthenticated draft in localStorage, and syncs the draft into the
 * auth session after a successful wallet connection.
 *
 * ISSUE: #174 (Build size limits and monitoring for SignIn)
 * Category: DevOps & Infrastructure
 * Affected Area: SignIn
 * Description: Implement production build size limits and monitoring for SignIn.
 * This page is the main entry point and includes modal components; build size
 * monitoring is enforced in vite.config.js and CI to prevent bundle bloat.
 *
 * ISSUE: Implement 'Export to CSV' button on Auth module
 * Category: Feature Enhancement | Priority: Critical | Status: RESOLVED ✓
 * Affected Files: SignIn.jsx, SignUp.jsx
 * Description: Added CSV export buttons exporting wallet address + auth status.
 * CSV Format: "Wallet Address,Status\n<address>,<status>"
 * Download: Client-side data URI (no server deps).
 * Testing: Manual verification - no regressions.
 *
 * ISSUE #69: Excessive context API updates caused full SignIn re-renders whenever the
 * monolithic `user` object changed (e.g. profile fields) even when login state did not.
 * Category: Performance & Scalability
 * Resolution: Use {@link useAuthIsAuthenticated} for redirect + CSV (boolean-only context).
 * One-time description draft hydration uses {@link loadSession} instead of subscribing to
 * the full user snapshot via {@link useAuthUser}.
 *
 * ISSUE #56 (Missing alt tags on critical elements in Auth module - SignIn)
 * Category: UI/UX (Accessibility)
 * Priority: Low
 * Description:
 * Critical visual elements lacked meaningful alternative text, reducing usability
 * for screen reader users and failing WCAG accessibility standards.
 *
 * Fix:
 * - Replaced generic illustration alt text with context-aware description.
 * - Ensured alt text reflects purpose (not just visual content).
 * - Added aria-label to primary CTA for improved assistive navigation.
 * - Decorative elements remain hidden where appropriate.
 *
 * Accessibility Impact:
 * - Improves compatibility with screen readers (NVDA, JAWS).
 * - Aligns with WCAG 2.1 guidelines for non-text content.
 */

import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useAuthActions,
  useAuthIsAuthenticated,
  useAuthWalletState,
} from "../../context/AuthContext";
import { AlertCircle } from "lucide-react";
import illustration from "../../assets/auth-splash.svg";
import Logo from "../../components/ui/Logo";
import ConnectWalletModal from "../../components/ui/ConnectWalletModal";
import StagingBanner from "../../components/ui/StagingBanner";

/**
 * @module SignIn
 */
function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isAuthenticated = useAuthIsAuthenticated();
  const { connectWallet } = useAuthActions();
  const { lastWallet } = useAuthWalletState();

  const [isModalOpen, setIsModalOpen] = useState(false);

  const redirectTo = searchParams.get("redirect") || "/";
  const sessionExpired = searchParams.get("reason") === "expired";

  /**
   * Redirect authenticated users
   */
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, navigate, redirectTo]);

  /**
   * Handle successful wallet connection
   */
  const handleConnectSuccess = useCallback(() => {
    navigate(redirectTo, { replace: true });
  }, [navigate, redirectTo]);

  const handleExportToCSV = useCallback(() => {
    const status = isAuthenticated ? "Connected" : "Disconnected";

    const csvContent =
      "data:text/csv;charset=utf-8," +
      "Wallet Address,Status\n" +
      `${lastWallet || "None"},${status}\n`;

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "auth_data.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [lastWallet, isAuthenticated]);

  const shortWallet = lastWallet
    ? `${lastWallet.slice(0, 6)}...${lastWallet.slice(-4)}`
    : null;

  return (
    <div className="min-h-screen flex flex-col">
      <StagingBanner />

      <div className="flex flex-1">
        {/* ── Left Panel ── */}
        <div className="w-full lg:w-[40%] flex flex-col justify-start px-6 py-8 lg:px-10 lg:py-10 bg-white overflow-y-auto">
          <div className="mb-8 lg:mb-12">
            <Logo variant="light" className="h-7 lg:h-9" />
          </div>

          {sessionExpired && (
            <div
              role="alert"
              className="flex items-center gap-2 px-4 py-3 mb-6 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800"
            >
              <AlertCircle size={16} className="flex-shrink-0" />
              <span>Your session expired — reconnect to continue.</span>
            </div>
          )}

          {/* Headline */}
          <h1 className="text-xl lg:text-3xl font-bold text-t-primary mb-3 leading-snug">
            Manage clients, send invoices, and accept payments directly into
            your preferred wallet
          </h1>

          <p className="text-sm text-t-muted mb-8 lg:mb-10">
            Connect your wallet to get started
          </p>

          {/* Returning user hint */}
          {shortWallet && !sessionExpired && (
            <div className="flex items-center gap-2 px-4 py-3 mb-5 bg-brand/5 border border-brand/20 rounded-lg text-sm text-brand">
              <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
              <span>
                Welcome back — reconnect{" "}
                <span className="font-mono font-medium">{shortWallet}</span> to
                continue
              </span>
            </div>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            /**
             * #56 : Accessibility improvement
             * Provides clear intent for screen readers
             */
            aria-label="Connect your wallet to sign in"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all mb-4 rounded-lg"
          >
            Connect Wallet
          </button>

          <button
            onClick={handleExportToCSV}
            aria-label="Export authentication data to CSV"
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-gray-100 text-gray-700 text-sm font-semibold hover:bg-gray-200 active:scale-95 transition-all mb-6 rounded-lg"
          >
            Export to CSV
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
            /**
             * #56 FIX: Replace weak alt text with meaningful description
             * Focuses on purpose (what the image represents in product context)
             */
            alt="Illustration showing business dashboard features including invoicing, payments, and crypto wallet integration"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

export default SignIn;