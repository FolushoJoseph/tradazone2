import { useEffect, useState } from 'react';
import Input from '../../components/forms/Input';
import Button from '../../components/forms/Button';
import { useAuthUser } from '../../context/AuthContext';
import StagingBanner from '../../components/ui/StagingBanner';

// BUG FIX: Form submission succeeded without validating required fields (name, email).
// Added a `errors` state and a validate() guard in handleSubmit so the form
// cannot be submitted with blank required fields.
function ProfileSettings() {
    // ISSUE #76: this page only needs the persisted user profile fields.
    // Subscribing to the entire auth context caused unrelated wallet/runtime
    // updates to redraw the whole settings form while the user was editing it.
    const user = useAuthUser();
    const [formData, setFormData] = useState({
        name: user.name || '', email: user.email || '', phone: '', company: '', address: ''
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        setFormData((current) => ({
            ...current,
            name: user.name || '',
            email: user.email || '',
        }));
    }, [user.email, user.name]);

    const validate = () => {
        const next = {};
        if (!formData.name.trim()) next.name = 'Full name is required.';
        if (!formData.email.trim()) next.email = 'Email is required.';
        return next;
    };

    const handleChange = (field) => (e) => {
        setFormData({ ...formData, [field]: e.target.value });
        if (errors[field]) setErrors({ ...errors, [field]: undefined });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const next = validate();
        if (Object.keys(next).length) { setErrors(next); return; }
        // API submit logic would go here
    };

    return (
        <div>
            <StagingBanner />
            <h2 className="text-lg font-semibold mb-6 mt-4">Profile Settings</h2>
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
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                    <Button variant="secondary">Cancel</Button>
                    <Button type="submit" variant="primary">Save Changes</Button>
                </div>
            </form>
        </div>
    );
}

export default ProfileSettings;