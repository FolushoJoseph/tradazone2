/**
 * DataContext.jsx
 *
 * ISSUE: #184 (Build size limits and monitoring for DataContext)
 * Category: DevOps & Infrastructure
 * Affected Area: DataContext
 * Description: Implements production build size limits and monitoring for DataContext.
 *   - DataContext is isolated into its own chunk (data-context) for size tracking
 *   - Build size budget: max 50KB for DataContext chunk (gzip: true)
 *   - CI pipeline includes bundle size check that fails if limits exceeded
 *
 * Size Limits:
 *   - DataContext chunk: 50KB max (gzip)
 *   - General chunks: 500KB max (gzip)
 *   - Total bundle: 1000KB max (gzip)
 *
 * Build Commands:
 *   - pnpm build        : Standard production build
 *   - pnpm size         : Run size-limit check
 *   - pnpm build:size  : Build and check sizes
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { dispatchWebhook, setWebhookUrl, getWebhookUrl } from '../services/webhook';
import { toUtcMidnightIso } from '../utils/date';

// ISSUE #123: Added bulk-delete functionality for items.

/**
 * DataContext - React Context for managing application data state
 * Handles customers, invoices, checkouts, and items with localStorage persistence
 * @readonly
 */
const DataContext = createContext(null);

/* ---------- localStorage helpers ---------- */
/**
 * localStorage keys for data persistence
 * @readonly
 * @enum {string}
 */
const KEYS = {
    customers: 'tradazone_customers',
    invoices: 'tradazone_invoices',
    checkouts: 'tradazone_checkouts',
    items: 'tradazone_items',
};



/**
 * Saves data to localStorage as JSON
 * @param {string} key - localStorage key
 * @param {*} data - Data to serialize and store
 */
