import Logo from '../ui/Logo';

function InvoiceFooter({ notes = '', paymentLink = '' }) {
    return (
        <>
            {/* Notes + Payment Section */}
            <div className="flex justify-between items-start border-t border-gray-200 pt-6 pb-16">
                <div>
                    <h3 className="text-sm font-bold text-t-primary mb-1">Notes</h3>
                    <p className="text-sm text-t-muted">{notes || 'Sender'}</p>
                </div>

                <div className="text-right">
                    <p className="text-sm font-semibold text-t-primary mb-2">Pay for the service</p>
                    <a
                        href={paymentLink || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 h-10 bg-brand text-white text-sm font-semibold no-underline"
                    >
                        <Logo variant="dark" className="w-3 h-3" />
                        Payment Checkout
                    </a>
                </div>
            </div>

            {/* Bottom Branding */}
            <div className="flex items-center justify-between mt-auto pt-8">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand rounded flex items-center justify-center p-1">
                        <Logo variant="dark" className="w-full object-contain" />
                    </div>
                    <span className="text-sm font-bold text-brand">tradazone</span>
                </div>
                <span className="text-sm text-t-secondary">Tradazone.com</span>
            </div>
        </>
    );
}

export default InvoiceFooter;
