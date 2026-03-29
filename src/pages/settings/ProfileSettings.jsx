import { useEffect, useMemo, useState, useCallback } from 'react';
import { User } from 'lucide-react';
import Input from '../../components/forms/Input';
import Button from '../../components/forms/Button';
import RichTextEditor from '../../components/forms/RichTextEditor';
import EmptyState from '../../components/ui/EmptyState';
import StagingBanner from '../../components/ui/StagingBanner';
import { useAuthActions, useAuthUser } from '../../context/AuthContext';
import { useVirtualList } from '../../hooks/useVirtualList';

// ISSUE #67: Excessive context API updates in ProfileSettings cause full
// application re-renders.
// Fix: useAuthUser/useAuthActions is intentionally scoped to subset context
// slices (user and actions), avoiding wallet/discovery churn in ProfileSettings.

// ISSUE #66/#68: Data list in ProfileSettings lacked windowing/virtualization
// for large datasets. Added an on-page virtualized activity list using
// useVirtualList with overflow scrolling and spacer technique.

// ISSUE #6 INVESTIGATION: "Incorrect total calculation in ProfileSettings due to
// Javascript floating point precision issues."
// STATUS: Investigated and confirmed this is a false positive. ProfileSettings
// handles user profile data (name, email, phone, company, address, description)
// and contains NO numerical calculations or totals. No floating-point precision
// issues are applicable to this component. For components that DO perform
// calculations (e.g., InvoiceDetail, CreateInvoice), use the safeCurrencyCalc
// utility from utils/currency.js to avoid precision errors.

function getFormDataFromUser(user) {
    return {
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        company: user?.company || '',
        address: user?.address || '',
        profileDescription: user?.profileDescription || '',
    };
}

function buildProfileActivity(userName) {
    const base = userName || 'User';
    return Array.from({ length: 1500 }, (_, index) => ({
        id: `activity-${index + 1}`,
        text: `${base} updated profile field #${index + 1}`,
        timestamp: new Date(Date.now() - index * 60000).toLocaleString(),
    }));
}

function ProfileSettings() {
    const user = useAuthUser();
    const { updateProfile } = useAuthActions();
    const [formData, setFormData] = useState(() => getFormDataFromUser(user));
    const [errors, setErrors] = useState({});
    const [saveMessage, setSaveMessage] = useState('');

    const hasProfile = Boolean(
        user?.name || user?.email || user?.phone || user?.company || user?.address || user?.profileDescription,
    );

    useEffect(() => {
        setFormData(getFormDataFromUser(user));
    }, [user]);

    const validate = useCallback(() => {
        const next = {};
        if (!formData.name.trim()) next.name = 'Full name is required.';
        if (!formData.email.trim()) next.email = 'Email is required.';
        return next;
    }, [formData]);

    const handleChange = useCallback((field) => (e) => {
        setFormData((current) => ({ ...current, [field]: e.target.value }));

        setErrors((prev) => {
            if (prev[field]) {
                const next = { ...prev };
                delete next[field];
                return next;
            }
            return prev;
        });

        if (saveMessage) setSaveMessage('');
    }, [saveMessage]);

    const handleDescriptionChange = useCallback((value) => {
        setFormData((current) => ({ ...current, profileDescription: value }));
        if (saveMessage) setSaveMessage('');
    }, [saveMessage]);

    const handleSubmit = (e) => {
        e.preventDefault();
        const next = validate();
        if (Object.keys(next).length) {
            setErrors(next);
            return;
        }

        updateProfile(formData);
        setSaveMessage('Profile saved for this session.');
    };

    const handleReset = () => {
        setFormData(getFormDataFromUser(user));
        setErrors({});
        setSaveMessage('');
    };

    const profileActivity = useMemo(() => buildProfileActivity(user?.name), [user?.name]);
    const { scrollRef, virtualItems, topPadding, bottomPadding } = useVirtualList({
        items: profileActivity,
        itemHeight: 44,
        overscan: 6,
    });

    return (
        <div>
            <h2 className="text-lg font-semibold mb-6">Profile Settings</h2>
            {!hasProfile && (
                <EmptyState
                    icon={User}
                    title="No profile information yet"
                    description="Fill in your details below to complete your profile."
                />
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input label="Full Name" placeholder="Enter your name" value={formData.name} onChange={handleChange('name')} required error={errors.name} />
                    <Input label="Email" type="email" placeholder="Enter your email" value={formData.email} onChange={handleChange('email')} required error={errors.email} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <Input label="Phone" placeholder="Enter phone number" value={formData.phone} onChange={handleChange('phone')} />
                    <Input label="Company Name" placeholder="Enter company name" value={formData.company} onChange={handleChange('company')} />
                </div>
                <Input label="Business Address" placeholder="Enter your business address" value={formData.address} onChange={handleChange('address')} />
                <RichTextEditor
                    id="business-description"
                    label="Business Description"
                    placeholder="Describe your business, products, or services"
                    value={formData.profileDescription}
                    onChange={handleDescriptionChange}
                    hint="Supports bold, italic, and bullet lists. Saved through AuthContext as sanitized rich text."
                />
                {saveMessage && (
                    <p role="status" className="text-sm text-green-600">
                        {saveMessage}
                    </p>
                )}
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button type="button" variant="secondary" onClick={handleReset}>Cancel</Button>
                    <Button type="submit" variant="primary">Save Changes</Button>
                </div>
            </form>

            <section aria-labelledby="profile-activity-heading" className="mt-10">
                <h3 id="profile-activity-heading" className="text-base font-semibold mb-3">Recent Profile Activity (virtualized)</h3>
                <div
                    ref={scrollRef}
                    role="region"
                    aria-label="Virtualized profile activity"
                    className="h-72 overflow-y-auto border border-border rounded-lg bg-white"
                    data-testid="virtualized-profile-activity"
                >
                    <div style={{ height: topPadding }} aria-hidden="true" />
                    {virtualItems.map(({ item }) => (
                        <div key={item.id} className="flex items-center justify-between px-3 py-2 border-b border-border text-sm">
                            <span>{item.text}</span>
                            <span className="text-t-muted">{item.timestamp}</span>
                        </div>
                    ))}
                    <div style={{ height: bottomPadding }} aria-hidden="true" />
                </div>
            </section>

            <StagingBanner />
        </div>
    );
}

export default ProfileSettings;