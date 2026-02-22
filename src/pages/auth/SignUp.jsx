import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AlertCircle, ExternalLink, User, Mail } from 'lucide-react';
import illustration from '../../assets/signin-illustration.png';
import Logo from '../../components/ui/Logo';

function SignUp() {
    const navigate = useNavigate();
    const { connectWallet, login, user } = useAuth();

    const [step, setStep] = useState('form'); // 'form' | 'connecting'
    const [form, setForm] = useState({ name: '', email: '' });
    const [errors, setErrors] = useState({});
    const [connectError, setConnectError] = useState(null);

    // Auto-redirect already-authenticated users
    useEffect(() => {
        if (user.isAuthenticated) navigate('/', { replace: true });
    }, [user.isAuthenticated, navigate]);

    const validate = () => {
        const errs = {};
        if (!form.name.trim()) errs.name = 'Full name is required.';
        if (!form.email.trim()) errs.email = 'Business email is required.';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email address.';
        return errs;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setErrors(errs); return; }

        setStep('connecting');
        setConnectError(null);

        const result = await connectWallet();
        if (result.success) {
            // Merge form data into the authenticated user
            login({ ...user, name: form.name, email: form.email, isAuthenticated: true });
            // Mark as first-time user so WelcomeModal shows
            localStorage.setItem('tradazone_onboarded', 'false');
            navigate('/', { replace: true });
        } else if (result.error === 'not_installed') {
            setConnectError('not_installed');
            setStep('form');
        } else {
            setConnectError('failed');
            setStep('form');
        }
    };

    const handleChange = (field) => (e) => {
        setForm(prev => ({ ...prev, [field]: e.target.value }));
        setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    return (
        <div className="min-h-screen lg:h-screen flex overflow-hidden">
            {/* ── Left Panel ── */}
            <div className="flex-1 flex flex-col justify-start px-6 py-8 lg:px-10 lg:py-6 bg-white lg:max-w-xl overflow-y-auto">
                {/* Logo */}
                <div className="mb-6 lg:mb-8">
                    <Logo variant="light" className="h-7 lg:h-9" />
                </div>

                <h1 className="text-2xl font-bold text-t-primary mb-1.5">Create your account</h1>
                <p className="text-sm text-t-muted mb-5">
                    Get started in seconds — no credit card required.
                </p>

                <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-medium text-t-secondary mb-1.5">Full name</label>
                        <div className={`flex items-center gap-2.5 px-3.5 py-2.5 border rounded-lg bg-white transition-colors min-h-[44px] ${errors.name ? 'border-red-400' : 'border-border focus-within:border-brand'}`}>
                            <User size={16} className="text-t-muted flex-shrink-0" />
                            <input
                                id="input-name"
                                type="text"
                                placeholder="Your name"
                                value={form.name}
                                onChange={handleChange('name')}
                                className="flex-1 outline-none text-base lg:text-sm bg-transparent text-t-primary placeholder:text-t-muted"
                            />
                        </div>
                        {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-medium text-t-secondary mb-1.5">Business email</label>
                        <div className={`flex items-center gap-2.5 px-3.5 py-2.5 border rounded-lg bg-white transition-colors min-h-[44px] ${errors.email ? 'border-red-400' : 'border-border focus-within:border-brand'}`}>
                            <Mail size={16} className="text-t-muted flex-shrink-0" />
                            <input
                                id="input-email"
                                type="email"
                                placeholder="you@company.com"
                                value={form.email}
                                onChange={handleChange('email')}
                                className="flex-1 outline-none text-base lg:text-sm bg-transparent text-t-primary placeholder:text-t-muted"
                                autoComplete="email"
                            />
                        </div>
                        {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email}</p>}
                    </div>

                    {/* Connect error */}
                    {connectError === 'not_installed' && (
                        <div className="flex items-start gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                            <span>
                                Argent wallet not found.{' '}
                                <a href="https://www.argent.xyz/argent-x/" target="_blank" rel="noopener noreferrer" className="underline font-medium inline-flex items-center gap-1">
                                    Install Argent <ExternalLink size={12} />
                                </a>
                            </span>
                        </div>
                    )}
                    {connectError === 'failed' && (
                        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                            <AlertCircle size={16} className="flex-shrink-0" />
                            <span>Connection cancelled. Please try again.</span>
                        </div>
                    )}

                    {/* Submit */}
                    <button
                        id="btn-create-account-submit"
                        type="submit"
                        disabled={step === 'connecting'}
                        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold hover:bg-brand-dark active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {step === 'connecting' ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Opening Argent…
                            </>
                        ) : (
                            <>Create Account &amp; Connect Wallet</>
                        )}
                    </button>
                </form>

                <p className="text-sm text-t-muted text-center mt-4">
                    Already have an account?{' '}
                    <Link to="/signin" className="text-brand font-semibold hover:underline">
                        Sign in →
                    </Link>
                </p>
            </div>

            {/* ── Right Panel — Illustration ── */}
            <div className="hidden lg:flex flex-1 items-center justify-center overflow-hidden">
                <img
                    src={illustration}
                    alt="Tradazone — invoices, payments, crypto"
                    className="w-full h-full object-cover object-center"
                />
            </div>
        </div>
    );
}

export default SignUp;
