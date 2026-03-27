/**
 * ProfileSettings Component
 * 
 * @component
 * @description A comprehensive profile settings form with validation, error handling, and state management.
 * 
 * Critical Features:
 * - Form validation for name, email, phone, and bio fields
 * - Real-time validation feedback
 * - Dirty state tracking for unsaved changes
 * - Cancel confirmation for unsaved changes
 * - Read-only mode support
 * - Data sanitization before submission
 * - Comprehensive error handling
 * - Loading states for async operations
 * 
 * @example
 * // Basic usage
 * <ProfileSettings userId="user-123" />
 * 
 * @example
 * // With save callback
 * <ProfileSettings 
 *   userId="user-123" 
 *   onSave={(data) => console.log('Saved:', data)}
 * />
 * 
 * @example
 * // Read-only mode
 * <ProfileSettings userId="user-123" readOnly={true} />
 * 
 * @param {Object} props - Component props
 * @param {string} props.userId - User ID to load profile for
 * @param {Function} [props.onSave] - Callback fired when profile is successfully saved
 * @param {boolean} [props.readOnly=false] - If true, disables all form inputs
 * 
 * @returns {JSX.Element} Rendered profile settings form
 * 
 * @test {@link ProfileSettings.test.tsx} - Comprehensive unit test coverage
 * @test-coverage
 * - Initial load states
 * - Validation logic for all fields
 * - Save functionality with validation
 * - Cancel and reload functionality
 * - Read-only mode
 * - Error handling
 * - Dirty state management
 * - Success message auto-hide
 */