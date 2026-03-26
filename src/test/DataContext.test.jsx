import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { DataProvider, useData } from '../context/DataContext';

// localStorage is available in jsdom; clear it before each test
beforeEach(() => localStorage.clear());

const wrapper = ({ children }) => <DataProvider>{children}</DataProvider>;

// ─── addCustomer ────────────────────────────────────────────────────────────

describe('addCustomer', () => {
  it('creates a customer with required fields', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let customer;
    act(() => {
      customer = result.current.addCustomer({ name: 'Alice', email: 'alice@example.com' });
    });
    expect(customer.name).toBe('Alice');
    expect(customer.email).toBe('alice@example.com');
    expect(customer.id).toBeTruthy();
    expect(customer.totalSpent).toBe('0');
    expect(customer.invoiceCount).toBe(0);
  });

  it('appends customer to the list', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    act(() => {
      result.current.addCustomer({ name: 'Alice', email: 'alice@example.com' });
      result.current.addCustomer({ name: 'Bob', email: 'bob@example.com' });
    });
    expect(result.current.customers).toHaveLength(2);
  });

  it('assigns unique ids to each customer', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let c1, c2;
    act(() => {
      c1 = result.current.addCustomer({ name: 'A', email: 'a@a.com' });
      c2 = result.current.addCustomer({ name: 'B', email: 'b@b.com' });
    });
    expect(c1.id).not.toBe(c2.id);
  });

    it('sets createdAt to a full ISO timestamp', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-01-02T03:04:05.000Z'));

        const { result } = renderHook(() => useData(), { wrapper });
        let customer;
        act(() => {
            customer = result.current.addCustomer({ name: 'Alice', email: 'alice@example.com' });
        });

        expect(customer.createdAt).toBe('2026-01-02T03:04:05.000Z');

        vi.useRealTimers();
    });
});

// ─── addItem ─────────────────────────────────────────────────────────────────

describe('addItem', () => {
  it('creates an item with defaults', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let item;
    act(() => {
      item = result.current.addItem({ name: 'Consulting', price: '100' });
    });
    expect(item.name).toBe('Consulting');
    expect(item.price).toBe('100');
    expect(item.type).toBe('service');
    expect(item.unit).toBe('unit');
    expect(item.currency).toBe('STRK');
  });

  it('respects provided type and unit', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let item;
    act(() => {
      item = result.current.addItem({ name: 'Widget', price: '50', type: 'product', unit: 'piece' });
    });
    expect(item.type).toBe('product');
    expect(item.unit).toBe('piece');
  });
});

// ─── deleteItems ─────────────────────────────────────────────────────────────

describe('deleteItems', () => {
  it('removes multiple items from the list by ids', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let i1, i2, i3;
    act(() => {
      i1 = result.current.addItem({ name: 'Item 1', price: '10' });
      i2 = result.current.addItem({ name: 'Item 2', price: '20' });
      i3 = result.current.addItem({ name: 'Item 3', price: '30' });
    });
    expect(result.current.items).toHaveLength(3);

    act(() => {
      result.current.deleteItems([i1.id, i3.id]);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].id).toBe(i2.id);
  });
});

// ─── addInvoice ──────────────────────────────────────────────────────────────

