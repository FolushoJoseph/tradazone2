import { useState } from 'react';
import { X, Send, CheckCircle, AlertCircle, Mail, Copy, ExternalLink } from 'lucide-react';
import Button from '../forms/Button';
import Input from '../forms/Input';
import { useData } from '../../context/DataContext';
import {
    sendInvoiceToCustomer,
    sendInvoiceConfirmationToSender,
} from '../../services/emailService';

// Follows the existing ConnectWalletModal pattern exactly:
// backdrop + bottom sheet on mobile, centered card on desktop.

function SendInvoiceModal({ isOpen, onClose, invoice, customer, user, wallet, walletType }) {
    const { sendInvoice, updateInvoice } = useData();

    const [customerEmail, setCustomerEmail] = useState(customer?.email || '');
    const [senderEmail, setSenderEmail] = useState(user?.email || '');
    const [phase, setPhase] = useState('idle'); // idle | loading | success | error
    const [errorMsg, setErrorMsg] = useState('');
    const [invoicePaymentLink, setInvoicePaymentLink] = useState('');

    if (!isOpen) return null;

    const isLoading = phase === 'loading';
    const isSuccess = phase === 'success';
    const isError = phase === 'error';

    async function handleSend(e) {
        e.preventDefault();
        if (!customerEmail.trim()) { setErrorMsg('Customer email is required.'); return; }
        if (!senderEmail.trim()) { setErrorMsg('Your email is required.'); return; }
        if (!wallet?.address) { setErrorMsg('No wallet connected. Connect a wallet in Settings → Payments.'); return; }

        setErrorMsg('');
        setPhase('loading');

        // 1. Update invoice state + build enriched record
        const enriched = sendInvoice(invoice.id, {
            senderName: user?.name || 'Tradazone',
            senderEmail,
            paymentAddress: wallet.address,
            walletType,
        });
        setInvoicePaymentLink(enriched.paymentLink || '');

        // Apply emails that may have been provided by the user in the form
        const invoiceForEmail = {
            ...enriched,
            customerEmail,
            senderEmail,
        };

        // 2. Send emails (parallel, both fire even if one fails)
        const [toCustomer, toSender] = await Promise.allSettled([
            sendInvoiceToCustomer(invoiceForEmail),
            sendInvoiceConfirmationToSender(invoiceForEmail),
        ]);

        const customerResult = toCustomer.status === 'fulfilled' ? toCustomer.value : { success: false, error: toCustomer.reason?.message };
        const senderResult = toSender.status === 'fulfilled' ? toSender.value : { success: false, error: toSender.reason?.message };

        // 3. Log email status back into the invoice
        const emailStatus = customerResult.success ? 'sent' : 'failed';
        updateInvoice(invoice.id, { emailStatus, customerEmail, senderEmail });

        // Customer email is the critical one — surface any failure immediately
        if (!customerResult.success) {
            const rawError = customerResult.error || '';
            const isNotConfigured = rawError.toLowerCase().includes('not configured') || rawError.toLowerCase().includes('env');
            setErrorMsg(
                isNotConfigured
                    ? rawError
                    : `Email delivery failed: "${rawError}". Check your EmailJS service ID, template ID, and that your template's "To Email" field uses {{to_email}}.`
            );
            setPhase('error');
            return;
        }

        setPhase('success');
    }

    function handleClose() {
        if (isLoading) return;
        setPhase('idle');
        setErrorMsg('');
        setInvoicePaymentLink('');
        onClose();
    }

    const networkLabel = {
        stellar: 'Stellar',
        starknet: 'Starknet',
        evm: 'Ethereum',
        ethereum: 'Ethereum',
    }[walletType] || walletType;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/40 z-50 backdrop-blur-sm transition-opacity"
                onClick={handleClose}
            />

            {/* Sheet — bottom on mobile, centered on desktop */}
            <div className="
                fixed z-50
                bottom-0 left-0 right-0
                lg:bottom-auto lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:w-full lg:max-w-md
                bg-white shadow-2xl flex flex-col max-h-[90vh] overflow-hidden
                animate-slide-up lg:animate-none
            ">
                {/* Drag handle (mobile only) */}
                <div className="lg:hidden w-10 h-1 bg-border rounded-full mx-auto my-3 flex-shrink-0" />

                <div className="flex-1 overflow-y-auto">
                    {/* Header */}
                    <div className="px-6 pt-2 pb-4 flex justify-between items-center border-b border-border/50 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <Mail size={18} className="text-brand" />
                            <span className="font-semibold text-t-primary">Send Invoice</span>
                        </div>
                        <button
                            onClick={handleClose}
                            disabled={isLoading}
                            className="text-t-muted hover:text-t-primary transition-colors disabled:opacity-50"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6">
                        {isSuccess ? (
                            /* ── Success state ── */
                            <div className="flex flex-col gap-4 py-2">
                                <div className="flex flex-col items-center gap-3 text-center">
                                    <div className="w-14 h-14 bg-success-bg flex items-center justify-center">
                                        <CheckCircle size={28} className="text-success" />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-semibold text-t-primary mb-1">Invoice Sent</h3>
                                        <p className="text-sm text-t-muted">
                                            {invoice.id} was emailed to <strong>{customerEmail}</strong>.
                                        </p>
                                    </div>
                                </div>
                                {/* Payment link fallback — always visible so it can be copy-pasted */}
                                {invoicePaymentLink && (
                                    <div className="bg-page border border-border p-3">
                                        <p className="text-xs text-t-muted mb-1.5">Payment link (share manually if needed)</p>
                                        <div className="flex items-stretch gap-0 border border-border">
                                            <span className="flex-1 px-2 py-1.5 text-xs font-mono text-t-primary bg-white truncate">{invoicePaymentLink}</span>
                                            <button
                                                onClick={() => navigator.clipboard.writeText(invoicePaymentLink)}
                                                className="px-2.5 border-l border-border text-t-muted hover:text-brand bg-page transition-colors"
                                            >
                                                <Copy size={13} />
                                            </button>
                                        </div>
                                    </div>
                                )}
                                <Button variant="primary" onClick={handleClose} className="w-full">Done</Button>
                            </div>
                        ) : (
                            /* ── Form ── */
                            <form onSubmit={handleSend}>
                                <h2 className="text-lg font-bold text-t-primary mb-1">
                                    Send {invoice.id}
                                </h2>
                                <p className="text-sm text-t-muted mb-6">
                                    Deliver this invoice by email with a secure payment link.
                                    Receiving wallet: <strong>{networkLabel}</strong>.
                                </p>

                                {/* Invoice summary strip */}
                                <div className="bg-page border border-border p-3 mb-5 flex justify-between items-center text-sm">
                                    <div>
                                        <span className="text-t-muted">To: </span>
                                        <span className="font-medium text-t-primary">{invoice.customer}</span>
                                    </div>
                                    <div className="font-semibold text-brand">
                                        {invoice.amount} {invoice.currency}
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <Input
                                        label="Customer email"
                                        type="email"
                                        value={customerEmail}
                                        onChange={(e) => setCustomerEmail(e.target.value)}
                                        placeholder="customer@email.com"
                                        required
                                        disabled={isLoading}
                                    />
                                    <Input
                                        label="Your email (confirmation copy)"
                                        type="email"
                                        value={senderEmail}
                                        onChange={(e) => setSenderEmail(e.target.value)}
                                        placeholder="you@business.com"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

                                {/* Wallet address preview */}
                                {wallet?.address && (
                                    <div className="mt-4 p-3 bg-brand-bg border border-brand/20 text-xs">
                                        <span className="text-t-muted">Payment address: </span>
                                        <span className="font-mono text-t-primary break-all">
                                            {wallet.address.slice(0, 20)}…{wallet.address.slice(-8)}
                                        </span>
                                    </div>
                                )}

                                {/* Error banner */}
                                {(isError || errorMsg) && (
                                    <div className="mt-4 flex flex-col gap-2">
                                        <div className="p-3 bg-error-bg border border-error/20 flex items-start gap-2 text-sm text-error">
                                            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                            <span>{errorMsg || 'Something went wrong. Please try again.'}</span>
                                        </div>
                                        {/* Show payment link so merchant can share it manually */}
                                        {invoicePaymentLink && (
                                            <div className="p-3 bg-page border border-border text-xs">
                                                <p className="text-t-muted mb-1">Invoice is marked as Sent. Share this payment link manually:</p>
                                                <div className="flex items-stretch gap-0 border border-border">
                                                    <span className="flex-1 px-2 py-1.5 font-mono text-t-primary bg-white truncate">{invoicePaymentLink}</span>
                                                    <button
                                                        onClick={() => navigator.clipboard.writeText(invoicePaymentLink)}
                                                        className="px-2.5 border-l border-border text-t-muted hover:text-brand bg-page transition-colors"
                                                    >
                                                        <Copy size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="flex gap-3 mt-6">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        onClick={handleClose}
                                        disabled={isLoading}
                                        className="flex-1"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="primary"
                                        icon={Send}
                                        loading={isLoading}
                                        disabled={isLoading}
                                        className="flex-1"
                                    >
                                        {isLoading ? 'Sending…' : 'Send Invoice'}
                                    </Button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

export default SendInvoiceModal;
