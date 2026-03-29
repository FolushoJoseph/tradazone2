import { useEffect, useState } from 'react';
import { User } from 'lucide-react';
import Input from '../../components/forms/Input';
import Button from '../../components/forms/Button';
import RichTextEditor from '../../components/forms/RichTextEditor';
import { useAuthActions, useAuthUser } from '../../context/AuthContext';
import StagingBanner from '../../components/ui/StagingBanner';

// BUG FIX: Form submission succeeded without validating required fields (name, email).
// Added a `errors` state and a validate() guard in handleSubmit so the form
// cannot be submitted with blank required fields.

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
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        company: user.company || '',
        address: user.address || '',
        profileDescription: user.profileDescription || '',
    };
}

function ProfileSettings() {
    // ISSUE #76: this page only needs the persisted user profile fields.
    // Subscribing to the entire auth context caused unrelated wallet/runtime
    // updates to redraw the whole settings form while the user was editing it.
    const user = useAuthUser();
    const { updateProfile } = useAuthActions();
    const [formData, setFormData] = useState(() => getFormDataFromUser(user));
    const [errors, setErrors] = useState({});
    const [saveMessage, setSaveMessage] = useState('');

    useEffect(() => {
        setFormData(getFormDataFromUser(user));
    }, [user]);

    const validate = () => {
        const next = {};
        if (!formData.name.trim()) next.name = 'Full name is required.';
        if (!formData.email.trim()) next.email = 'Email is required.';
        return next;
    };

    const handleChange = (field) => (e) => {
        setFormData({ ...formData, [field]: e.target.value });
        if (errors[field]) setErrors({ ...errors, [field]: undefined });
        if (saveMessage) setSaveMessage('');
    };

    const handleDescriptionChange = (value) => {
        setFormData((current) => ({ ...current, profileDescription: value }));
        if (saveMessage) setSaveMessage('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const next = validate();
        if (Object.keys(next).length) { setErrors(next); return; }
        updateProfile(formData);
        setSaveMessage('Profile saved for this session.');
    };

    const handleReset = () => {
        setFormData(getFormDataFromUser(user));
        setErrors({});
        setSaveMessage('');
    };

    const hasProfile = formData.name.trim() || formData.email.trim() || formData.phone.trim() || formData.company.trim() || formData.address.trim() || formData.profileDescription.trim();

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
        </div>
    );
}

export default ProfileSettings;