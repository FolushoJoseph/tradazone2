import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import PrivateRoute from './components/routing/PrivateRoute';
import CheckoutRoutesShell from './components/routing/CheckoutRoutesShell';
import LoadingSpinner from './components/ui/LoadingSpinner';

const SignIn = lazy(() => import('./features/auth/pages/SignIn'));
const SignUp = lazy(() => import('./features/auth/pages/SignUp'));
const Home = lazy(() => import('./features/dashboard/pages/Home'));
const CustomerList = lazy(() => import('./features/customers/pages/CustomerList'));
const AddCustomer = lazy(() => import('./features/customers/pages/AddCustomer'));
const CustomerDetail = lazy(() => import('./features/customers/pages/CustomerDetail'));
const CheckoutList = lazy(() => import('./features/checkouts/pages/CheckoutList'));
const CreateCheckout = lazy(() => import('./features/checkouts/pages/CreateCheckout'));
const CheckoutDetail = lazy(() => import('./features/checkouts/pages/CheckoutDetail'));
const MailCheckout = lazy(() => import('./features/checkouts/pages/MailCheckout'));
const InvoiceList = lazy(() => import('./features/invoices/pages/InvoiceList'));
const CreateInvoice = lazy(() => import('./features/invoices/pages/CreateInvoice'));
const InvoiceDetail = lazy(() => import('./features/invoices/pages/InvoiceDetail'));
const InvoicePreview = lazy(() => import('./features/invoices/pages/InvoicePreview'));
const InvoicePayment = lazy(() => import('./features/invoices/pages/InvoicePayment'));
const ItemsList = lazy(() => import('./features/items/pages/ItemsList'));
const AddItem = lazy(() => import('./features/items/pages/AddItem'));
const ItemDetail = lazy(() => import('./features/items/pages/ItemDetail'));
const Settings = lazy(() => import('./features/settings/pages/Settings'));
const ProfileSettings = lazy(() => import('./features/settings/pages/ProfileSettings'));
const PaymentSettings = lazy(() => import('./features/settings/pages/PaymentSettings'));
const NotificationSettings = lazy(() => import('./features/settings/pages/NotificationSettings'));
const PasswordSettings = lazy(() => import('./features/settings/pages/PasswordSettings'));

import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter basename="/Tradazone">
          <Routes>
            {/* Public routes */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/pay/:checkoutId" element={<MailCheckout />} />
            <Route path="/invoice/:id" element={<InvoicePreview />} />
            <Route
              path="/pay/invoice/:invoiceId"
              element={
                <Suspense
                  fallback={
                    <div
                      className="min-h-screen bg-brand"
                      role="status"
                      aria-live="polite"
                      aria-busy="true"
                      aria-label="Loading payment page"
                    />
                  }
                >
                  <InvoicePayment />
                </Suspense>
              }
            />

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
              <Route path="checkout" element={<CheckoutList />} />
              <Route path="checkout/create" element={<CreateCheckout />} />
              <Route path="checkout/:id" element={<CheckoutDetail />} />
              <Route path="invoices" element={<InvoiceList />} />
              <Route path="invoices/create" element={<CreateInvoice />} />
              <Route path="invoices/:id" element={<InvoiceDetail />} />
              <Route path="items" element={<ItemsList />} />
              <Route path="items/add" element={<AddItem />} />
              <Route path="items/:id" element={<ItemDetail />} />
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
        </BrowserRouter>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;
