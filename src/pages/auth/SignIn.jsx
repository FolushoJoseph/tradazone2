import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';
import illustration from '../../assets/signin-illustration.png';

function SignIn() {
    const navigate = useNavigate();
    const { connectWallet } = useAuth();
    const [connecting, setConnecting] = useState(false);

    const handleConnect = async () => {
        setConnecting(true);
        try {
            const success = await connectWallet();
            if (success) {
                navigate('/');
            }
        } catch (err) {
            console.error('Connection failed:', err);
        } finally {
            setConnecting(false);
        }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Panel — White */}
            <div className="flex-1 flex flex-col justify-start px-12 py-10 bg-white">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-16">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect x="4" y="5" width="16" height="2.5" rx="1" fill="#3C3CEF" />
                        <rect x="4" y="10.75" width="10" height="2.5" rx="1" fill="#3C3CEF" />
                        <rect x="4" y="16.5" width="16" height="2.5" rx="1" fill="#3C3CEF" />
                    </svg>
                    <span className="text-xl font-bold tracking-tight text-t-primary">trada<span className="text-t-secondary">zone</span></span>
                </div>

                {/* Tagline */}
                <p className="text-lg text-t-secondary mb-10 max-w-sm">
                    Your first step  to financial freedom starts with you.
                </p>

                {/* Connect Card */}
                <div className="max-w-md border border-brand/30 rounded-xl overflow-hidden">
                    {/* Card Header */}
                    <div className="px-5 py-4 border-b border-brand/20 bg-brand/[0.02]">
                        <span className="text-sm font-medium text-t-primary">Connect to Tradazone</span>
                    </div>

                    {/* Argent Wallet Row */}
                    <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3">
                            {/* Argent Logo */}
                            <div className="w-9 h-9 rounded-lg bg-[#FF875B]/10 flex items-center justify-center">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                                    <path d="M10 2L4 18h4.5L10 13l1.5 5H16L10 2z" fill="#FF875B" />
                                </svg>
                            </div>
                            <span className="text-sm font-semibold text-t-primary">Argent</span>
                        </div>
                        <button
                            onClick={handleConnect}
                            disabled={connecting}
                            className="text-sm font-semibold text-brand hover:text-brand-dark transition-colors disabled:opacity-50"
                        >
                            {connecting ? 'Connecting...' : 'Connect'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Panel — Illustration */}
            <div className="hidden lg:block lg:w-1/2">
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
