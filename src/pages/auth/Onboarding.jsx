import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { IS_STAGING, APP_NAME } from '../../config/env';

const steps = [
    {
        title: 'Welcome to Tradazone',
        description: 'The easiest way to accept crypto payments for your business on Starknet or Stellar.',
        image: '🚀',
        ariaLabel: 'Getting started with Tradazone'
    },
    {
        title: 'Create Invoices',
        description: 'Generate professional invoices and send them to your customers with just a few clicks.',
        image: '📄',
        ariaLabel: 'Creating invoices'
    },
    {
        title: 'Accept Payments',
        description: 'Accept payments in STRK or XLM. Get paid instantly to your wallet.',
        image: '💳',
        ariaLabel: 'Accepting payments'
    },
    {
        title: 'Manage Your Business',
        description: 'Track customers, manage transactions, and grow your business with powerful tools.',
        image: '📊',
        ariaLabel: 'Managing business analytics'
    }
];

function Onboarding() {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);

    const handleNext = () => {
        if (currentStep < steps.length - 1) setCurrentStep(currentStep + 1);
        else navigate('/signin');
    };

    const handlePrev = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    return (
        <div className="min-h-screen bg-page flex flex-col items-center">
            {/* Staging banner */}
            {IS_STAGING && (
                <div
                    role="banner"
                    data-testid="staging-banner"
                    className="w-full bg-amber-400 text-amber-900 text-xs font-semibold text-center py-1.5 px-4"
                >
                    ⚠️ {APP_NAME} — STAGING ENVIRONMENT. Data is not real and may be reset at any time.
                </div>
            )}

            <div className="flex flex-1 items-center justify-center w-full p-6">
                <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-10 text-center">

                    {/* Header */}
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-2">
                            <span aria-hidden="true" className="text-xl">≡</span>
                            <span className="text-xl font-bold tracking-tight">tradazone</span>
                        </div>

                        <button
                            onClick={() => navigate('/signin')}
                            aria-label="Skip onboarding and go to sign in"
                            className="text-sm text-t-muted hover:text-brand transition-colors"
                        >
                            Skip
                        </button>
                    </div>

                    {/* Step content */}
                    <div className="py-10">
                        <div
                            role="img"
                            aria-label={steps[currentStep].ariaLabel}
                            className="text-6xl mb-6"
                        >
                            {steps[currentStep].image}
                        </div>

                        <h1 className="text-2xl font-bold text-t-primary mb-3">
                            {steps[currentStep].title}
                        </h1>

                        <p className="text-t-muted max-w-sm mx-auto">
                            {steps[currentStep].description}
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex flex-col items-center gap-6">

                        {/* Progress dots */}
                        <div className="flex gap-2" aria-label="Onboarding progress">
                            {steps.map((_, index) => (
                                <span
                                    key={index}
                                    aria-label={`Step ${index + 1} of ${steps.length}`}
                                    className={`w-2.5 h-2.5 rounded-full transition-colors ${
                                        index === currentStep
                                            ? 'bg-brand'
                                            : index < currentStep
                                            ? 'bg-brand/40'
                                            : 'bg-border'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3">
                            {currentStep > 0 && (
                                <button
                                    onClick={handlePrev}
                                    aria-label="Go to previous step"
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 text-sm font-semibold bg-white text-t-primary border border-border hover:bg-gray-50 active:scale-95 transition-all"
                                >
                                    <ArrowLeft size={18} aria-hidden="true" />
                                    Back
                                </button>
                            )}

                            <button
                                onClick={handleNext}
                                aria-label={
                                    currentStep === steps.length - 1
                                        ? 'Finish onboarding and get started'
                                        : 'Go to next step'
                                }
                                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 text-sm font-semibold bg-brand text-white hover:bg-brand-dark active:scale-95 transition-all"
                            >
                                {currentStep === steps.length - 1 ? (
                                    <>
                                        Get Started
                                        <Check size={18} aria-hidden="true" />
                                    </>
                                ) : (
                                    <>
                                        Next
                                        <ArrowRight size={18} aria-hidden="true" />
                                    </>
                                )}
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}

export default Onboarding;