describe('addInvoice', () => {
  it('calculates total correctly from items', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let customer, item, invoice;
    act(() => {
      customer = result.current.addCustomer({ name: 'Alice', email: 'alice@example.com' });
      item = result.current.addItem({ name: 'Dev', price: '200' });
    });
    act(() => {
      invoice = result.current.addInvoice({
        customerId: customer.id,
        dueDate: '2025-12-31',
        items: [{ itemId: item.id, quantity: 3, price: '200' }],
      });
    });
    // 3 × 200 = 600
    expect(invoice.amount).toBe('600');
        // Pin day semantics to UTC midnight ISO
        expect(invoice.dueDate).toBe('2025-12-31T00:00:00.000Z');
  });

    it('sets createdAt to full ISO and normalizes dueDate', () => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-02-03T04:05:06.000Z'));

        const { result } = renderHook(() => useData(), { wrapper });
        let customer, item, invoice;
        act(() => {
            customer = result.current.addCustomer({ name: 'Alice', email: 'alice@example.com' });
            item = result.current.addItem({ name: 'Dev', price: '200' });
        });
        act(() => {
            invoice = result.current.addInvoice({
                customerId: customer.id,
                dueDate: '2025-12-31',
                items: [{ itemId: item.id, quantity: 1, price: '200' }],
            });
        });

        expect(invoice.createdAt).toBe('2026-02-03T04:05:06.000Z');
        expect(invoice.dueDate).toBe('2025-12-31T00:00:00.000Z');

        vi.useRealTimers();
    });

  it('generates sequential INV-XXX ids', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let c, it1, inv1, inv2;
    act(() => {
      c = result.current.addCustomer({ name: 'Alice', email: 'a@a.com' });
      it1 = result.current.addItem({ name: 'X', price: '10' });
    });
    act(() => {
      inv1 = result.current.addInvoice({ customerId: c.id, dueDate: '2025-01-01', items: [{ itemId: it1.id, quantity: 1, price: '10' }] });
      inv2 = result.current.addInvoice({ customerId: c.id, dueDate: '2025-01-02', items: [{ itemId: it1.id, quantity: 1, price: '10' }] });
    });
    expect(inv1.id).toBe('INV-001');
    expect(inv2.id).toBe('INV-002');
  });

  it('resolves customer name from customerId', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let c, it1, invoice;
    act(() => {
      c = result.current.addCustomer({ name: 'Bob', email: 'bob@b.com' });
      it1 = result.current.addItem({ name: 'Y', price: '50' });
    });
    act(() => {
      invoice = result.current.addInvoice({ customerId: c.id, dueDate: '2025-06-01', items: [{ itemId: it1.id, quantity: 1, price: '50' }] });
    });
    expect(invoice.customer).toBe('Bob');
  });

  it('falls back to "Unknown" for missing customer', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let it1, invoice;
    act(() => {
      it1 = result.current.addItem({ name: 'Z', price: '30' });
    });
    act(() => {
      invoice = result.current.addInvoice({ customerId: 'nonexistent', dueDate: '2025-06-01', items: [{ itemId: it1.id, quantity: 1, price: '30' }] });
    });
    expect(invoice.customer).toBe('Unknown');
  });

  it('sets status to "pending" by default', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let c, it1, invoice;
    act(() => {
      c = result.current.addCustomer({ name: 'C', email: 'c@c.com' });
      it1 = result.current.addItem({ name: 'W', price: '10' });
    });
    act(() => {
      invoice = result.current.addInvoice({ customerId: c.id, dueDate: '2025-01-01', items: [{ itemId: it1.id, quantity: 1, price: '10' }] });
    });
    expect(invoice.status).toBe('pending');
  });
});

// ─── addCheckout ─────────────────────────────────────────────────────────────

describe('addCheckout', () => {
  it('generates sequential CHK-XXX ids', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let chk1, chk2;
    act(() => {
      chk1 = result.current.addCheckout({ title: 'Plan A', amount: '100' });
      chk2 = result.current.addCheckout({ title: 'Plan B', amount: '200' });
    });
    expect(chk1.id).toBe('CHK-001');
    expect(chk2.id).toBe('CHK-002');
  });

  it('sets status to "active" by default', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let chk;
    act(() => {
      chk = result.current.addCheckout({ title: 'Plan A', amount: '50' });
    });
    expect(chk.status).toBe('active');
  });

  it('defaults currency to STRK when not provided', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let chk;
    act(() => {
      chk = result.current.addCheckout({ title: 'Plan A', amount: '50' });
    });
    expect(chk.currency).toBe('STRK');
  });

  it('respects provided currency', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let chk;
    act(() => {
      chk = result.current.addCheckout({ title: 'Plan A', amount: '50', currency: 'XLM' });
    });
    expect(chk.currency).toBe('XLM');
  });

  it('generates a paymentLink containing the checkout id', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let chk;
    act(() => {
      chk = result.current.addCheckout({ title: 'Plan A', amount: '50' });
    });
    expect(chk.paymentLink).toContain(chk.id);
  });
});

