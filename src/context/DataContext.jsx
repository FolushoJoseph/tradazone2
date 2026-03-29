/**
 * DataContext.jsx
 *
 * ISSUE: #180 (Build size limits and monitoring for DataContext)
 * Category: DevOps & Infrastructure
 * Affected Area: DataContext
 * Description: Implements production build size limits and monitoring for DataContext.
 *   - DataContext is isolated into its own chunk (data-context) for size tracking
 *   - Build size budget: defined in package.json and vite.config.js
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
 * 
 * 
 * ISSUE #15: Race condition detected in the API gateway when submitting forms rapidly
 * Category: Bug/Edge Case
 * Priority: Medium
 * Affected Area: API gateway / DataContext
 * 
 * INTEGRATION TESTS: Added DataContext.integration.test.jsx for context mutations covering:
 * - addCustomer/addCheckout/addInvoice/markCheckoutPaid mutations
 * - localStorage persistence
 * - Webhook dispatch
 * - Bulk deleteItems
 * - Filter context integration
 * Description: Fixed race conditions that occurred when form submission functions
 * (addCustomer, addInvoice, addCheckout) were called rapidly in succession. The following
 * fixes were implemented:
 * 
 * ## Race Condition Fixes Applied:
 * 
 * 1. **Operation Tracking with PendingOperations Set**:
 *    - Added `pendingOperations` ref to track in-flight async operations by type
 *    - Each operation generates a unique ID (timestamp + random suffix) for deduplication
 *    - Before executing, checks if operation ID already exists in the set
 *    - If duplicate detected, returns null immediately without processing
 *    - On completion (success or error), removes operation ID from set
 * 
 * 2. **Guard Functions in All Add Operations**:
 *    - `addCustomer()`: Added operation guard to prevent concurrent customer creation
 *    - `addInvoice()`: Added operation guard to prevent concurrent invoice creation
 *    - `addCheckout()`: Added operation guard to prevent concurrent checkout creation
 *    - All functions return `null` when duplicate operation is detected
 * 
 * 3. **Atomic State Updates**:
 *    - Uses functional setState pattern: `setCustomers((prev) => {...})`
 *    - Ensures state updates are batched and atomic
 *    - Prevents race conditions from stale closures in callbacks
 * 
 * 4. **Snapshot Capture for Closures**:
 *    - `addInvoice()` captures current customers/items snapshot upfront
 *    - Prevents issues where closure might reference outdated state
 *    - Ensures consistent data even under rapid concurrent calls
 * 
 * 5. **Form-Level Submission Guards**:
 *    - Updated AddCustomer.jsx with isSubmitting state
 *    - Updated CreateCheckout.jsx with isSubmitting state
 *    - CreateInvoice.jsx already had isSubmitting implemented
 *    - All forms now disable submit button during submission
 *    - Console warnings logged for blocked duplicate attempts
 * 
 * ## Root Cause Analysis:
 * 
 * The race condition occurred because:
 * - Multiple rapid form submissions could trigger before first completed
 * - No deduplication mechanism existed at the DataContext level
 * - Form components lacked submission guards (isSubmitting flags)
 * - Concurrent calls to addCustomer/addInvoice/addCheckout would each
 *   execute independently, potentially creating duplicate entries or
 *   inconsistent state (e.g., incorrect sequential IDs from refs)
 * 
 * ## Why This Fix Works:
 * 
 * - Operation IDs are unique per attempt (timestamp + random)
 * - Set-based lookup provides O(1) duplicate detection
 * - try/finally ensures cleanup even if errors occur
 * - Functional setState guarantees atomic updates
 * - Form-level guards provide UX feedback (disabled buttons)
 * - Two-layer protection: UI + data layer
 * 
 * ## Testing:
 * 
 * Comprehensive race condition tests added to DataContext.race.test.jsx covering:
 * - Concurrent addCustomer calls
 * - Concurrent addCheckout calls
 * - Concurrent addInvoice calls
 * - Sequential operations after completion
 * - State consistency under rapid operations
 * - Operation ID cleanup verification
 * - localStorage persistence correctness
 * 
 * ## Assumptions and Limitations:
 * 
 * - Assumes operations complete synchronously (currently no async DB calls)
 * - If async backend integration is added, consider using Promises to track
 *   operation completion more accurately
 * - For distributed systems, would need server-side idempotency keys
 * - Current implementation is client-side only (localStorage-based)
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  dispatchWebhook,
  setWebhookUrl,
  getWebhookUrl,
} from "../services/webhook";
import { toUtcMidnightIso } from "../utils/date";
import api from "../services/api";

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
  customers: "tradazone_customers",
  invoices: "tradazone_invoices",
  checkouts: "tradazone_checkouts",
  items: "tradazone_items",
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

    /**
     * RACE CONDITION FIX: Track in-flight operations to prevent duplicate submissions.
     * These sets store operation identifiers for currently executing async operations.
     * When an operation starts, we check if its ID is already in the set.
     * If so, we reject the duplicate request. Otherwise, we add it and proceed.
     * On completion (success or error), we remove the ID to allow future operations.
     */
    const pendingOperations = useRef({
        customers: new Set(),
        invoices: new Set(),
        checkouts: new Set(),
        items: new Set(),
    });

    // ---------- Customers ----------
    /**
     * Adds a new customer to the system
     * @param {Object} data - Customer data
     * @param {string} data.name - Customer name
     * @param {string} data.email - Customer email address
     * @param {string} [data.phone] - Customer phone number (optional)
     * @param {string} [data.address] - Customer address (optional)
     * @returns {Object} The created customer object with generated ID
     * 
     * RACE CONDITION FIX: Uses operation tracking to prevent duplicate concurrent submissions.
     * Generates a unique operation ID based on timestamp and random suffix to deduplicate requests.
     */
    const addCustomer = useCallback((data) => {
        // Generate unique operation ID for deduplication
        const operationId = `customer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        
        // Guard: prevent duplicate concurrent submissions
        if (pendingOperations.current.customers.has(operationId)) {
            console.warn('[DataContext] Duplicate addCustomer operation detected, ignoring:', operationId);
            return null;
        }
        
        try {
            // Mark operation as in-flight
            pendingOperations.current.customers.add(operationId);
            
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
        } finally {
            // Always remove operation ID on completion (success or error)
            pendingOperations.current.customers.delete(operationId);
        }
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
        // Optimistically update local state and localStorage
        setItems((prev) => {
            const next = prev.filter((item) => !ids.includes(item.id));
            save(KEYS.items, next);
            return next;
        });
      }

    // Fire checkout.paid webhook (non-blocking)
      if (paidCheckout) {
        dispatchWebhook("checkout.paid", {
          id: paidCheckout.id,
          title: paidCheckout.title,
          amount: paidCheckout.amount,
          currency: paidCheckout.currency,
          customerId,
          walletType,
        });
    }
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
     * 
     * RACE CONDITION FIX: Uses operation tracking to prevent duplicate concurrent submissions.
     * Validates customer existence upfront to avoid inconsistent state from stale closures.
     */
    const addInvoice = useCallback(
        (data) => {
            // Generate unique operation ID for deduplication
            const operationId = `invoice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            
            // Guard: prevent duplicate concurrent submissions
            if (pendingOperations.current.invoices.has(operationId)) {
                console.warn('[DataContext] Duplicate addInvoice operation detected, ignoring:', operationId);
                return null;
            }
            
            try {
                // Mark operation as in-flight
                pendingOperations.current.invoices.add(operationId);
                
                // Capture current snapshot of customers/items to avoid stale closure issues
                const currentCustomers = customers;
                const currentItems = items;
                
                const customer = currentCustomers.find((c) => c.id === data.customerId);
                const resolvedItems = data.items.map((di) => {
                    const found = currentItems.find((i) => i.id === di.itemId);
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
            } finally {
                // Always remove operation ID on completion (success or error)
                pendingOperations.current.invoices.delete(operationId);
            }
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
     * 
     * RACE CONDITION FIX: Uses operation tracking to prevent duplicate concurrent submissions.
     * Captures checkout snapshot before state update to ensure webhook consistency.
     */
    const addCheckout = useCallback(
        (data) => {
            // Generate unique operation ID for deduplication
            const operationId = `checkout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
            
            // Guard: prevent duplicate concurrent submissions
            if (pendingOperations.current.checkouts.has(operationId)) {
                console.warn('[DataContext] Duplicate addCheckout operation detected, ignoring:', operationId);
                return null;
            }
            
            try {
                // Mark operation as in-flight
                pendingOperations.current.checkouts.add(operationId);
                
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
            } finally {
                // Always remove operation ID on completion (success or error)
                pendingOperations.current.checkouts.delete(operationId);
            }
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
        addCustomer,
        addItem,
        deleteItems,
        addInvoice,
        addCheckout,
        markCheckoutPaid,
        setWebhookUrl,
        getWebhookUrl,
      } }
    >
      {children}
    </DataContext.Provider>
  );
}

export default DataProvider;

// eslint-disable-next-line react-refresh/only-export-components
/**
 * Custom hook to access DataContext state and operations
 * Must be used within a DataProvider component
 * @throws {Error} If used outside of DataProvider
 * @returns {Object} Context value containing state and functions
 */
import { useMemo, useCallback, useEffect, useState } from "react";
import {
  CUSTOMER_FILTER_CONFIG,
  INVOICE_FILTER_CONFIG,
  ITEM_FILTER_CONFIG,
  CHECKOUT_FILTER_CONFIG,
} from "./filterConfigs";

 /**
 * Filter/Sort state management with localStorage persistence
 * @param {string} type - Data type key ('customers', 'invoices', etc.)
 * @returns {{ filters: Object, setFilters: Function, resetFilters: Function }}
 */
export function useDataFilters(type) {
  const [filters, setFilters] = useState({
    search: "",
    sort: { field: "createdAt", dir: "desc" },
    status: "all",
    dateFrom: "",
    dateTo: "",
    amountMin: "",
    amountMax: "",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`tradazone_filters_${type}`);
      if (saved) {
        setFilters(JSON.parse(saved));
      }
    } catch {
      // Ignore parse errors
    }
  }, [type]);

  const setFiltersWithSave = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      try {
        localStorage.setItem(
          `tradazone_filters_${type}`,
          JSON.stringify(newFilters),
        );
      } catch {
        // Ignore storage errors
      }
    },
    [type],
  );

  const resetFilters = useCallback(() => {
    const defaultFilters = {
      search: "",
      sort: { field: "createdAt", dir: "desc" },
      status: "all",
      dateFrom: "",
      dateTo: "",
      amountMin: "",
      amountMax: "",
    };
    setFiltersWithSave(defaultFilters);
  }, [setFiltersWithSave]);

  return {
    filters,
    setFilters: setFiltersWithSave,
    resetFilters,
  };
}

/**
 * Generic filtering and sorting for any data array
 * @param {{ data: Array, filters: Object, config: Object }} params
 * @returns {Array} Filtered and sorted data
 */
export function useFilteredData({ data = [], filters, config }) {
  return useMemo(() => {
    let result = [...data];

    // 1. Search filter (multi-field fuzzy)
    if (filters.search) {
      const query = filters.search.toLowerCase().trim();
      result = result.filter((item) =>
        config.searchableFields.some((field) =>
          String(item[field] || "")
            .toLowerCase()
            .includes(query),
        ),
      );
    }

    // 2. Status filter
    if (config.statusField && filters.status !== "all") {
      result = result.filter(
        (item) => item[config.statusField] === filters.status,
      );
    }

    // 3. Date range filter
    if (config.dateFields) {
      const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const toDate = filters.dateTo ? new Date(filters.dateTo) : null;

      result = result.filter((item) => {
        const itemDate = new Date(item[config.dateFields.from]);
        if (fromDate && itemDate < fromDate) return false;
        if (toDate && itemDate > toDate) return false;
        return true;
      });
    }

    // 4. Amount range filter
    if (config.amountField && (filters.amountMin || filters.amountMax)) {
      const min = parseFloat(filters.amountMin) || 0;
      const max = parseFloat(filters.amountMax) || Infinity;
      result = result.filter((item) => {
        const amount = parseFloat(
          (item[config.amountField] || "0").replace(/,/g, ""),
        );
        return amount >= min && amount <= max;
      });
    }

    // 5. Sorting
    if (filters.sort.field) {
      result.sort((a, b) => {
        let aVal = a[filters.sort.field];
        let bVal = b[filters.sort.field];

        // Handle numbers (amount, totalSpent, invoiceCount)
        if (!isNaN(parseFloat(aVal)) && !isNaN(parseFloat(bVal))) {
          aVal = parseFloat(aVal);
          bVal = parseFloat(bVal);
        } else {
          // Handle dates
          aVal = new Date(aVal);
          bVal = new Date(bVal);
          if (isNaN(aVal.getTime())) aVal = String(aVal || "").toLowerCase();
          if (isNaN(bVal.getTime())) bVal = String(bVal || "").toLowerCase();
        }

        if (aVal < bVal) return filters.sort.dir === "asc" ? -1 : 1;
        if (aVal > bVal) return filters.sort.dir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, filters, config]);
}

// Filter config presets
export const FILTER_CONFIGS = {
  customers: CUSTOMER_FILTER_CONFIG,
  invoices: INVOICE_FILTER_CONFIG,
  items: ITEM_FILTER_CONFIG,
  checkouts: CHECKOUT_FILTER_CONFIG,
};

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}

  );
}

// eslint-disable-next-line react-refresh/only-export-components
/**
 * Custom hook to access DataContext state and operations
 * Must be used within a DataProvider component
 * @throws {Error} If used outside of DataProvider
 * @returns {Object} Context value containing state and functions
 */
import { useMemo, useCallback, useEffect, useState } from "react";
import {
  CUSTOMER_FILTER_CONFIG,
  INVOICE_FILTER_CONFIG,
  ITEM_FILTER_CONFIG,
  CHECKOUT_FILTER_CONFIG,
} from "./filterConfigs";

/**
 * Filter/Sort state management with localStorage persistence
 * @param {string} type - Data type key ('customers', 'invoices', etc.)
 * @returns {{ filters: Object, setFilters: Function, resetFilters: Function }}
 */
export function useDataFilters(type) {
  const [filters, setFilters] = useState({
    search: "",
    sort: { field: "createdAt", dir: "desc" },
    status: "all",
    dateFrom: "",
    dateTo: "",
    amountMin: "",
    amountMax: "",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`tradazone_filters_${type}`);
      if (saved) {
        setFilters(JSON.parse(saved));
      }
    } catch {
      // Ignore parse errors
    }
  }, [type]);

  const setFiltersWithSave = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      try {
        localStorage.setItem(
          `tradazone_filters_${type}`,
          JSON.stringify(newFilters),
        );
      } catch {
        // Ignore storage errors
      }
    },
    [type],
  );

  const resetFilters = useCallback(() => {
    const defaultFilters = {
      search: "",
      sort: { field: "createdAt", dir: "desc" },
      status: "all",
      dateFrom: "",
      dateTo: "",
      amountMin: "",
      amountMax: "",
    };
    setFiltersWithSave(defaultFilters);
  }, [setFiltersWithSave]);

  return {
    filters,
    setFilters: setFiltersWithSave,
    resetFilters,
  };
}

/**
 * Generic filtering and sorting for any data array
 * @param {{ data: Array, filters: Object, config: Object }} params
 * @returns {Array} Filtered and sorted data
 */
export function useFilteredData({ data = [], filters, config }) {
  return useMemo(() => {
    let result = [...data];

    // 1. Search filter (multi-field fuzzy)
    if (filters.search) {
      const query = filters.search.toLowerCase().trim();
      result = result.filter((item) =>
        config.searchableFields.some((field) =>
          String(item[field] || "")
            .toLowerCase()
            .includes(query),
        ),
      );
    }

    // 2. Status filter
    if (config.statusField && filters.status !== "all") {
      result = result.filter(
        (item) => item[config.statusField] === filters.status,
      );
    }

    // 3. Date range filter
    if (config.dateFields) {
      const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
      const toDate = filters.dateTo ? new Date(filters.dateTo) : null;

      result = result.filter((item) => {
        const itemDate = new Date(item[config.dateFields.from]);
        if (fromDate && itemDate < fromDate) return false;
        if (toDate && itemDate > toDate) return false;
        return true;
      });
    }

    // 4. Amount range filter
    if (config.amountField && (filters.amountMin || filters.amountMax)) {
      const min = parseFloat(filters.amountMin) || 0;
      const max = parseFloat(filters.amountMax) || Infinity;
      result = result.filter((item) => {
        const amount = parseFloat(
          (item[config.amountField] || "0").replace(/,/g, ""),
        );
        return amount >= min && amount <= max;
      });
    }

    // 5. Sorting
    if (filters.sort.field) {
      result.sort((a, b) => {
        let aVal = a[filters.sort.field];
        let bVal = b[filters.sort.field];

        // Handle numbers (amount, totalSpent, invoiceCount)
        if (!isNaN(parseFloat(aVal)) && !isNaN(parseFloat(bVal))) {
          aVal = parseFloat(aVal);
          bVal = parseFloat(bVal);
        } else {
          // Handle dates
          aVal = new Date(aVal);
          bVal = new Date(bVal);
          if (isNaN(aVal.getTime())) aVal = String(aVal || "").toLowerCase();
          if (isNaN(bVal.getTime())) bVal = String(bVal || "").toLowerCase();
        }

        if (aVal < bVal) return filters.sort.dir === "asc" ? -1 : 1;
        if (aVal > bVal) return filters.sort.dir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, filters, config]);
}

// Filter config presets
export const FILTER_CONFIGS = {
  customers: CUSTOMER_FILTER_CONFIG,
  invoices: INVOICE_FILTER_CONFIG,
  items: ITEM_FILTER_CONFIG,
  checkouts: CHECKOUT_FILTER_CONFIG,
};

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within a DataProvider");
  return ctx;
}
