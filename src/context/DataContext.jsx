import { createContext, useContext, useState, useCallback } from 'react';

const DataContext = createContext(null);

/* ---------- localStorage helpers ---------- */
const KEYS = {
    customers: 'tradazone_customers',
    invoices: 'tradazone_invoices',
    checkouts: 'tradazone_checkouts',
    items: 'tradazone_items',
};

function load(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

/* ---------- Provider ---------- */
export function DataProvider({ children }) {
    // Data persists across page loads so public payment links remain resolvable.
    // To reset demo state, use the "Reset Demo Data" button in Payment Settings.
    const [customers, setCustomers] = useState(() => load(KEYS.customers, []));
    const [invoices, setInvoices] = useState(() => load(KEYS.invoices, []));
    const [checkouts, setCheckouts] = useState(() => load(KEYS.checkouts, []));
    const [items, setItems] = useState(() => load(KEYS.items, []));

    // ---------- Customers ----------
    const addCustomer = useCallback((data) => {
        const newCustomer = {
            id: Date.now().toString(),
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            address: data.address || '',
            totalSpent: '0',
            currency: 'STRK',
            invoiceCount: 0,
            createdAt: new Date().toISOString().split('T')[0],
        };
        setCustomers((prev) => {
            const next = [...prev, newCustomer];
            save(KEYS.customers, next);
            return next;
        });
        return newCustomer;
    }, []);

    // ---------- Items ----------
    const addItem = useCallback((data) => {
        const newItem = {
            id: Date.now().toString(),
            name: data.name,
            description: data.description || '',
            type: data.type || 'service',
            price: data.price,
            currency: 'STRK',
            unit: data.unit || 'unit',
        };
        setItems((prev) => {
            const next = [...prev, newItem];
            save(KEYS.items, next);
            return next;
        });
        return newItem;
    }, []);

    // ---------- Invoices ----------
    const addInvoice = useCallback(
        (data) => {
            const customer = customers.find((c) => c.id === data.customerId);
            const resolvedItems = data.items.map((di) => {
                const found = items.find((i) => i.id === di.itemId);
                return {
                    name: found ? found.name : 'Custom Item',
                    quantity: parseInt(di.quantity, 10) || 1,
                    price: di.price || (found ? found.price : '0'),
                };
            });
            const total = resolvedItems.reduce(
                (sum, it) => sum + parseFloat(it.price) * it.quantity,
                0
            );
            const count = invoices.filter((i) => i.id.startsWith('INV-')).length;
            const newInvoice = {
                id: `INV-${String(count + 1).padStart(3, '0')}`,
                customer: customer ? customer.name : 'Unknown',
                customerId: data.customerId,
                customerEmail: customer?.email || '',
                amount: total.toLocaleString(),
                currency: 'STRK',
                // Lifecycle
                status: 'pending',
                sentAt: null,
                paidAt: null,
                emailStatus: null,
                // Payment
                paymentAddress: null,
                paymentLink: null,
                txHash: null,
                txNetwork: null,
                txAmount: null,
                txCurrency: null,
                // Meta
                senderName: null,
                senderEmail: null,
                dueDate: data.dueDate,
                createdAt: new Date().toISOString().split('T')[0],
                items: resolvedItems,
            };
            setInvoices((prev) => {
                const next = [...prev, newInvoice];
                save(KEYS.invoices, next);
                return next;
            });
            return newInvoice;
        },
        [customers, items, invoices]
    );

    // Generic single-invoice update — used by higher-level mutations
    const updateInvoice = useCallback((id, updates) => {
        setInvoices((prev) => {
            const next = prev.map((inv) =>
                inv.id === id ? { ...inv, ...updates } : inv
            );
            save(KEYS.invoices, next);
            return next;
        });
    }, []);

    // Mark invoice as sent; store payment routing information
    const sendInvoice = useCallback(
        (invoiceId, { senderName, senderEmail, paymentAddress, walletType }) => {
            const network =
                walletType === 'stellar'
                    ? 'stellar'
                    : walletType === 'starknet'
                    ? 'starknet'
                    : 'ethereum';

            const base = window.location.origin;
            const basename = import.meta.env.BASE_URL || '/Tradazone/';
            const paymentLink = `${base}${basename}pay/invoice/${invoiceId}`;

            const customer = customers.find(
                (c) => c.id === invoices.find((i) => i.id === invoiceId)?.customerId
            );

            updateInvoice(invoiceId, {
                status: 'sent',
                sentAt: new Date().toISOString(),
                paymentAddress,
                txNetwork: network,
                paymentLink,
                senderName,
                senderEmail,
                customerEmail: customer?.email || '',
                emailStatus: 'pending',
            });

            // Return enriched invoice for callers that need it immediately
            const base_inv = invoices.find((i) => i.id === invoiceId);
            return {
                ...base_inv,
                status: 'sent',
                paymentAddress,
                txNetwork: network,
                paymentLink,
                senderName,
                senderEmail,
                customerEmail: customer?.email || '',
            };
        },
        [invoices, customers, updateInvoice]
    );

    // Mark invoice as paid after on-chain confirmation
    const markInvoicePaid = useCallback(
        (invoiceId, txDetails) => {
            updateInvoice(invoiceId, {
                status: 'paid',
                paidAt: new Date().toISOString(),
                txHash: txDetails.hash,
                txNetwork: txDetails.network,
                txAmount: txDetails.amount,
                txCurrency: txDetails.currency,
            });
        },
        [updateInvoice]
    );

    // ---------- Checkouts ----------
    const addCheckout = useCallback(
        (data) => {
            const count = checkouts.filter((c) => c.id.startsWith('CHK-')).length;
            const newCheckout = {
                id: `CHK-${String(count + 1).padStart(3, '0')}`,
                title: data.title,
                description: data.description || '',
                amount: data.amount,
                currency: data.currency || 'STRK',
                status: 'active',
                createdAt: new Date().toISOString().split('T')[0],
                paymentLink: `https://pay.tradazone.com/CHK-${String(count + 1).padStart(3, '0')}`,
                views: 0,
                payments: 0,
            };
            setCheckouts((prev) => {
                const next = [...prev, newCheckout];
                save(KEYS.checkouts, next);
                return next;
            });
            return newCheckout;
        },
        [checkouts]
    );

    // Wipe all local data — useful for demo reset
    const resetDemoData = useCallback(() => {
        Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
        setCustomers([]);
        setInvoices([]);
        setCheckouts([]);
        setItems([]);
    }, []);

    return (
        <DataContext.Provider
            value={{
                customers,
                invoices,
                checkouts,
                items,
                transactions: [],
                dashboardStats: {
                    walletBalance: '0',
                    currency: 'STRK',
                    receivables: '0',
                    totalTransactions: 0,
                    totalCustomers: customers.length,
                },
                addCustomer,
                addItem,
                addInvoice,
                updateInvoice,
                sendInvoice,
                markInvoicePaid,
                addCheckout,
                resetDemoData,
            }}
        >
            {children}
        </DataContext.Provider>
    );
}

export function useData() {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error('useData must be used within a DataProvider');
    return ctx;
}
