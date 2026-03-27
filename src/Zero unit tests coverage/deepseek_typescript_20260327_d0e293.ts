// Let's assume we're working with a React/TypeScript application
// I'll create a comprehensive solution with proper testing

// File: src/components/settings/ProfileSettings.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { validateEmail, validatePhone, sanitizeInput } from '../../utils/validation';
import { apiService } from '../../services/api';

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string;
  bio: string;
  avatar: string;
  preferences: {
    notifications: boolean;
    twoFactorAuth: boolean;
    language: string;
  };
}

interface ProfileSettingsProps {
  userId: string;
  onSave?: (data: ProfileData) => void;
  readOnly?: boolean;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ 
  userId, 
  onSave, 
  readOnly = false 
}) => {
  const { user, updateProfile } = useAuth();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirtyFields, setDirtyFields] = useState<Set<string>>(new Set());
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load profile data
  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    try {
      setLoading(true);
      const data = await apiService.getProfile(userId);
      setProfileData(data);
    } catch (error) {
      setErrors({ submit: 'Failed to load profile data' });
    } finally {
      setLoading(false);
    }
  };

  // Validation logic
  const validateField = (field: string, value: any): string => {
    switch (field) {
      case 'name':
        if (!value || value.trim().length < 2) {
          return 'Name must be at least 2 characters';
        }
        if (value.length > 100) {
          return 'Name must be less than 100 characters';
        }
        return '';

      case 'email':
        if (!value) {
          return 'Email is required';
        }
        if (!validateEmail(value)) {
          return 'Invalid email format';
        }
        return '';

      case 'phone':
        if (value && !validatePhone(value)) {
          return 'Invalid phone number format';
        }
        return '';

      case 'bio':
        if (value && value.length > 500) {
          return 'Bio must be less than 500 characters';
        }
        return '';

      default:
        return '';
    }
  };

  // Handle field changes
  const handleFieldChange = (field: keyof ProfileData, value: any) => {
    if (readOnly) return;

    const error = validateField(field, value);
    
    setErrors(prev => ({
      ...prev,
      [field]: error
    }));

    setProfileData(prev => prev ? {
      ...prev,
      [field]: value
    } : null);

    setDirtyFields(prev => new Set(prev).add(field));
    setSaveSuccess(false);
  };

  // Sanitize data before saving
  const sanitizeProfileData = (data: ProfileData): ProfileData => {
    return {
      ...data,
      name: sanitizeInput(data.name),
      bio: data.bio ? sanitizeInput(data.bio) : '',
      email: data.email.toLowerCase().trim(),
      phone: data.phone?.trim() || ''
    };
  };

  // Validate all fields before submission
  const validateAllFields = (data: ProfileData): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    
    Object.keys(data).forEach(field => {
      const value = data[field as keyof ProfileData];
      const error = validateField(field, value);
      if (error) {
        newErrors[field] = error;
      }
    });
    
    return newErrors;
  };

  // Save profile changes
  const handleSave = async () => {
    if (!profileData || readOnly) return;

    // Validate all fields
    const validationErrors = validateAllFields(profileData);
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    try {
      setSaving(true);
      const sanitizedData = sanitizeProfileData(profileData);
      
      // API call to update profile
      const updatedProfile = await apiService.updateProfile(userId, sanitizedData);
      
      // Update local state
      setProfileData(updatedProfile);
      setDirtyFields(new Set());
      setSaveSuccess(true);
      
      // Call onSave callback if provided
      if (onSave) {
        onSave(updatedProfile);
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      setErrors({ submit: 'Failed to save profile changes' });
    } finally {
      setSaving(false);
    }
  };

  // Cancel changes
  const handleCancel = () => {
    if (dirtyFields.size > 0 && confirm('You have unsaved changes. Are you sure you want to cancel?')) {
      loadProfileData(); // Reload original data
      setDirtyFields(new Set());
      setErrors({});
      setSaveSuccess(false);
    }
  };

  if (loading) {
    return <div data-testid="profile-loading">Loading profile...</div>;
  }

  if (!profileData) {
    return <div data-testid="profile-error">Failed to load profile</div>;
  }

  return (
    <div className="profile-settings" data-testid="profile-settings">
      <h2>Profile Settings</h2>
      
      {saveSuccess && (
        <div className="success-message" data-testid="save-success">
          Profile saved successfully!
        </div>
      )}
      
      {errors.submit && (
        <div className="error-message" data-testid="submit-error">
          {errors.submit}
        </div>
      )}
      
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
        <div className="form-group">
          <label htmlFor="name">Name *</label>
          <input
            id="name"
            type="text"
            value={profileData.name}
            onChange={(e) => handleFieldChange('name', e.target.value)}
            disabled={readOnly}
            data-testid="name-input"
          />
          {errors.name && <span className="error" data-testid="name-error">{errors.name}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email *</label>
          <input
            id="email"
            type="email"
            value={profileData.email}
            onChange={(e) => handleFieldChange('email', e.target.value)}
            disabled={readOnly}
            data-testid="email-input"
          />
          {errors.email && <span className="error" data-testid="email-error">{errors.email}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            type="tel"
            value={profileData.phone}
            onChange={(e) => handleFieldChange('phone', e.target.value)}
            disabled={readOnly}
            data-testid="phone-input"
          />
          {errors.phone && <span className="error" data-testid="phone-error">{errors.phone}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="bio">Bio</label>
          <textarea
            id="bio"
            value={profileData.bio}
            onChange={(e) => handleFieldChange('bio', e.target.value)}
            disabled={readOnly}
            rows={4}
            data-testid="bio-input"
          />
          {errors.bio && <span className="error" data-testid="bio-error">{errors.bio}</span>}
        </div>
        
        {!readOnly && (
          <div className="form-actions">
            <button 
              type="button" 
              onClick={handleCancel}
              disabled={saving || dirtyFields.size === 0}
              data-testid="cancel-button"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving || Object.keys(errors).some(k => errors[k]) || dirtyFields.size === 0}
              data-testid="save-button"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};