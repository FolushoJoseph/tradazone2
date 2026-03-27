// File: src/components/settings/__tests__/ProfileSettings.integration.test.tsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileSettings } from '../ProfileSettings';
import { AuthProvider } from '../../../contexts/AuthContext';
import { ApiProvider } from '../../../contexts/ApiContext';

// Integration test with real providers
describe('ProfileSettings Integration', () => {
  const mockUserId = 'user-123';
  
  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <AuthProvider>
        <ApiProvider>
          {component}
        </ApiProvider>
      </AuthProvider>
    );
  };
  
  it('should handle complete user flow: load, edit, save, verify', async () => {
    renderWithProviders(<ProfileSettings userId={mockUserId} />);
    
    // Wait for load
    await waitFor(() => {
      expect(screen.getByTestId('profile-settings')).toBeInTheDocument();
    });
    
    // Edit fields
    const nameInput = screen.getByTestId('name-input');
    const emailInput = screen.getByTestId('email-input');
    const bioInput = screen.getByTestId('bio-input');
    
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Updated Name');
    
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'updated@example.com');
    
    await userEvent.clear(bioInput);
    await userEvent.type(bioInput, 'Updated bio information');
    
    // Save changes
    const saveButton = screen.getByTestId('save-button');
    await userEvent.click(saveButton);
    
    // Verify success
    await waitFor(() => {
      expect(screen.getByTestId('save-success')).toBeInTheDocument();
    });
  });
  
  it('should prevent submission with invalid data', async () => {
    renderWithProviders(<ProfileSettings userId={mockUserId} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('email-input')).toBeInTheDocument();
    });
    
    const emailInput = screen.getByTestId('email-input');
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'invalid-email');
    
    const saveButton = screen.getByTestId('save-button');
    expect(saveButton).toBeDisabled();
    
    expect(screen.getByTestId('email-error')).toBeInTheDocument();
  });
});