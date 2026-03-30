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
 * ISSUE INVESTIGATION: "Missing alt tags on critical <img> elements in DataContext"
 * STATUS: Investigated and confirmed this is a false positive. DataContext is a
 * pure React Context provider that manages application state (customers, invoices,
 * checkouts, items). It contains NO JSX rendering, NO <img> elements, and NO UI
 * components whatsoever. This file only exports DataProvider (context wrapper) and
 * useData (custom hook). Alt tag accessibility issues are not applicable here.
 * Central data and operation provider for customers, invoices, checkouts, and items.
 * Contains performance-related context split for checkout flow (#61) and
 * avoids excessive rerenders by memoizing operations and context values.
 *
 * ISSUE: #145 — Integration tests for context mutations live in
 *   src/test/ContextMutations.integration.test.jsx (see README “Developer Setup Notes”).
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  dispatchWebhook,
  setWebhookUrl,
  getWebhookUrl,
} from "../services/webhook";
import { toUtcMidnightIso } from "../utils/date";
import api from "../services/api";
import {
  CUSTOMER_FILTER_CONFIG,
  INVOICE_FILTER_CONFIG,
  ITEM_FILTER_CONFIG,
  CHECKOUT_FILTER_CONFIG,
} from "./filterConfigs";

const DataContext = createContext(null);
const CheckoutContext = createContext(null);

const KEYS = {
  customers: "tradazone_customers",
  invoices: "tradazone_invoices",
  checkouts: "tradazone_checkouts",
  items: "tradazone_items",
};

