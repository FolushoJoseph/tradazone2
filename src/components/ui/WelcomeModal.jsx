import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Users, ShoppingCart, X } from 'lucide-react';
import Logo from './Logo';

const ONBOARDED_KEY = 'tradazone_onboarded';

function WelcomeModal() {
    const navigate = useNavigate();
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onboarded = localStorage.getItem(ONBOARDED_KEY);
        if (onboarded === null || onboarded === 'false') {
            setVisible(true);
        }
    }, []);

    const dismiss = () => {
        localStorage.setItem(ONBOARDED_KEY, 'true');
        setVisible(false);
    };

    const goTo = (path) => {
        dismiss();
        navigate(path);
    };

    if (!visible) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
                onClick={dismiss}
            />

            {/*
             * Mobile: slides up from bottom (bottom-sheet pattern)
             * Desktop: centred modal
             */}
            <div className="
                fixed z-50
                /* Mobile — bottom sheet */
                bottom-0 left-0 right-0
                /* Desktop — centred modal */
                lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md
                bg-white shadow-2xl p-6 lg:p-8
                animate-slide-up lg:animate-none
            ">
                {/* Drag handle — mobile only */}
                <div className="lg:hidden w-10 h-1 bg-border mx-auto mb-4" />

                {/* Close */}
                <button
                    onClick={dismiss}
                    className="absolute top-4 right-4 text-t-muted hover:text-t-primary transition-colors"
                    aria-label="Close"
                >
                    <X size={20} />
                </button>

                {/* Header */}
                <div className="mb-5 lg:mb-6 text-center">
                    <div className="w-12 h-12 bg-brand/10 rounded-full flex items-center justify-center mx-auto mb-3 lg:mb-4">
                        <Logo variant="light" className="h-5" />
                    </div>
                    <h2 className="text-lg lg:text-xl font-bold text-t-primary mb-1">You're all set!</h2>
                    <p className="text-sm text-t-muted">What would you like to do first?</p>
                </div>

                {/* Quick action tiles */}
                <div className="grid grid-cols-3 gap-3 mb-5 lg:mb-6">
                    {[
                        { icon: FileText, label: 'Create Invoice', path: '/invoices/create', color: 'bg-blue-50 text-brand' },
                        { icon: Users, label: 'Add Customer', path: '/customers/add', color: 'bg-purple-50 text-purple-600' },
                        { icon: ShoppingCart, label: 'New Checkout', path: '/checkout/create', color: 'bg-orange-50 text-accent-orange' },
                    ].map((action) => (
                        <button
                            key={action.label}
                            onClick={() => goTo(action.path)}
                            className="flex flex-col items-center gap-2 lg:gap-2.5 p-3 lg:p-4 rounded-xl border border-border hover:border-brand/40 active:scale-95 hover:bg-brand/5 transition-all group min-h-[44px]"
                        >
                            <div className={`w-9 h-9 lg:w-10 lg:h-10 rounded-lg ${action.color} flex items-center justify-center`}>
                                <action.icon size={17} />
                            </div>
                            <span className="text-[11px] lg:text-xs font-medium text-t-secondary group-hover:text-brand text-center leading-tight">
                                {action.label}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Skip */}
                <button
                    onClick={dismiss}
                    className="w-full text-sm text-t-muted hover:text-t-primary transition-colors py-2 min-h-[44px]"
                >
                    Skip for now
                </button>
            </div>
        </>
    );
}

export default WelcomeModal;