function save(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

/* ---------- Provider ---------- */
/**
 * DataProvider - Main data management context for the application
 * Provides state and operations for customers, invoices, checkouts, and items
 * Persists all data to localStorage and dispatches webhooks on certain actions
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element}
 */
export function DataProvider({ children }) {
    // Clear persisted data once on mount so the app starts as a fresh new user
    // (avoid clearing on every render — that races with in-flight saves).
    useEffect(() => {
        localStorage.removeItem(KEYS.customers);
        localStorage.removeItem(KEYS.invoices);
        localStorage.removeItem(KEYS.checkouts);
        localStorage.removeItem(KEYS.items);
    }, []);

    const [customers, setCustomers] = useState([]);
    const [invoices, setInvoices] = useState([]);
    const [checkouts, setCheckouts] = useState([]);
    const [items, setItems] = useState([]);

    // Refs mirror state length so sequential IDs are always correct
    // even when multiple adds happen within the same render batch.
    const invoiceCountRef = useRef(0);
    const checkoutCountRef = useRef(0);

    // ---------- Customers ----------
    /**
     * Adds a new customer to the system
     * @param {Object} data - Customer data
     * @param {string} data.name - Customer name
     * @param {string} data.email - Customer email address
     * @param {string} [data.phone] - Customer phone number (optional)
     * @param {string} [data.address] - Customer address (optional)
     * @returns {Object} The created customer object with generated ID
     */
    const addCustomer = useCallback((data) => {
        const newCustomer = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            name: data.name,
            email: data.email,
            phone: data.phone || '',
            address: data.address || '',
            totalSpent: '0',
            currency: 'STRK',
            invoiceCount: 0,
            // ISSUE: Date parsing is inconsistent across timezones.
            // Previously we stored a date-only string via `toISOString().split('T')[0]`.
            // If any boundary later re-parses that date-only value using `new Date(value)`,
            // the day can shift depending on runtime timezone.
            // We now store a full ISO timestamp with explicit timezone (`Z`) to eliminate ambiguity.
            createdAt: new Date().toISOString(),
        };
        setCustomers((prev) => {
            const next = [...prev, newCustomer];
            save(KEYS.customers, next);
            return next;
        });
        return newCustomer;
    }, []);

    // ---------- Items ----------
    /**
     * Adds a new item/service to the catalog
     * @param {Object} data - Item data
     * @param {string} data.name - Item name
     * @param {string} [data.description] - Item description (optional)
     * @param {string} [data.type] - Item type: 'service' or 'product' (default: 'service')
     * @param {string|number} data.price - Item price
     * @param {string} [data.unit] - Unit of measurement (default: 'unit')
     * @returns {Object} The created item object with generated ID
     */
    const addItem = useCallback((data) => {
        const newItem = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
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

    /**
     * deleteItems — Bulk deletes multiple items/services by their IDs
     * @param {string[]} ids - Array of item IDs to delete
     * @returns {void}
     */
    const deleteItems = useCallback((ids) => {
        setItems((prev) => {
            const next = prev.filter((item) => !ids.includes(item.id));
            save(KEYS.items, next);
            return next;
        });
    }, []);

    // ---------- Invoices ----------
    /**
     * Creates a new invoice linked to a customer
     * Calculates total from items and persists to localStorage
     * @param {Object} data - Invoice data
     * @param {string} data.customerId - ID of the customer this invoice belongs to
     * @param {Array} data.items - Array of line items with itemId and quantity
     * @param {string} [data.dueDate] - Invoice due date
     * @returns {Object} The created invoice object with generated ID
     */
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
            const newInvoice = {
                id: `INV-${String(++invoiceCountRef.current).padStart(3, '0')}`,
                customer: customer ? customer.name : 'Unknown',
                customerId: data.customerId,
                amount: total.toLocaleString(),
                currency: 'STRK',
                status: 'pending',
                // Pin `dueDate` to UTC midnight for timezone-stable day semantics.
                dueDate: toUtcMidnightIso(data.dueDate),
                // Store full ISO timestamp (`Z`) to avoid day shifts.
                createdAt: new Date().toISOString(),
                items: resolvedItems,
            };
            setInvoices((prev) => {
                const next = [...prev, newInvoice];
                save(KEYS.invoices, next);
                return next;
            });
            return newInvoice;
        },
        [customers, items]
    );

    // ---------- Checkouts ----------
    /**
     * Creates a new checkout/payment request
     * Generates a unique checkout ID and creates a payment link
     * Dispatches 'checkout.created' webhook asynchronously
     * @param {Object} data - Checkout data
     * @param {string} data.title - Checkout title/description
     * @param {string|number} data.amount - Payment amount
     * @param {string} [data.currency] - Currency code (default: 'STRK')
     * @param {string} [data.description] - Additional description (optional)
     * @returns {Object} The created checkout object with generated ID and payment link
     */
    const addCheckout = useCallback(
        (data) => {
            const id = `CHK-${String(++checkoutCountRef.current).padStart(3, '0')}`;
            const newCheckout = {
                id,
                title: data.title,
                description: data.description || '',
                amount: data.amount,
                currency: data.currency || 'STRK',
                status: 'active',
                // Store full ISO timestamp (`Z`) to avoid day shifts.
                createdAt: new Date().toISOString(),
                paymentLink: `https://pay.tradazone.com/${id}`,
                views: 0,
                payments: 0,
            };
            setCheckouts((prev) => {
                const next = [...prev, newCheckout];
                save(KEYS.checkouts, next);
                return next;
            });
            // Fire checkout.created webhook (non-blocking)
            dispatchWebhook('checkout.created', {
                id: newCheckout.id,
                title: newCheckout.title,
                amount: newCheckout.amount,
                currency: newCheckout.currency,
                paymentLink: newCheckout.paymentLink,
            });
            return newCheckout;
        },
        []
    );

    /**
     * markCheckoutPaid — marks a checkout as paid, updates the linked customer's
     * totalSpent and invoiceCount, then fires the checkout.paid webhook.
     *
     * @param {string} checkoutId - ID of the checkout being paid
     * @param {string} customerId - ID of the customer who paid
     * @param {string} [walletType] - wallet type used for payment (e.g. 'starknet')
     */
    const markCheckoutPaid = useCallback(
        (checkoutId, customerId, walletType = '') => {
            // Compute the checkout snapshot up-front so totals/webhooks don't
            // depend on React state updater execution order.
            const paidCheckout = checkouts.find((c) => c.id === checkoutId);
            const added = parseFloat(paidCheckout?.amount || '0') || 0;

            setCheckouts((prev) => {
                const next = prev.map((c) =>
                    c.id === checkoutId
                        ? { ...c, status: 'paid', payments: c.payments + 1 }
                        : c
                );
                save(KEYS.checkouts, next);
                return next;
            });

            if (customerId) {
                setCustomers((prev) => {
                    const next = prev.map((c) => {
                        if (c.id !== customerId) return c;
                        const prevSpent = parseFloat(c.totalSpent.replace(/,/g, '')) || 0;
                        return {
                            ...c,
                            totalSpent: (prevSpent + added).toLocaleString(),
                            invoiceCount: c.invoiceCount + 1,
                        };
                    });
                    save(KEYS.customers, next);
                    return next;
                });
            }

            // Fire checkout.paid webhook (non-blocking)
            if (paidCheckout) {
                dispatchWebhook('checkout.paid', {
                    id: paidCheckout.id,
                    title: paidCheckout.title,
                    amount: paidCheckout.amount,
                    currency: paidCheckout.currency,
                    customerId,
                    walletType,
                });
            }
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
                deleteItems,
                addInvoice,
                addCheckout,
                markCheckoutPaid,
                setWebhookUrl,
                getWebhookUrl,
            }}
        >
            {children}
        </DataContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
/**
 * Custom hook to access DataContext state and operations
 * Must be used within a DataProvider component
 * @throws {Error} If used outside of DataProvider
 * @returns {Object} Context value containing state and functions
 */
export function useData() {
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error('useData must be used within a DataProvider');
    return ctx;
}