// ─── useData guard ───────────────────────────────────────────────────────────

describe('useData', () => {
  it('throws when used outside DataProvider', () => {
    // Suppress expected console.error from React
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useData())).toThrow('useData must be used within a DataProvider');
    spy.mockRestore();
  });
});

// ─── markCheckoutPaid ─────────────────────────────────────────────────────────

describe('markCheckoutPaid', () => {
  it('marks the checkout status as paid', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let chk;
    act(() => { chk = result.current.addCheckout({ title: 'Plan A', amount: '100' }); });
    act(() => { result.current.markCheckoutPaid(chk.id, null); });
    expect(result.current.checkouts.find((c) => c.id === chk.id).status).toBe('paid');
  });

  it('increments checkout payments count', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let chk;
    act(() => { chk = result.current.addCheckout({ title: 'Plan A', amount: '100' }); });
    act(() => { result.current.markCheckoutPaid(chk.id, null); });
    expect(result.current.checkouts.find((c) => c.id === chk.id).payments).toBe(1);
  });

  it('updates customer totalSpent and invoiceCount', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let customer, chk;
    act(() => { customer = result.current.addCustomer({ name: 'Alice', email: 'alice@example.com' }); });
    act(() => { chk = result.current.addCheckout({ title: 'Plan A', amount: '200' }); });
    act(() => { result.current.markCheckoutPaid(chk.id, customer.id); });
    const updated = result.current.customers.find((c) => c.id === customer.id);
    expect(updated.invoiceCount).toBe(1);
    expect(updated.totalSpent).toBe('200');
  });

  it('accumulates totalSpent across multiple paid checkouts', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let customer, chk1, chk2;
    act(() => { customer = result.current.addCustomer({ name: 'Bob', email: 'bob@example.com' }); });
    act(() => {
      chk1 = result.current.addCheckout({ title: 'Plan A', amount: '100' });
      chk2 = result.current.addCheckout({ title: 'Plan B', amount: '150' });
    });
    act(() => {
      result.current.markCheckoutPaid(chk1.id, customer.id);
      result.current.markCheckoutPaid(chk2.id, customer.id);
    });
    const updated = result.current.customers.find((c) => c.id === customer.id);
    expect(updated.invoiceCount).toBe(2);
    expect(updated.totalSpent).toBe('250');
  });

  it('fires checkout.paid webhook with correct payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', mockFetch);
    localStorage.setItem('tradazone_webhook_url', 'https://example.com/hook');

    const { result } = renderHook(() => useData(), { wrapper });
    let chk;
    act(() => { chk = result.current.addCheckout({ title: 'Plan A', amount: '100', currency: 'STRK' }); });
    await act(async () => { result.current.markCheckoutPaid(chk.id, null, 'starknet'); });

    const calls = mockFetch.mock.calls.filter((c) => {
      try { return JSON.parse(c[1].body).event === 'checkout.paid'; } catch { return false; }
    });
    expect(calls.length).toBeGreaterThan(0);
    const body = JSON.parse(calls[0][1].body);
    expect(body.payload.id).toBe(chk.id);
    expect(body.payload.walletType).toBe('starknet');
  });

  it('does not update other customers when customerId is null', () => {
    const { result } = renderHook(() => useData(), { wrapper });
    let customer, chk;
    act(() => { customer = result.current.addCustomer({ name: 'Carol', email: 'carol@example.com' }); });
    act(() => { chk = result.current.addCheckout({ title: 'Plan A', amount: '100' }); });
    act(() => { result.current.markCheckoutPaid(chk.id, null); });
    const unchanged = result.current.customers.find((c) => c.id === customer.id);
    expect(unchanged.invoiceCount).toBe(0);
    expect(unchanged.totalSpent).toBe('0');
  });
});
