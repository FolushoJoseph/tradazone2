# Implementation Summary — Email Notifications & Crypto Payment Processing

## Files Changed

### New files
| File | Purpose |
|------|---------|
| `src/services/emailService.js` | EmailJS client — 4 transactional email functions with 2-retry logic |
| `src/services/priceService.js` | CoinGecko price fetcher with 60 s in-memory cache |
| `src/services/blockchainMonitor.js` | Polling monitor for Ethereum, Starknet, Stellar |
| `src/components/invoice/SendInvoiceModal.jsx` | Modal to send an invoice by email + set payment address |
| `src/pages/invoices/InvoicePayment.jsx` | Public payment page at `/pay/invoice/:invoiceId` |
| `.env.example` | All required environment variables documented |
| `IMPLEMENTATION.md` | This file |

### Modified files
| File | Change |
|------|--------|
| `src/context/DataContext.jsx` | Added `updateInvoice`, `sendInvoice`, `markInvoicePaid`, `resetDemoData`; extended invoice model; removed auto-clear (see Architecture Notes) |
| `src/components/tables/StatusBadge.jsx` | Added `sent` variant (purple `#EDE9FE / #7C3AED`) |
| `src/pages/invoices/InvoiceDetail.jsx` | Wired Send button to `SendInvoiceModal`; added payment info card; Resend support |
| `src/components/invoice/InvoiceLayout.jsx` | Uses `invoice.paymentLink` instead of hardcoded URL |
| `src/App.jsx` | Added `/pay/invoice/:invoiceId` route (before `/pay/:checkoutId` for specificity) |
| `src/pages/settings/NotificationSettings.jsx` | Added EmailJS config status banner, email toggle, test-send form |
| `src/pages/settings/PaymentSettings.jsx` | Added wallet address copy, network/currency info, RPC endpoint display, demo reset |
| `package.json` | Added `@emailjs/browser`, `qrcode` |

---

## Invoice Lifecycle

```
addInvoice() → status: 'pending'
sendInvoice() → status: 'sent'  (paymentAddress, paymentLink stored)
markInvoicePaid() → status: 'paid'  (txHash, txAmount, txCurrency stored)
```

### Extended invoice model fields
```js
{
  // existing
  id, customer, customerId, amount, currency, dueDate, createdAt, items,
  // lifecycle
  status: 'pending' | 'sent' | 'paid',
  sentAt: ISO string | null,
  paidAt: ISO string | null,
  emailStatus: 'pending' | 'sent' | 'failed' | 'receipt_sent' | null,
  // payment routing
  paymentAddress: string | null,    // merchant wallet address
  paymentLink: string | null,       // /pay/invoice/:id URL
  txNetwork: 'stellar' | 'starknet' | 'ethereum' | null,
  // on-chain proof
  txHash: string | null,
  txAmount: string | null,
  txCurrency: string | null,
  // email routing
  senderName: string | null,
  senderEmail: string | null,
  customerEmail: string | null,
}
```

---

## Design System Notes

### Components reused
- `Button` — all variants (primary, secondary, danger) used as-is
- `Input` — used in `SendInvoiceModal` for email fields
- `Toggle` — used in `NotificationSettings` for email toggle
- `StatusBadge` — extended (see below)
- `ConnectWalletModal` — pattern replicated exactly for `SendInvoiceModal`
- `Logo` — used in `InvoicePayment` branding header

### Extensions made
- **StatusBadge `sent` variant** — purple palette (`bg-[#EDE9FE] text-[#7C3AED]`). Uses literal Tailwind classes instead of a token because the purple family isn't in the design token set. Follows the exact same `inline-flex px-3 py-1 text-xs font-medium` pattern.

### Modal pattern compliance
`SendInvoiceModal` follows the `ConnectWalletModal` pattern exactly:
- `fixed inset-0 bg-black/40 z-50 backdrop-blur-sm` backdrop
- `bottom-0 left-0 right-0` on mobile (bottom sheet with drag handle)
- `lg:left-1/2 lg:top-1/2 lg:-translate-x-1/2 lg:-translate-y-1/2 lg:max-w-md` on desktop
- `animate-slide-up lg:animate-none` entry animation
- `flex flex-col max-h-[90vh] overflow-hidden` with scrollable inner

### Design deviations
None. All new screens use only existing tokens and components.

---

## Architecture Notes

### Why localStorage auto-clear was removed
The original `DataContext` called `localStorage.removeItem()` for all four keys on every mount. This reset state was intentional for demo purposes but made the public payment page (`/pay/invoice/:invoiceId`) non-functional — a customer clicking a payment link would hit an empty DataContext. The clear was replaced with a `resetDemoData()` function exposed via context and wired to a button in **Settings → Payments**. All other demo behaviour is preserved.

