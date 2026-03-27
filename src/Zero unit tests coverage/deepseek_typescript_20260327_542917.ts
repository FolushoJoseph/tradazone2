// File: src/components/settings/__tests__/ProfileSettings.test.tsx
import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileSettings } from '../ProfileSettings';
import { useAuth } from '../../../hooks/useAuth';
import { apiService } from '../../../services/api';

// Mock dependencies
jest.mock('../../../hooks/useAuth');
jest.mock('../../../services/api');
jest.mock('../../../utils/validation', () => ({
  validateEmail: jest.fn(),
  validatePhone: jest.fn(),
  sanitizeInput: jest.fn((input) => input?.trim() || '')
}));

import { validateEmail, validatePhone } from '../../../utils/validation';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockApiService = apiService as jest.Mocked<typeof apiService>;

describe('ProfileSettings', () => {
  const mockUserId = 'user-123';
  const mockProfileData = {
    id: 'user-123',
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890',
    bio: 'Software developer',
    avatar: '',
    preferences: {
      notifications: true,
      twoFactorAuth: false,
      language: 'en'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup auth mock
    mockUseAuth.mockReturnValue({
      user: { id: mockUserId },
      updateProfile: jest.fn()
    } as any);
    
    // Setup API mock
    mockApiService.getProfile.mockResolvedValue(mockProfileData);
    mockApiService.updateProfile.mockResolvedValue(mockProfileData);
    
    // Setup validation mocks
    (validateEmail as jest.Mock).mockImplementation((email) => {
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    });
    (validatePhone as jest.Mock).mockImplementation((phone) => {
      return /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,6}[-\s\.]?[0-9]{1,6}$/.test(phone);
    });
  });

  describe('Initial Load', () => {
    it('should show loading state initially', () => {
      render(<ProfileSettings userId={mockUserId} />);
      expect(screen.getByTestId('profile-loading')).toBeInTheDocument();
    });

    it('should load and display profile data', async () => {
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('profile-settings')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('name-input')).toHaveValue(mockProfileData.name);
      expect(screen.getByTestId('email-input')).toHaveValue(mockProfileData.email);
      expect(screen.getByTestId('phone-input')).toHaveValue(mockProfileData.phone);
      expect(screen.getByTestId('bio-input')).toHaveValue(mockProfileData.bio);
    });

    it('should handle API error during load', async () => {
      mockApiService.getProfile.mockRejectedValue(new Error('Network error'));
      
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('profile-error')).toBeInTheDocument();
      });
    });
  });

  describe('Validation Logic', () => {
    it('should validate name field - minimum length', async () => {
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('name-input')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'A' } });
      
      expect(screen.getByTestId('name-error')).toHaveTextContent('Name must be at least 2 characters');
    });

    it('should validate name field - maximum length', async () => {
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('name-input')).toBeInTheDocument();
      });
      
      const longName = 'A'.repeat(101);
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: longName } });
      
      expect(screen.getByTestId('name-error')).toHaveTextContent('Name must be less than 100 characters');
    });

    it('should validate email format', async () => {
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('email-input')).toBeInTheDocument();
      });
      
      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      
      expect(screen.getByTestId('email-error')).toHaveTextContent('Invalid email format');
    });

    it('should validate phone number format', async () => {
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('phone-input')).toBeInTheDocument();
      });
      
      const phoneInput = screen.getByTestId('phone-input');
      fireEvent.change(phoneInput, { target: { value: 'invalid-phone' } });
      
      expect(screen.getByTestId('phone-error')).toHaveTextContent('Invalid phone number format');
    });

    it('should accept valid phone number', async () => {
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('phone-input')).toBeInTheDocument();
      });
      
      const phoneInput = screen.getByTestId('phone-input');
      fireEvent.change(phoneInput, { target: { value: '+1234567890' } });
      
      expect(screen.queryByTestId('phone-error')).not.toBeInTheDocument();
    });

    it('should validate bio length', async () => {
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('bio-input')).toBeInTheDocument();
      });
      
      const longBio = 'A'.repeat(501);
      const bioInput = screen.getByTestId('bio-input');
      fireEvent.change(bioInput, { target: { value: longBio } });
      
      expect(screen.getByTestId('bio-error')).toHaveTextContent('Bio must be less than 500 characters');
    });
  });

  describe('Save Functionality', () => {
    it('should save changes when valid data is provided', async () => {
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('name-input')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
      
      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).not.toBeDisabled();
      
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockApiService.updateProfile).toHaveBeenCalledWith(
          mockUserId,
          expect.objectContaining({ name: 'Jane Doe' })
        );
      });
      
      expect(screen.getByTestId('save-success')).toBeInTheDocument();
    });

    it('should not save when validation fails', async () => {
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('email-input')).toBeInTheDocument();
      });
      
      const emailInput = screen.getByTestId('email-input');
      fireEvent.change(emailInput, { target: { value: 'invalid' } });
      
      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toBeDisabled();
      
      fireEvent.click(saveButton);
      expect(mockApiService.updateProfile).not.toHaveBeenCalled();
    });

    it('should show loading state while saving', async () => {
      mockApiService.updateProfile.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));
      
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('name-input')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
      
      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('Saving...')).toBeInTheDocument();
      expect(saveButton).toBeDisabled();
      
      await waitFor(() => {
        expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
      });
    });

    it('should handle save API error', async () => {
      mockApiService.updateProfile.mockRejectedValue(new Error('Save failed'));
      
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('name-input')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
      
      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('submit-error')).toHaveTextContent('Failed to save profile changes');
      });
    });

    it('should call onSave callback when provided', async () => {
      const onSaveMock = jest.fn();
      render(<ProfileSettings userId={mockUserId} onSave={onSaveMock} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('name-input')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
      
      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(onSaveMock).toHaveBeenCalled();
      });
    });
  });

  describe('Cancel Functionality', () => {
    it('should reload original data when cancel is clicked with changes', async () => {
      mockApiService.getProfile.mockResolvedValue(mockProfileData);
      
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('name-input')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
      
      expect(nameInput).toHaveValue('Jane Doe');
      
      // Mock confirm dialog
      window.confirm = jest.fn(() => true);
      
      const cancelButton = screen.getByTestId('cancel-button');
      fireEvent.click(cancelButton);
      
      await waitFor(() => {
        expect(nameInput).toHaveValue(mockProfileData.name);
      });
    });

    it('should not reload data if cancel is clicked without changes', async () => {
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
      });
      
      const cancelButton = screen.getByTestId('cancel-button');
      expect(cancelButton).toBeDisabled();
      
      fireEvent.click(cancelButton);
      
      // Verify getProfile was only called once (initial load)
      expect(mockApiService.getProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe('Read Only Mode', () => {
    it('should disable all inputs in readOnly mode', async () => {
      render(<ProfileSettings userId={mockUserId} readOnly={true} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('name-input')).toBeInTheDocument();
      });
      
      expect(screen.getByTestId('name-input')).toBeDisabled();
      expect(screen.getByTestId('email-input')).toBeDisabled();
      expect(screen.getByTestId('phone-input')).toBeDisabled();
      expect(screen.getByTestId('bio-input')).toBeDisabled();
      expect(screen.queryByTestId('save-button')).not.toBeInTheDocument();
    });
  });

  describe('Data Sanitization', () => {
    it('should sanitize inputs before saving', async () => {
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('name-input')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: '  John  Doe  ' } });
      
      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(mockApiService.updateProfile).toHaveBeenCalledWith(
          mockUserId,
          expect.objectContaining({ name: 'John  Doe' }) // Trimmed by sanitizeInput
        );
      });
    });
  });

  describe('Dirty State Management', () => {
    it('should enable save button only when fields are dirty', async () => {
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('save-button')).toBeInTheDocument();
      });
      
      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).toBeDisabled();
      
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
      
      expect(saveButton).not.toBeDisabled();
    });

    it('should clear dirty state after successful save', async () => {
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('name-input')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
      
      const saveButton = screen.getByTestId('save-button');
      expect(saveButton).not.toBeDisabled();
      
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(saveButton).toBeDisabled();
      });
    });
  });

  describe('Success Message', () => {
    it('should show success message after save and auto-hide after 3 seconds', async () => {
      jest.useFakeTimers();
      
      render(<ProfileSettings userId={mockUserId} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('name-input')).toBeInTheDocument();
      });
      
      const nameInput = screen.getByTestId('name-input');
      fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
      
      const saveButton = screen.getByTestId('save-button');
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(screen.getByTestId('save-success')).toBeInTheDocument();
      });
      
      act(() => {
        jest.advanceTimersByTime(3000);
      });
      
      expect(screen.queryByTestId('save-success')).not.toBeInTheDocument();
      
      jest.useRealTimers();
    });
  });
});