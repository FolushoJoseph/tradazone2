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
    // Clear persisted data so the app starts as a fresh new user
    localStorage.removeItem(KEYS.customers);
    localStorage.removeItem(KEYS.invoices);
    localStorage.removeItem(KEYS.checkouts);
    localStorage.removeItem(KEYS.items);

    const [customers, setCustomers] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [checkouts, setCheckouts] = useState([]);
    const [items, setItems] = useState([]);

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
                amount: total.toLocaleString(),
                currency: 'STRK',
                status: 'pending',
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

    return (
        <DataContext.Provider
            value={{
                customers,
                invoices,
                checkouts,
                items,
                transactions: [],
                dashboardStats: { walletBalance: '0', currency: 'STRK', receivables: '0', totalTransactions: 0, totalCustomers: 0 },
                addCustomer,
                addItem,
                addInvoice,
                addCheckout,
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
