import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, ExternalLink } from 'lucide-react';
import illustration from '../../assets/signin-illustration.png';
import Logo from '../../components/ui/Logo';

function SignIn() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { connectWallet, user, lastWallet } = useAuth();

    const [connecting, setConnecting] = useState(false);
    const [error, setError] = useState(null);

    const redirectTo = searchParams.get('redirect') || '/';
    const sessionExpired = searchParams.get('reason') === 'expired';

    // Auto-redirect already-authenticated users
    useEffect(() => {
        if (user.isAuthenticated) {
            navigate(redirectTo, { replace: true });
        }
    }, [user.isAuthenticated, navigate, redirectTo]);

    const handleConnect = async () => {
        setConnecting(true);
        setError(null);
        try {
            const result = await connectWallet();
            if (result.success) {
                navigate(redirectTo, { replace: true });
            } else if (result.error === 'not_installed') {
                setError('not_installed');
            } else {
                setError('failed');
            }
        } catch {
            setError('failed');
        } finally {
            setConnecting(false);
        }
    };

    const shortWallet = lastWallet
        ? `${lastWallet.slice(0, 6)}...${lastWallet.slice(-4)}`
        : null;

    return (
        <div className="min-h-screen flex">
            {/* ── Left Panel ── */}
            <div className="flex-1 flex flex-col justify-start px-6 py-8 lg:px-10 lg:py-10 bg-white lg:max-w-xl overflow-y-auto">
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
                <h1 className="text-xl lg:text-2xl font-bold text-t-primary mb-2 leading-snug">
                    Invoice clients.<br />
                    Accept crypto.<br />
                    Get paid on Starknet.
                </h1>
                <p className="text-sm text-t-muted mb-8 lg:mb-10">
                    Sign in with your wallet or create a free account.
                </p>

                {/* Returning user hint */}
                {shortWallet && !sessionExpired && (
                    <div className="flex items-center gap-2 px-4 py-3 mb-5 bg-brand/5 border border-brand/20 rounded-lg text-sm text-brand">
                        <span className="w-2 h-2 rounded-full bg-brand flex-shrink-0" />
                        <span>Welcome back — reconnect <span className="font-mono font-medium">{shortWallet}</span> to continue</span>
                    </div>
                )}

                {/* Connect card */}
                <div className="border border-border rounded-xl overflow-hidden mb-5">
                    <div className="px-5 py-3.5 border-b border-border bg-page/50">
                        <span className="text-xs font-semibold text-t-muted uppercase tracking-wide">Connect wallet</span>
                    </div>
                    <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#FF875B]/10 flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M10 2L4 18h4.5L10 13l1.5 5H16L10 2z" fill="#FF875B" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-t-primary">Argent</p>
                                <p className="text-xs text-t-muted">Starknet wallet</p>
                            </div>
                        </div>
                        <button
                            id="btn-connect-wallet"
                            onClick={handleConnect}
                            disabled={connecting}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold hover:bg-brand-dark active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed min-w-[120px]"
                        >
                            {connecting ? 'Opening Argent…' : 'Connect Wallet'}
                        </button>
                    </div>
                </div>

                {/* Error states */}
                {error === 'not_installed' && (
                    <div className="flex items-start gap-2 px-4 py-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                        <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                        <span>
                            Argent wallet not found.{' '}
                            <a
                                href="https://www.argent.xyz/argent-x/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline font-medium inline-flex items-center gap-1"
                            >
                                Install Argent <ExternalLink size={12} />
                            </a>
                        </span>
                    </div>
                )}
                {error === 'failed' && (
                    <div className="flex items-center gap-2 px-4 py-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                        <AlertCircle size={16} className="flex-shrink-0" />
                        <span>Connection cancelled. Please try again.</span>
                    </div>
                )}

                {/* Sign up CTA */}
                <p className="text-sm text-t-muted text-center mt-2">
                    New here?{' '}
                    <Link
                        to="/signup"
                        id="btn-create-account"
                        className="text-brand font-semibold hover:underline"
                    >
                        Create a free account →
                    </Link>
                </p>
            </div>

            {/* ── Right Panel — Illustration ── */}
            <div className="hidden lg:flex flex-1 items-stretch">
                <img
                    src={illustration}
                    alt="Tradazone — invoices, payments, crypto"
                    className="w-full h-full object-cover"
                />
            </div>
        </div>
    );
}

export default SignIn;
