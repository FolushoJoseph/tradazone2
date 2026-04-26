import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Copy, CheckCircle, AlertCircle, Clock, RefreshCw, ExternalLink } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { getPrice } from '../../services/priceService';
import { BlockchainMonitor } from '../../services/blockchainMonitor';
import {
    sendPaymentReceivedToSender,
    sendPaymentReceiptToCustomer,
} from '../../services/emailService';
import Logo from '../../components/ui/Logo';

// ─── Network → available currencies ──────────────────────────────────────────

const NETWORK_CURRENCIES = {
    ethereum: ['ETH', 'USDC'],
    starknet: ['STRK'],
    stellar: ['XLM', 'USDC'],
};

// ─── QR Code (lazy-loaded) ────────────────────────────────────────────────────

function QRCanvas({ address }) {
    const ref = useRef(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!address) return;
        let mounted = true;
        import('qrcode').then((mod) => {
            const QRCode = mod.default || mod;
            if (mounted && ref.current) {
                QRCode.toCanvas(ref.current, address, {
                    width: 160,
                    margin: 1,
                    color: { dark: '#1E293B', light: '#FFFFFF' },
                }).then(() => { if (mounted) setReady(true); }).catch(() => {});
            }
        });
        return () => { mounted = false; };
    }, [address]);

    return (
        <div className="flex items-center justify-center bg-white border border-border p-3">
            {!ready && (
                <div className="w-[160px] h-[160px] bg-page animate-pulse flex items-center justify-center">
                    <RefreshCw size={20} className="text-t-muted animate-spin" />
                </div>
            )}
            <canvas ref={ref} style={{ display: ready ? 'block' : 'none' }} />
        </div>
    );
}

// ─── Countdown timer ──────────────────────────────────────────────────────────

