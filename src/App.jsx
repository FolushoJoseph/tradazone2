import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import PrivateRoute from './components/routing/PrivateRoute';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import Home from './pages/dashboard/Home';
import CustomerList from './pages/customers/CustomerList';
import AddCustomer from './pages/customers/AddCustomer';
import CustomerDetail from './pages/customers/CustomerDetail';
import CheckoutList from './pages/checkouts/CheckoutList';
import CreateCheckout from './pages/checkouts/CreateCheckout';
import CheckoutDetail from './pages/checkouts/CheckoutDetail';
import MailCheckout from './pages/checkouts/MailCheckout';
import InvoiceList from './pages/invoices/InvoiceList';
import CreateInvoice from './pages/invoices/CreateInvoice';
import InvoiceDetail from './pages/invoices/InvoiceDetail';
import InvoicePreview from './pages/invoices/InvoicePreview';
import ItemsList from './pages/items/ItemsList';
import AddItem from './pages/items/AddItem';
import ItemDetail from './pages/items/ItemDetail';
import Settings from './pages/settings/Settings';
import ProfileSettings from './pages/settings/ProfileSettings';
import PaymentSettings from './pages/settings/PaymentSettings';
import NotificationSettings from './pages/settings/NotificationSettings';
import PasswordSettings from './pages/settings/PasswordSettings';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <BrowserRouter basename="/tradazone2">
          <Routes>
            {/* Public routes */}
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/pay/:checkoutId" element={<MailCheckout />} />
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