function save(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

export function DataProvider({ children }) {
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

  const invoiceCountRef = useRef(0);
  const checkoutCountRef = useRef(0);

  const pendingOperations = useRef({
    customers: false,
    invoices: false,
    checkouts: false,
    items: false,
  });

  const releaseOperation = useCallback((key) => {
    const clear = () => {
      pendingOperations.current[key] = false;
    };

    if (typeof queueMicrotask === "function") {
      queueMicrotask(clear);
    } else {
      Promise.resolve().then(clear);
    }
  }, []);

  const addCustomer = useCallback((data) => {
    if (pendingOperations.current.customers) {
      console.warn('[DataContext] Duplicate addCustomer operation detected, ignoring.');
      return null;
    }

    try {
      pendingOperations.current.customers = true;
      const newCustomer = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        address: data.address || '',
        description: data.description || '',
        totalSpent: '0',
        currency: 'STRK',
        invoiceCount: 0,
        createdAt: new Date().toISOString(),
      };
      setCustomers((prev) => {
        const next = [...prev, newCustomer];
        save(KEYS.customers, next);
        return next;
      });
      return newCustomer;
    } finally {
      releaseOperation("customers");
    }
  }, [releaseOperation]);

  const updateCustomerDescription = useCallback((customerId, description) => {
    setCustomers((prev) => {
      const next = prev.map((customer) =>
        customer.id === customerId ? { ...customer, description } : customer,
      );
      save(KEYS.customers, next);
      return next;
    });
  }, []);

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

  const deleteItems = useCallback((ids) => {
    setItems((prev) => {
      const next = prev.filter((item) => !ids.includes(item.id));
      save(KEYS.items, next);
      return next;
    });

    // Gateway behavior: keep API call behavior for integration, not blocking UI.
    if (Array.isArray(ids) && ids.length > 0) {
      api.items?.bulkDelete?.(ids).catch(() => {});
    }
  }, []);

  const addInvoice = useCallback(
    (data) => {
      if (pendingOperations.current.invoices) {
        console.warn('[DataContext] Duplicate addInvoice operation detected, ignoring.');
        return null;
      }

      try {
        pendingOperations.current.invoices = true;

        const customer = customers.find((c) => c.id === data.customerId);
        const resolvedItems = (data.items || []).map((di) => {
          const found = items.find((i) => i.id === di.itemId);
          return {
            name: found ? found.name : 'Custom Item',
            quantity: parseInt(di.quantity, 10) || 1,
            price: di.price || (found ? found.price : '0'),
          };
        });
        const total = resolvedItems.reduce(
          (sum, it) => sum + parseFloat(it.price) * it.quantity,
          0,
        );
        const newInvoice = {
          id: `INV-${String(++invoiceCountRef.current).padStart(3, '0')}`,
          customer: customer ? customer.name : 'Unknown',
          customerId: data.customerId,
          amount: total.toLocaleString(),
          currency: 'STRK',
          status: 'pending',
          dueDate: toUtcMidnightIso(data.dueDate),
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
        releaseOperation("invoices");
      }
    },
    [customers, items, releaseOperation],
  );

  const addCheckout = useCallback(
    (data) => {
      if (pendingOperations.current.checkouts) {
        console.warn('[DataContext] Duplicate addCheckout operation detected, ignoring.');
        return null;
      }

      try {
        pendingOperations.current.checkouts = true;

        const id = `CHK-${String(++checkoutCountRef.current).padStart(3, '0')}`;
        const newCheckout = {
          id,
          title: data.title,
          description: data.description || '',
          amount: data.amount,
          currency: data.currency || 'STRK',
          status: 'active',
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

        dispatchWebhook('checkout.created', {
          id: newCheckout.id,
          title: newCheckout.title,
          amount: newCheckout.amount,
          currency: newCheckout.currency,
          paymentLink: newCheckout.paymentLink,
        });

        return newCheckout;
      } finally {
        releaseOperation("checkouts");
      }
    },
    [releaseOperation],
  );

  const markCheckoutPaid = useCallback(
    (checkoutId, customerId, walletType = '') => {
      const paidCheckout = checkouts.find((c) => c.id === checkoutId);
      const added = parseFloat(paidCheckout?.amount || '0') || 0;

      setCheckouts((prev) => {
        const next = prev.map((c) =>
          c.id === checkoutId ? { ...c, status: 'paid', payments: c.payments + 1 } : c,
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
    [checkouts],
  );

  const recordCheckoutView = useCallback(
    (checkoutId) => {
      const target = checkouts.find((c) => c.id === checkoutId);
      if (!target) return;

      const nextViews = (target.views || 0) + 1;
      setCheckouts((prev) => {
        const next = prev.map((c) =>
          c.id === checkoutId ? { ...c, views: nextViews } : c,
        );
        save(KEYS.checkouts, next);
        return next;
      });

      dispatchWebhook('checkout.viewed', {
        id: target.id,
        title: target.title,
        amount: target.amount,
        currency: target.currency,
        views: nextViews,
      });
    },
    [checkouts],
  );

  const dataContextValue = useMemo(
    () => ({
      customers,
      invoices,
      checkouts,
      items,
      addCustomer,
      addItem,
      deleteItems,
      addInvoice,
      addCheckout,
      markCheckoutPaid,
      recordCheckoutView,
      updateCustomerDescription,
    }),
    [
      customers,
      invoices,
      checkouts,
      items,
      addCustomer,
      addItem,
      deleteItems,
      addInvoice,
      addCheckout,
      markCheckoutPaid,
      recordCheckoutView,
      updateCustomerDescription,
    ],
  );

  const checkoutContextValue = useMemo(
    () => ({ checkouts, addCheckout, markCheckoutPaid, recordCheckoutView }),
    [checkouts, addCheckout, markCheckoutPaid, recordCheckoutView],
  );

  return (
    <DataContext.Provider value={dataContextValue}>
      <CheckoutContext.Provider value={checkoutContextValue}>
        {children}
      </CheckoutContext.Provider>
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within a DataProvider');
  return context;
}

export function useCheckoutData() {
  const context = useContext(CheckoutContext);
  if (!context) throw new Error('useCheckoutData must be used within a DataProvider');
  return context;
}

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
    } catch (_err) {
      // Ignore parse errors
    }
  }, [type]);

  const setFiltersWithSave = useCallback(
    (newFilters) => {
      setFilters(newFilters);
      try {
        localStorage.setItem(`tradazone_filters_${type}`, JSON.stringify(newFilters));
      } catch (_err) {
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

export function useFilteredData({ data = [], filters, config }) {
  return useMemo(() => {
    let result = [...data];

    if (filters.search) {
      const query = filters.search.toLowerCase().trim();
      result = result.filter((item) =>
        config.searchableFields.some((field) =>
          String(item[field] || "").toLowerCase().includes(query),
        ),
      );
    }

    if (config.statusField && filters.status !== "all") {
      result = result.filter((item) => item[config.statusField] === filters.status);
    }

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

    if (config.amountField && (filters.amountMin || filters.amountMax)) {
      const min = parseFloat(filters.amountMin) || 0;
      const max = parseFloat(filters.amountMax) || Infinity;
      result = result.filter((item) => {
        const amount = parseFloat((item[config.amountField] || "0").replace(/,/g, ""));
        return amount >= min && amount <= max;
      });
    }

    if (filters.sort.field) {
      result.sort((a, b) => {
        let aVal = a[filters.sort.field];
        let bVal = b[filters.sort.field];

        if (!isNaN(parseFloat(aVal)) && !isNaN(parseFloat(bVal))) {
          aVal = parseFloat(aVal);
          bVal = parseFloat(bVal);
        } else {
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

export const FILTER_CONFIGS = {
  customers: CUSTOMER_FILTER_CONFIG,
  invoices: INVOICE_FILTER_CONFIG,
  items: ITEM_FILTER_CONFIG,
  checkouts: CHECKOUT_FILTER_CONFIG,
};
