import { useState } from 'react';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { sendInvoiceToCustomer } from '../../services/emailService';
import Toggle from '../../components/forms/Toggle';
import Input from '../../components/forms/Input';
import Button from '../../components/forms/Button';

const notificationOptions = [
    { id: 'payments', title: 'Payment Received', description: 'Get notified when you receive a payment' },
    { id: 'invoices', title: 'Invoice Updates', description: 'Get notified when invoice status changes' },
    { id: 'checkouts', title: 'Checkout Activity', description: 'Get notified about checkout page views and payments' },
    { id: 'marketing', title: 'Marketing & Updates', description: 'Receive product updates and promotional content' },
];

function NotificationSettings() {
    const [settings, setSettings] = useState({ payments: true, invoices: true, checkouts: false, marketing: false });
    const [emailEnabled, setEmailEnabled] = useState(
        !!(import.meta.env.VITE_EMAILJS_SERVICE_ID && import.meta.env.VITE_EMAILJS_PUBLIC_KEY)
    );
    const [testEmail, setTestEmail] = useState('');
    const [testStatus, setTestStatus] = useState(null); // null | 'loading' | 'ok' | 'err'

    const isEmailConfigured = !!(
        import.meta.env.VITE_EMAILJS_SERVICE_ID &&
        import.meta.env.VITE_EMAILJS_PUBLIC_KEY &&
        import.meta.env.VITE_EMAILJS_TEMPLATE_INVOICE
    );

    const handleToggle = (id) => setSettings({ ...settings, [id]: !settings[id] });
    const handleSubmit = (e) => { e.preventDefault(); console.log('Saving notifications:', settings); };

    const handleTestEmail = async (e) => {
        e.preventDefault();
        if (!testEmail) return;
        setTestStatus('loading');
        try {
            const result = await sendInvoiceToCustomer({
                customer: 'Test User',
                customerEmail: testEmail,
                id: 'TEST-001',
                amount: '100',
                currency: 'STRK',
                dueDate: new Date().toISOString().split('T')[0],
                paymentLink: window.location.origin,
                senderName: 'Tradazone',
            });
            setTestStatus(result.success ? 'ok' : 'err');
        } catch {
            setTestStatus('err');
        }
    };

    return (
        <div>
            <h2 className="text-lg font-semibold mb-6">Notification Preferences</h2>

            {/* Email configuration status */}
            <div className={`p-4 border mb-6 flex items-start gap-3 ${isEmailConfigured ? 'bg-success-bg border-success/20' : 'bg-warning-bg border-warning/20'}`}>
                <Mail size={18} className={`flex-shrink-0 mt-0.5 ${isEmailConfigured ? 'text-success' : 'text-warning'}`} />
                <div className="flex-1">
                    <p className={`text-sm font-medium ${isEmailConfigured ? 'text-success' : 'text-warning'}`}>
                        {isEmailConfigured ? 'EmailJS is configured' : 'EmailJS not configured'}
                    </p>
                    <p className="text-xs text-t-muted mt-0.5">
                        {isEmailConfigured
                            ? 'Transactional emails (invoice send, payment receipt) are active.'
                            : 'Set VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_PUBLIC_KEY, and template IDs in your .env to enable email delivery.'}
                    </p>
                </div>
            </div>

            {/* Email toggle */}
            <div className="bg-white border border-border p-5 mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="block text-sm font-medium text-t-primary">Email Notifications</span>
                        <span className="block text-xs text-t-muted mt-0.5">
                            Send transactional emails via EmailJS (max 200/month on free tier)
                        </span>
                    </div>
                    <Toggle
                        checked={emailEnabled && isEmailConfigured}
                        onChange={() => setEmailEnabled((v) => !v)}
                        disabled={!isEmailConfigured}
                    />
                </div>

                {/* Test email form */}
                {isEmailConfigured && emailEnabled && (
                    <form onSubmit={handleTestEmail} className="mt-4 pt-4 border-t border-border flex gap-3">
                        <Input
                            placeholder="Send a test email to…"
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            className="flex-1"
                        />
                        <Button type="submit" variant="secondary" loading={testStatus === 'loading'} size="medium">
                            Send Test
                        </Button>
                        {testStatus === 'ok' && <CheckCircle size={20} className="text-success self-center flex-shrink-0" />}
                        {testStatus === 'err' && <AlertCircle size={20} className="text-error self-center flex-shrink-0" />}
                    </form>
                )}
            </div>

            {/* Per-notification toggles */}
            <form onSubmit={handleSubmit}>
                <div className="flex flex-col gap-0">
                    {notificationOptions.map((option) => (
                        <div key={option.id} className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
                            <div>
                                <span className="block text-sm font-medium text-t-primary">{option.title}</span>
                                <span className="block text-xs text-t-muted mt-0.5">{option.description}</span>
                            </div>
                            <Toggle checked={settings[option.id]} onChange={() => handleToggle(option.id)} />
                        </div>
                    ))}
                </div>
                <div className="flex justify-end pt-6">
                    <Button type="submit" variant="primary">Save Preferences</Button>
                </div>
            </form>
        </div>
    );
}

export default NotificationSettings;
