import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const TEMPLATE_INVOICE = import.meta.env.VITE_EMAILJS_TEMPLATE_INVOICE;
const TEMPLATE_RECEIPT = import.meta.env.VITE_EMAILJS_TEMPLATE_RECEIPT;

let _initialized = false;

// @emailjs/browser v4 requires { publicKey } object — v3 string form no longer works
function ensureInit() {
    if (!_initialized && PUBLIC_KEY) {
        emailjs.init({ publicKey: PUBLIC_KEY });
        _initialized = true;
    }
}

async function sendWithRetry(templateId, params, maxRetries = 2) {
    ensureInit();

    if (!SERVICE_ID || !PUBLIC_KEY || !templateId) {
        const msg = 'EmailJS not configured — set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_PUBLIC_KEY, and template IDs in your .env.local file.';
        console.error('[emailService]', msg, { SERVICE_ID: !!SERVICE_ID, PUBLIC_KEY: !!PUBLIC_KEY, templateId });
        return { success: false, error: msg };
    }

    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Pass publicKey as 4th arg (v4 belt-and-suspenders — works with or without init)
            await emailjs.send(SERVICE_ID, templateId, params, { publicKey: PUBLIC_KEY });
            console.info('[emailService] sent', templateId, 'to', params.to_email);
            return { success: true };
        } catch (err) {
            lastError = err;
            // EmailJS v4 error is an object: { status, text }
            const detail = err?.text || err?.message || JSON.stringify(err) || String(err);
            console.error(`[emailService] attempt ${attempt + 1} failed (status ${err?.status ?? '?'}):`, detail);
            if (attempt < maxRetries) {
                await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
            }
        }
    }
    // Build a human-readable string that includes the HTTP status code when available
    const status = lastError?.status ? `HTTP ${lastError.status}: ` : '';
    const errorText = `${status}${lastError?.text || lastError?.message || String(lastError) || 'Email send failed'}`;
    return { success: false, error: errorText };
}

// Send invoice to customer with payment link
export async function sendInvoiceToCustomer(invoice) {
    return sendWithRetry(TEMPLATE_INVOICE, {
        to_name: invoice.customer,
        to_email: invoice.customerEmail,
        invoice_id: invoice.id,
        invoice_amount: invoice.amount,
        invoice_currency: invoice.currency,
        invoice_due_date: invoice.dueDate,
        payment_link: invoice.paymentLink || '',
        sender_name: invoice.senderName || 'Tradazone',
        item_description: invoice.items?.[0]?.name || 'Design',
    });
}

// Send copy of sent invoice back to the merchant
export async function sendInvoiceConfirmationToSender(invoice) {
    return sendWithRetry(TEMPLATE_INVOICE, {
        to_name: invoice.senderName || 'Tradazone',
        to_email: invoice.senderEmail,
        invoice_id: invoice.id,
        invoice_customer: invoice.customer,
        invoice_amount: invoice.amount,
        invoice_currency: invoice.currency,
        invoice_due_date: invoice.dueDate,
        payment_link: invoice.paymentLink || '',
        sender_name: invoice.senderName || 'Tradazone',
        item_description: invoice.items?.[0]?.name || 'Design',
    });
}

// Notify merchant that payment was received
export async function sendPaymentReceivedToSender(invoice, tx) {
    return sendWithRetry(TEMPLATE_RECEIPT, {
        to_name: invoice.senderName || 'Tradazone',
        to_email: invoice.senderEmail,
        invoice_id: invoice.id,
        invoice_customer: invoice.customer,
        tx_hash: tx.hash,
        tx_amount: tx.amount,
        tx_currency: tx.currency,
        tx_network: tx.network,
        paid_at: new Date().toLocaleString(),
    });
}

// Send payment receipt to customer
export async function sendPaymentReceiptToCustomer(invoice, tx) {
    return sendWithRetry(TEMPLATE_RECEIPT, {
        to_name: invoice.customer,
        to_email: invoice.customerEmail,
        invoice_id: invoice.id,
        tx_hash: tx.hash,
        tx_amount: tx.amount,
        tx_currency: tx.currency,
        tx_network: tx.network,
        paid_at: new Date().toLocaleString(),
        sender_name: invoice.senderName || 'Tradazone',
    });
}