function Countdown({ seconds, onExpire }) {
    const [remaining, setRemaining] = useState(seconds);

    useEffect(() => {
        setRemaining(seconds);
    }, [seconds]);

    useEffect(() => {
        if (remaining <= 0) { onExpire?.(); return; }
        const t = setTimeout(() => setRemaining((r) => r - 1), 1000);
        return () => clearTimeout(t);
    }, [remaining, onExpire]);

    const pct = (remaining / seconds) * 100;
    const isUrgent = remaining <= 10;

    return (
        <div className="flex items-center gap-2">
            <Clock size={14} className={isUrgent ? 'text-warning' : 'text-t-muted'} />
            <span className={`text-xs font-medium tabular-nums ${isUrgent ? 'text-warning' : 'text-t-muted'}`}>
                Rate refreshes in {remaining}s
            </span>
            <div className="flex-1 h-1 bg-border overflow-hidden">
                <div
                    className={`h-full transition-all ${isUrgent ? 'bg-warning' : 'bg-brand'}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

// ─── Copy button ──────────────────────────────────────────────────────────────

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button
            onClick={copy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border hover:bg-gray-50 transition-colors text-t-secondary"
        >
            {copied ? <CheckCircle size={14} className="text-success" /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy'}
        </button>
    );
}

// ─── Main page ────────────────────────────────────────────────────────────────

function InvoicePayment() {
    const { invoiceId } = useParams();
    const { invoices, markInvoicePaid, updateInvoice } = useData();

    const invoice = invoices.find((inv) => inv.id === invoiceId);

    const network = invoice?.txNetwork || 'stellar';
    const availableCurrencies = NETWORK_CURRENCIES[network] || ['XLM'];

    const [selectedCurrency, setSelectedCurrency] = useState(availableCurrencies[0]);
    const [cryptoAmount, setCryptoAmount] = useState(null);
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [priceError, setPriceError] = useState(false);
    const [countdownKey, setCountdownKey] = useState(0);

    const [pollStatus, setPollStatus] = useState('idle'); // idle | polling | detected | error
    const [txDetails, setTxDetails] = useState(null);
    const [pollError, setPollError] = useState('');
    const monitorRef = useRef(null);

    // ── Price conversion ─────────────────────────────────────────────────────

    const fetchPrice = useCallback(async () => {
        if (!invoice) return;
        setLoadingPrice(true);
        setPriceError(false);

        const rawAmount = parseFloat(invoice.amount.replace(/,/g, '')) || 0;
        const price = await getPrice(selectedCurrency, 'usd');

        if (price) {
            const crypto = rawAmount / price;
            setCryptoAmount(isFinite(crypto) ? crypto.toFixed(6) : null);
        } else {
            setPriceError(true);
            setCryptoAmount(null);
        }
        setLoadingPrice(false);
        setCountdownKey((k) => k + 1);
    }, [invoice, selectedCurrency]);

    useEffect(() => { fetchPrice(); }, [fetchPrice]);

    // ── Blockchain polling ────────────────────────────────────────────────────

    useEffect(() => {
        if (!invoice?.paymentAddress || !cryptoAmount || invoice.status === 'paid') return;

        // Stop any existing monitor before starting a new one
        monitorRef.current?.stop();

        if (pollStatus === 'detected') return;

        setPollStatus('polling');
        const monitor = new BlockchainMonitor({
            network,
            merchantAddress: invoice.paymentAddress,
            expectedAmount: cryptoAmount,
            currency: selectedCurrency,
        });

        monitor.start(
            async (tx) => {
                setTxDetails(tx);
                setPollStatus('detected');
                markInvoicePaid(invoiceId, tx);

                // Fire payment emails
                await Promise.allSettled([
                    sendPaymentReceivedToSender(
                        { ...invoice, senderEmail: invoice.senderEmail, senderName: invoice.senderName },
                        tx
                    ),
                    sendPaymentReceiptToCustomer(
                        { ...invoice, customerEmail: invoice.customerEmail },
                        tx
                    ),
                ]);

                // Persist email status
                updateInvoice(invoiceId, { emailStatus: 'receipt_sent' });
            },
            (msg) => {
                setPollError(msg);
                setPollStatus('error');
            }
        );

        monitorRef.current = monitor;
        return () => monitor.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invoice?.paymentAddress, selectedCurrency, cryptoAmount, network]);

    // ── Early exits ──────────────────────────────────────────────────────────

    if (!invoice) {
        return (
            <div className="min-h-screen bg-page flex flex-col items-center justify-center px-4">
                <div className="bg-white border border-border p-8 max-w-sm w-full text-center">
                    <AlertCircle size={32} className="text-t-muted mx-auto mb-3" />
                    <h1 className="text-lg font-semibold text-t-primary mb-2">Invoice not found</h1>
                    <p className="text-sm text-t-muted">
                        This payment link may have expired or the invoice no longer exists.
                    </p>
                </div>
            </div>
        );
    }

    if (invoice.status === 'paid' || pollStatus === 'detected') {
        const tx = txDetails || { hash: invoice.txHash, amount: invoice.txAmount, currency: invoice.txCurrency, network: invoice.txNetwork };
        return (
            <div className="min-h-screen bg-page flex flex-col items-center justify-center px-4">
                {/* Branding */}
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-7 h-7 bg-brand flex items-center justify-center p-1">
                        <Logo variant="dark" className="w-full object-contain" />
                    </div>
                    <span className="text-sm font-bold text-brand">tradazone</span>
                </div>

                <div className="bg-white border border-border p-8 max-w-sm w-full text-center">
                    <div className="w-14 h-14 bg-success-bg flex items-center justify-center mx-auto mb-4">
                        <CheckCircle size={28} className="text-success" />
                    </div>
                    <h1 className="text-xl font-bold text-t-primary mb-2">Payment Confirmed</h1>
                    <p className="text-sm text-t-muted mb-6">
                        Thank you! Your payment for <strong>{invoice.id}</strong> has been received.
                    </p>
                    {tx?.hash && (
                        <div className="bg-page border border-border p-3 text-left mb-4">
                            <span className="block text-xs text-t-muted mb-1">Transaction</span>
                            <span className="text-xs font-mono break-all text-t-primary">{tx.hash}</span>
                            <div className="flex justify-between mt-2 text-xs text-t-muted">
                                <span>{tx.amount} {tx.currency}</span>
                                <span className="capitalize">{tx.network}</span>
                            </div>
                        </div>
                    )}
                    <p className="text-xs text-t-muted">A receipt has been sent to your email.</p>
                </div>
            </div>
        );
    }

    const rawAmount = parseFloat(invoice.amount.replace(/,/g, '')) || 0;

    return (
        <div className="min-h-screen bg-page">
            {/* Minimal header */}
            <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-brand flex items-center justify-center p-1">
                        <Logo variant="dark" className="w-full object-contain" />
                    </div>
                    <span className="text-sm font-bold text-brand">tradazone</span>
                </div>
                <span className="text-xs text-t-muted">Secure payment</span>
            </header>

            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-xl font-bold text-t-primary">Pay Invoice {invoice.id}</h1>
                    <p className="text-sm text-t-muted mt-1">
                        From <strong>{invoice.senderName || 'Tradazone'}</strong> · Due {invoice.dueDate}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ── Left: Invoice summary ── */}
                    <div className="flex flex-col gap-4">
                        <div className="bg-white border border-border p-5">
                            <h2 className="text-sm font-semibold text-t-primary mb-4 uppercase tracking-wide">
                                Invoice Summary
                            </h2>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="block text-xs text-t-muted mb-0.5">Billed to</span>
                                    <span className="text-sm font-medium text-t-primary">{invoice.customer}</span>
                                </div>
                                <div className="text-right">
                                    <span className="block text-xs text-t-muted mb-0.5">Amount due</span>
                                    <span className="text-lg font-bold text-brand">
                                        {invoice.amount} {invoice.currency}
                                    </span>
                                </div>
                            </div>

                            {/* Line items */}
                            <div className="border-t border-border pt-3">
                                {invoice.items.map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm py-1.5 border-b border-border last:border-b-0">
                                        <span className="text-t-secondary">{item.name} × {item.quantity}</span>
                                        <span className="font-medium text-t-primary">
                                            {(parseFloat(item.price) * item.quantity).toFixed(2)} {invoice.currency}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-between items-center mt-3 pt-3 border-t-2 border-t-primary">
                                <span className="text-sm font-semibold text-t-primary">Total</span>
                                <span className="text-sm font-bold text-brand">{invoice.amount} {invoice.currency}</span>
                            </div>
                        </div>

                        {/* Network info */}
                        <div className="bg-info-bg border border-info/20 p-4 text-sm text-info">
                            <strong>Network: </strong>
                            <span className="capitalize">{network}</span>
                            {invoice.paymentAddress && (
                                <span className="ml-2 text-xs opacity-80">
                                    · Send only on the {network} network
                                </span>
                            )}
                        </div>
                    </div>

                    {/* ── Right: Payment details ── */}
                    <div className="flex flex-col gap-4">
                        <div className="bg-white border border-border p-5">
                            <h2 className="text-sm font-semibold text-t-primary mb-4 uppercase tracking-wide">
                                Send Payment
                            </h2>

                            {/* Currency selector */}
                            <div className="mb-4">
                                <label className="block text-xs font-medium text-t-secondary uppercase tracking-wide mb-1.5">
                                    Currency
                                </label>
                                <div className="flex gap-2">
                                    {availableCurrencies.map((c) => (
                                        <button
                                            key={c}
                                            onClick={() => setSelectedCurrency(c)}
                                            className={`px-4 py-2 text-sm font-medium border transition-colors ${
                                                selectedCurrency === c
                                                    ? 'border-brand bg-brand-bg text-brand'
                                                    : 'border-border text-t-secondary hover:border-brand/30'
                                            }`}
                                        >
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Converted amount */}
                            <div className="bg-page border border-border p-4 mb-4">
                                <div className="flex justify-between items-baseline mb-2">
                                    <span className="text-xs text-t-muted uppercase tracking-wide">You send</span>
                                    {loadingPrice && (
                                        <span className="text-xs text-t-muted flex items-center gap-1">
                                            <RefreshCw size={11} className="animate-spin" /> Fetching rate…
                                        </span>
                                    )}
                                    {priceError && (
                                        <button onClick={fetchPrice} className="text-xs text-brand underline">Retry</button>
                                    )}
                                </div>
                                {cryptoAmount ? (
                                    <div>
                                        <span className="text-2xl font-bold text-t-primary tabular-nums">{cryptoAmount}</span>
                                        <span className="text-lg text-t-secondary ml-2">{selectedCurrency}</span>
                                        <div className="text-xs text-t-muted mt-1">
                                            ≈ ${rawAmount.toLocaleString()} USD
                                        </div>
                                    </div>
                                ) : !loadingPrice && (
                                    <span className="text-sm text-t-muted">
                                        {priceError ? 'Price unavailable — check your connection' : '—'}
                                    </span>
                                )}
                            </div>

                            {/* Rate countdown */}
                            {cryptoAmount && (
                                <div className="mb-4">
                                    <Countdown
                                        key={countdownKey}
                                        seconds={60}
                                        onExpire={fetchPrice}
                                    />
                                </div>
                            )}

                            {/* Wallet address */}
                            {invoice.paymentAddress ? (
                                <>
                                    <div className="mb-4">
                                        <label className="block text-xs font-medium text-t-secondary uppercase tracking-wide mb-1.5">
                                            Send to address
                                        </label>
                                        <div className="flex items-stretch border border-border">
                                            <div className="flex-1 px-3 py-2.5 bg-page font-mono text-xs text-t-primary break-all overflow-hidden">
                                                {invoice.paymentAddress}
                                            </div>
                                            <div className="border-l border-border flex items-center">
                                                <CopyButton text={invoice.paymentAddress} />
                                            </div>
                                        </div>
                                    </div>

                                    {/* QR code */}
                                    <div className="flex flex-col items-center gap-2 mb-4">
                                        <span className="text-xs text-t-muted">Scan to pay</span>
                                        <QRCanvas address={invoice.paymentAddress} />
                                    </div>
                                </>
                            ) : (
                                <div className="p-4 bg-warning-bg border border-warning/20 text-sm text-warning mb-4">
                                    Payment address not set. The merchant must send this invoice first.
                                </div>
                            )}

                            {/* Polling status banner */}
                            {pollStatus === 'polling' && (
                                <div className="flex items-center gap-2 p-3 bg-info-bg border border-info/20 text-sm text-info">
                                    <span className="w-3 h-3 border-2 border-info border-t-transparent rounded-full animate-spin flex-shrink-0" />
                                    Waiting for payment confirmation…
                                </div>
                            )}
                            {pollStatus === 'error' && (
                                <div className="flex items-start gap-2 p-3 bg-warning-bg border border-warning/20 text-sm text-warning">
                                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                                    <span>
                                        Monitoring paused ({pollError || 'RPC error'}). Payment will still be detected on refresh.
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Help note */}
                        <p className="text-xs text-t-muted text-center px-2">
                            Send the exact amount to the address above. Payments are verified on-chain.
                            Do not close this page until confirmation is shown.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default InvoicePayment;
