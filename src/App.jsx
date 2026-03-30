/**
 * App routing — React Router stack
 *
 * ADR-002: docs/adr/002-app-routing-stack.md (Issue #202)
 * - BrowserRouter + nested Routes; protected shell via PrivateRoute + Layout.
 *
 * PERFORMANCE: Route components are loaded via React.lazy() so the JS for 
 * each feature is fetched on-demand. Chart.js (used within the checkout flow) 
 * is further isolated in its own `charts` Rollup chunk.
 * See: src/components/ui/LazyChart.jsx and vite.config.js for details.
 *
 * Issue #38 — Missing accessible names on route loading surfaces (App Routing).
 * Issue #141 — Lack of visual snapshot testing for the App Routing components.
 * Issue #146 — Zero unit tests coverage found for the critical logic in App Routing.
 * Category: Testing / App Routing / UI/UX / accessibility
 * Affected: Suspense fallbacks while lazy chunks load (`/pay/:checkoutId`, checkout
 * routes) and the root Suspense fallback (`LoadingSpinner`).
 * Resolution: `role="status"`, `aria-live`, `aria-busy`, and explicit labels so
 * assistive tech users get parity with visual loading states. (Purely decorative
 * spinners use `aria-hidden`; informative images elsewhere use `alt` — see Logo,
 * auth illustrations.)
 *
 * ISSUE: #CSP-APP (No CSP headers defined for App Routing)
 * Category: Security & Compliance
 * Priority: Low
 * Affected Area: App Routing
 * Description: No Content Security Policy was enforced at the app-routing level,
 * leaving all routes unprotected against XSS and clickjacking on first paint and
 * during SPA navigation. Resolved by:
 *   1. Shipping the CSP baseline in `index.html` as a `<meta http-equiv>` tag so
 *      every route is protected from the very first byte served.
 *   2. Calling `ensureContentSecurityPolicyMeta()` (from `src/security/csp.js`) in
 *      `AuthProvider` on mount so the policy is re-asserted after any SPA navigation
 *      that might strip or replace the document head.
 * The shared policy constant `AUTH_CONTENT_SECURITY_POLICY` in `src/security/csp.js`
 * is the single source of truth for the CSP directive string used in both locations.
 * Tests: `src/test/AuthContext.csp.test.jsx`
 */
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/layout/Layout';
import PrivateRoute from './components/routing/PrivateRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';

const SignIn = lazy(() => import('./pages/auth/SignIn'));
const SignUp = lazy(() => import('./pages/auth/SignUp'));
const Home = lazy(() => import('./pages/dashboard/Home'));
const CustomerList = lazy(() => import('./pages/customers/CustomerList'));
const AddCustomer = lazy(() => import('./pages/customers/AddCustomer'));
const CustomerDetail = lazy(() => import('./pages/customers/CustomerDetail'));
const CheckoutList = lazy(() => import('./pages/checkouts/CheckoutList'));
const CreateCheckout = lazy(() => import('./pages/checkouts/CreateCheckout'));
const CheckoutDetail = lazy(() => import('./pages/checkouts/CheckoutDetail'));
const MailCheckout = lazy(() => import('./pages/checkouts/MailCheckout'));
const InvoiceList = lazy(() => import('./pages/invoices/InvoiceList'));
const CreateInvoice = lazy(() => import('./pages/invoices/CreateInvoice'));
const InvoiceDetail = lazy(() => import('./pages/invoices/InvoiceDetail'));
const InvoicePreview = lazy(() => import('./pages/invoices/InvoicePreview'));
const ItemsList = lazy(() => import('./pages/items/ItemsList'));
const AddItem = lazy(() => import('./pages/items/AddItem'));
const ItemDetail = lazy(() => import('./pages/items/ItemDetail'));
const Settings = lazy(() => import('./pages/settings/Settings'));
const ProfileSettings = lazy(() => import('./pages/settings/ProfileSettings'));
const PaymentSettings = lazy(() => import('./pages/settings/PaymentSettings'));
const NotificationSettings = lazy(() => import('./pages/settings/NotificationSettings'));
const PasswordSettings = lazy(() => import('./pages/settings/PasswordSettings'));

import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';

 /** 
 * The following checkout lifecycle events are dispatched via
 * `src/services/webhook.js` (dispatchWebhook) at the route level:
 *
 * | Event              | Route / Component         | Trigger                          |
 * |--------------------|---------------------------|----------------------------------|
 * | checkout.created   | /checkout/create          | Form submit in CreateCheckout    |
 * | checkout.viewed    | /pay/:checkoutId          | Mount of MailCheckout            |
 * | checkout.paid      | /pay/:checkoutId          | Successful wallet connect        |
 *
 * The webhook endpoint is configured via `VITE_WEBHOOK_URL` (build-time) or
 * through Settings > Payments at runtime. See `src/services/webhook.js` for
 * the full dispatch contract and retry logic.
 */

function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <DataProvider>
        <BrowserRouter basename={import.meta.env.DEV ? '/' : '/Tradazone'}>
          <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public routes — checkout payment page is lazy-loaded */}
            <Route
              path="/pay/:checkoutId"
              element={
                <Suspense
                  fallback={
                    <div
                      className="min-h-screen bg-brand"
                      role="status"
                      aria-live="polite"
                      aria-busy="true"
                      aria-label="Loading checkout payment page"
                    />
                  }
                >
                  <MailCheckout />
                </Suspense>
              }
            />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/invoice/:id" element={<InvoicePreview />} />

            {/* Protected routes — require authentication */}
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Layout />
                </PrivateRoute>
              }
            >
              <Route index element={<Home />} />
              <Route path="customers" element={<CustomerList />} />
              <Route path="customers/add" element={<AddCustomer />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="invoices" element={<InvoiceList />} />
              <Route path="invoices/create" element={<CreateInvoice />} />
              <Route path="invoices/:id" element={<InvoiceDetail />} />
              <Route path="items" element={<ItemsList />} />
              <Route path="items/add" element={<AddItem />} />
              <Route path="items/:id" element={<ItemDetail />} />
              <Route
                element={
                  <Suspense
                    fallback={
                      <div
                        className="p-8 text-center text-sm text-gray-400"
                        role="status"
                        aria-live="polite"
                        aria-busy="true"
                      >
                        Loading…
                      </div>
                    }
                  >
                    <Outlet />
                  </Suspense>
                }
              >
                <Route path="checkout" element={<CheckoutList />} />
                <Route path="checkout/create" element={<CreateCheckout />} />
                <Route path="checkout/:id" element={<CheckoutDetail />} />
              </Route>
              <Route path="settings" element={<Settings />}>
                <Route path="profile" element={<ProfileSettings />} />
                <Route path="payments" element={<PaymentSettings />} />
                <Route path="notifications" element={<NotificationSettings />} />
                <Route path="password" element={<PasswordSettings />} />
              </Route>
            </Route>

            {/* Catch-all — redirect to signin */}
            <Route path="*" element={<Navigate to="/signin" replace />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
