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
 */
import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  useAuthActions,
  useAuthUser,
  useAuthWalletState,
} from "../../context/AuthContext";
import { AlertCircle } from "lucide-react";
import { STORAGE_PREFIX } from "../../config/env";
import illustration from "../../assets/auth-splash.svg";
import Logo from "../../components/ui/Logo";
import RichTextEditor from "../../components/forms/RichTextEditor";
import ConnectWalletModal from "../../components/ui/ConnectWalletModal";
import StagingBanner from "../../components/ui/StagingBanner";
import { getPlainTextFromRichText, normalizeRichTextHtml } from "../../utils/richText";

const SIGNIN_DESCRIPTION_DRAFT_KEY = `${STORAGE_PREFIX}_signin_description_draft`;

function readDescriptionDraft(profileDescription = "") {
  const savedDraft = localStorage.getItem(SIGNIN_DESCRIPTION_DRAFT_KEY) || "";
  return normalizeRichTextHtml(profileDescription || savedDraft);
}

function persistDescriptionDraft(value) {
  const normalized = normalizeRichTextHtml(value);

  if (normalized) {
    localStorage.setItem(SIGNIN_DESCRIPTION_DRAFT_KEY, normalized);
  } else {
    localStorage.removeItem(SIGNIN_DESCRIPTION_DRAFT_KEY);
  }

  return normalized;
}

/**
 * @fileoverview SignIn page — handles wallet connection and authentication.
 *
 * ISSUE: #151 (Build size limits for SignIn)
 * Category: DevOps & Infrastructure
 * Affected Area: SignIn
 * Description: Implement production build size limits and monitoring for SignIn.
 * This chunk must remain under 100 KB to ensure fast initial page load.
 * Size limits and monitoring are enforced in vite.config.js and CI.
 *
 * @module SignIn
 */
function SignIn() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthUser();
  const { connectWallet, updateProfile } = useAuthActions();
  const { lastWallet } = useAuthWalletState();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState(() =>
    readDescriptionDraft(user?.profileDescription),
  );

  const redirectTo = searchParams.get("redirect") || "/";
  const sessionExpired = searchParams.get("reason") === "expired";

  useEffect(() => {
    if (user?.isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [user?.isAuthenticated, navigate, redirectTo]);

  const handleDescriptionChange = useCallback((value) => {
    const normalized = persistDescriptionDraft(value);
    setDescriptionDraft(normalized);
  }, []);

  const handleConnectSuccess = useCallback(() => {
    const normalizedDraft = persistDescriptionDraft(descriptionDraft);

    if (normalizedDraft) {
      updateProfile({ profileDescription: normalizedDraft });
    }

    navigate(redirectTo, { replace: true });
  }, [descriptionDraft, navigate, redirectTo, updateProfile]);

  const handleExportToCSV = useCallback(() => {
    const isAuthenticated = user?.isAuthenticated ?? false;
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
  }, [lastWallet, user?.isAuthenticated]);

  const shortWallet = lastWallet
    ? `${lastWallet.slice(0, 6)}...${lastWallet.slice(-4)}`
    : null;
  const hasDescriptionDraft = Boolean(getPlainTextFromRichText(descriptionDraft));

  return (
    <div className="min-h-screen flex flex-col">
      <StagingBanner />
      <div className="flex flex-1">
        {/* ── Left Panel ── */}
        <div className="w-full lg:w-[40%] flex flex-col justify-start px-6 py-8 lg:px-10 lg:py-10 bg-white overflow-y-auto">
          {/* Logo */}
          <div className="mb-8 lg:mb-12">
            <Logo variant="light" className="h-7 lg:h-9" />
          </div>

          {/* Session expired banner */}
          {sessionExpired && (
            <div className="flex items-center gap-2 px-4 py-3 mb-6 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
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

          <div className="mb-6 rounded-xl border border-border bg-gray-50/80 p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-t-primary">
                Business description draft
              </h2>
              <p className="text-xs text-t-muted">
                Add formatted context about your business before you connect.
                Tradazone keeps this draft on this device and syncs it into your
                profile after the next successful wallet session.
              </p>
            </div>
            <RichTextEditor
              id="signin-business-description"
              label="Business Description"
              value={descriptionDraft}
              onChange={handleDescriptionChange}
              placeholder="Describe your business, products, or services before connecting..."
              hint="Supports bold, italic, and bullet lists. The draft is sanitized before it is stored."
            />
            {hasDescriptionDraft && (
              <p className="mt-3 text-xs font-medium text-brand">
                Your latest description draft will be attached to the next
                wallet connection.
              </p>
            )}
          </div>

          {/* Connect Wallet Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold hover:opacity-90 active:scale-95 transition-all mb-4 rounded-lg"
          >
            Connect Wallet
          </button>

          {/* Export to CSV Button */}
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
            alt="Tradazone — invoices, payments, crypto"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}

export default SignIn;
