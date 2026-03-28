import { useNavigate } from 'react-router-dom';

/**
 * Reusable empty state component for list pages.
 * * ISSUE #134: Support dark mode themes in CustomerList.
 * Added 'dark:' variants for background, icon container, and text.
 */
function EmptyState({ icon: Icon, title, description, actionLabel, actionPath }) {
    const navigate = useNavigate();

    return (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center transition-colors">
            {/* Icon Container: Added dark background and adjusted brand opacity */}
            <div className="w-16 h-16 rounded-2xl bg-brand/10 dark:bg-zinc-900 flex items-center justify-center mb-5">
                {Icon && (
                    <Icon 
                        size={28} 
                        className="text-brand/60 dark:text-brand/80" 
                        strokeWidth={1.5} 
                    />
                )}
            </div>

            {/* Title: Adjusted for dark mode contrast */}
            <h3 className="text-base font-semibold text-t-primary dark:text-zinc-100 mb-2">
                {title}
            </h3>

            {/* Description: Adjusted for muted dark mode text */}
            <p className="text-sm text-t-muted dark:text-zinc-500 max-w-xs mb-6">
                {description}
            </p>

            {actionLabel && actionPath && (
                <button
                    onClick={() => navigate(actionPath)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold hover:bg-brand-dark active:scale-95 transition-all shadow-sm shadow-brand/20"
                >
                    {actionLabel}
                </button>
            )}
        </div>
    );
}

export default EmptyState;