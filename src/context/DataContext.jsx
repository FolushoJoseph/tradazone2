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

function loadFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function DataProvider({ children }) {
  const [customers, setCustomers] = useState(() => loadFromStorage(KEYS.customers) || []);
  const [invoices, setInvoices] = useState(() => loadFromStorage(KEYS.invoices) || []);
  const [checkouts, setCheckouts] = useState(() => loadFromStorage(KEYS.checkouts) || []);
  const [items, setItems] = useState(() => loadFromStorage(KEYS.items) || []);

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
      if (import.meta.env.DEV) console.warn('[DataContext] Duplicate addCustomer operation detected, ignoring.');
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
        if (import.meta.env.DEV) console.warn('[DataContext] Duplicate addInvoice operation detected, ignoring.');
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
        const total = calculateItemsTotal(resolvedItems, 2);
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
          sentAt: null,
          paidAt: null,
          emailStatus: 'pending',
          paymentAddress: '',
          txHash: '',
          txNetwork: '',
          txAmount: '',
          txCurrency: ''
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

  const sendInvoice = useCallback(
    (invoiceId) => {
      setInvoices((prev) => {
        const next = prev.map((inv) =>
          inv.id === invoiceId
            ? { ...inv, status: 'sent', sentAt: new Date().toISOString(), emailStatus: 'sent' }
            : inv
        );
        save(KEYS.invoices, next);
        return next;
      });
    },
    []
  );

  const markInvoicePaid = useCallback(
    (invoiceId, txDetails) => {
      const paidInvoice = invoices.find((inv) => inv.id === invoiceId);
      const added = parseFloat(paidInvoice?.amount.replace(/,/g, '') || '0') || 0;

      setInvoices((prev) => {
        const next = prev.map((inv) =>
          inv.id === invoiceId
            ? { 
                ...inv, 
                status: 'paid', 
                paidAt: new Date().toISOString(),
                txHash: txDetails.hash || '',
                txNetwork: txDetails.network || '',
                txAmount: txDetails.amount || '',
                txCurrency: txDetails.currency || ''
              }
            : inv
        );
        save(KEYS.invoices, next);
        return next;
      });

      if (paidInvoice && paidInvoice.customerId) {
        setCustomers((prev) => {
          const next = prev.map((c) => {
            if (c.id !== paidInvoice.customerId) return c;
            const prevSpent = parseFloat(c.totalSpent.replace(/,/g, '')) || 0;
            const updatedTotal = safeAdd(prevSpent, added, 2);
            return {
              ...c,
              totalSpent: updatedTotal.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 2,
              }),
            };
          });
          save(KEYS.customers, next);
          return next;
        });
      }
    },
    [invoices]
  );

  const addCheckout = useCallback(
    (data) => {
      if (pendingOperations.current.checkouts) {
        if (import.meta.env.DEV) console.warn('[DataContext] Duplicate addCheckout operation detected, ignoring.');
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

    // ---------- Invoice actions ----------
    const sendInvoice = useCallback((invoiceId) => {
        setInvoices((prev) => {
            const next = prev.map((inv) =>
                inv.id === invoiceId ? { ...inv, status: 'sent' } : inv
            );
            save(KEYS.invoices, next);
            return next;
        });
    }, []);

    const markInvoicePaid = useCallback((invoiceId, txDetails) => {
        setInvoices((prev) => {
            const next = prev.map((inv) =>
                inv.id === invoiceId
                    ? { ...inv, status: 'paid', txHash: txDetails?.hash || null, paidAt: new Date().toISOString() }
                    : inv
            );
            save(KEYS.invoices, next);
            return next;
        });
    }, []);

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
      sendInvoice,
      markInvoicePaid,
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
      sendInvoice,
      markInvoicePaid,
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
    const ctx = useContext(DataContext);
    if (!ctx) throw new Error('useData must be used within a DataProvider');
    return ctx;
}