### Polling vs webhooks
Webhooks would require a backend (server to receive blockchain events). Since the spec requires no backend, the monitor polls public JSON-RPC endpoints at network-appropriate intervals:

| Network | Poll interval | Rationale |
|---------|--------------|-----------|
| Ethereum | 15 s | ~12 s block time |
| Starknet | 20 s | ~15 s block time |
| Stellar | 8 s | ~5–6 s ledger time |

Exponential backoff (up to 30 s) is applied on RPC errors. Once a matching transaction is found, the monitor stops.

### EmailJS limitations
- 200 emails/month on the free tier
- Both templates (`INVOICE` and `RECEIPT`) use the same two template IDs. Template variables differ (see `emailService.js` for the full param list). Create two separate templates in EmailJS and configure accordingly.
- All sends are client-side — the `PUBLIC_KEY` is exposed in the browser bundle. This is by design for EmailJS. Do not use server-restricted keys.

### Starknet payment detection
The `checkStarknet` function in `blockchainMonitor.js` decodes ERC-20 Transfer events from the STRK token contract on mainnet. The event data layout follows the Cairo 2 ABI: `[from, to, amount_low, amount_high]`. This covers STRK-to-wallet transfers. For custom ERC-20 tokens or Starknet ETH (different contract), the `STRK_CONTRACT` address would need to be updated.

### CoinGecko cache
Prices are cached in-memory (per tab) with a 60 s TTL. The payment page shows a countdown timer that fires `fetchPrice()` on expiry, keeping the displayed conversion fresh. On HTTP 429 (rate limited), the stale cached value is served if available.

### Security constraints
- No private keys are accessed or generated
- `paymentAddress` is always the merchant's *connected* wallet address (read from `useAuth`)
- The customer sends funds directly to that address — no custody or escrow
- Payment verification is observation-only (read-only RPC calls)

---

## Setup Guide

### 1. Environment variables
```bash
cp .env.example .env.local
```
Fill in all four `VITE_EMAILJS_*` values. The blockchain RPC vars are optional.

### 2. EmailJS templates
Create two templates in your EmailJS dashboard. Required variables:

**Invoice template** (`VITE_EMAILJS_TEMPLATE_INVOICE`):
```
{{to_name}}, {{to_email}}, {{invoice_id}}, {{invoice_amount}},
{{invoice_currency}}, {{invoice_due_date}}, {{payment_link}}, {{sender_name}}
```

**Receipt template** (`VITE_EMAILJS_TEMPLATE_RECEIPT`):
```
{{to_name}}, {{to_email}}, {{invoice_id}}, {{tx_hash}},
{{tx_amount}}, {{tx_currency}}, {{tx_network}}, {{paid_at}}, {{sender_name}}
```

### 3. Testing
1. Start dev server: `npm run dev`
2. Connect a wallet (Settings → Payments)
3. Create a customer with an email address
4. Create an invoice for that customer
5. Open the invoice detail → click **Send**
6. Confirm emails in the modal → submit
7. Invoice status changes to **Sent** and a payment link appears
8. Open the payment link in a new tab
9. Select currency, observe live conversion and QR code
10. Send the crypto amount to the displayed address (testnet recommended)
11. The payment page polls and detects the transaction
12. Invoice status changes to **Paid**, payment emails are triggered

### 4. Email test
Go to Settings → Notifications → enter an email → click **Send Test** to verify EmailJS is correctly wired up before going live.

---

## Known Limitations

1. **No fund sweeping** — funds are sent directly to the merchant wallet. The app only observes transactions; it cannot move funds.
2. **Email quota** — EmailJS free tier is 200 emails/month. Each invoice send fires 2 emails; each confirmed payment fires 2 more.
3. **Polling delay** — Payment detection lags by one poll interval (up to 20 s on Starknet). Do not use this as a substitute for a server-side webhook in high-value or time-sensitive scenarios.
4. **In-memory price cache** — The 60 s cache is per browser tab. Two tabs fetching simultaneously both hit CoinGecko.
5. **Starknet USDC not supported** — Only native STRK is monitored on Starknet. ERC-20 USDC on Starknet would require a different contract address.
6. **Data persistence is localStorage-only** — All invoice and customer data lives in the browser. Clearing browser storage or switching devices loses all records.
7. **Public payment page requires same-browser session** — Because data is in localStorage, the customer must open the payment link in the same browser (or profile) where the merchant is logged in, unless data was previously persisted from a prior session. A backend is required for true cross-device public links.
