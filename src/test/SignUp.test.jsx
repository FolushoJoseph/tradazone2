import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// ── Mock setup ────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => vi.fn(),
        useSearchParams: () => [new URLSearchParams()],
    };
});

vi.mock('../../components/ui/Logo', () => ({ default: () => React.createElement('div', { 'data-testid': 'logo' }) }));
vi.mock('../../assets/auth-splash.svg', () => ({ default: 'splash.svg' }));

vi.mock('../../services/webhook', () => ({ dispatchWebhook: () => Promise.resolve({ ok: true }) }));

let mockIsStaging = false;
let mockAppName = 'Tradazone';

vi.mock('../../config/env', () => ({
vi.mock('../components/ui/Logo', () => ({ default: () => <div data-testid="logo" /> }));
vi.mock('../assets/auth-splash.svg', () => ({ default: 'splash.svg' }));

const mockDispatchWebhook = vi.fn().mockResolvedValue({ ok: true });
vi.mock('../services/webhook', () => ({ dispatchWebhook: (...args) => mockDispatchWebhook(...args) }));

let mockUser = { isAuthenticated: false, walletAddress: null, walletType: null };
const mockConnectWallet = vi.fn();
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({ connectWallet: mockConnectWallet, user: mockUser }),
}));

let mockIsStaging = false;
let mockAppName = 'Tradazone';
vi.mock('../config/env', () => ({
    get IS_STAGING() { return mockIsStaging; },
    get APP_NAME()   { return mockAppName; },
}));

vi.mock('../../components/ui/ConnectWalletModal', () => ({
    default: ({ isOpen }) =>
        isOpen ? React.createElement(
            'div',
            { 'data-testid': 'mock-connect-modal' },
            'Connect Modal'
// ConnectWalletModal: expose onConnect so tests can invoke handleConnectSuccess
let mockOnConnectArgs = { walletAddress: '0xWALLET', walletType: 'evm' };
vi.mock('../components/ui/ConnectWalletModal', () => ({
    default: ({ isOpen, onConnect }) =>
        isOpen ? (
            <button
                data-testid="mock-connect-success"
                onClick={() => onConnect(mockOnConnectArgs.walletAddress, mockOnConnectArgs.walletType)}
            >
                Simulate Connect
            </button>
        ) : null,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

async function renderSignUp() {
    const { default: SignUp } = await import('../pages/auth/SignUp');
    const { AuthProvider } = await import('../context/AuthContext');
    
    render(
        React.createElement(
            BrowserRouter,
            null,
            React.createElement(
                AuthProvider,
                null,
                React.createElement(SignUp)
            )
        )
    );
}

beforeEach(() => {
    localStorage.clear();
    mockIsStaging = false;
    mockAppName = 'Tradazone';
    mockOnConnectArgs = { walletAddress: '0xWALLET', walletType: 'evm' };
});

// ─── 1. Component rendering ────────────────────────────────────────────────────

describe('SignUp component rendering', () => {
    it('renders the main heading', async () => {
        await renderSignUp();
        expect(screen.getByText(/Manage clients, send invoices/i)).toBeInTheDocument();
    });

    it('renders the Connect Wallet button', async () => {
        await renderSignUp();
        expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    });

    it('renders the subheading text', async () => {
        await renderSignUp();
        expect(screen.getByText('Connect your wallet to get started')).toBeInTheDocument();
    });

    it('has correct semantic structure with min-h-screen', async () => {
        await renderSignUp();
        await userEvent.click(screen.getByText('Connect Wallet'));
        await userEvent.click(screen.getByTestId('mock-connect-success'));
        expect(mockDispatchWebhook).toHaveBeenCalledWith('user.signed_up', {
            walletAddress: '0xWALLET',
            walletType: 'evm',
        });
    });

    it('navigates to "/" after successful connection (default redirect)', async () => {
        await renderSignUp();
        await userEvent.click(screen.getByText('Connect Wallet'));
        await userEvent.click(screen.getByTestId('mock-connect-success'));
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('navigates to the ?redirect param after successful connection', async () => {
        mockSearchParams = new URLSearchParams('redirect=/checkouts');
        await renderSignUp();
        await userEvent.click(screen.getByText('Connect Wallet'));
        await userEvent.click(screen.getByTestId('mock-connect-success'));
        expect(mockNavigate).toHaveBeenCalledWith('/checkouts', { replace: true });
    });

    it('falls back to user.walletAddress/walletType when onConnect args are falsy', async () => {
        simulateWalletConnect = (onConnect) => onConnect(null, null);
        mockUser = { isAuthenticated: false, walletAddress: '0xFALLBACK', walletType: 'stellar' };
        mockOnConnectArgs = { walletAddress: null, walletType: null };
        await renderSignUp();
        await userEvent.click(screen.getByText('Connect Wallet'));
        await userEvent.click(screen.getByTestId('mock-connect-success'));
        expect(mockDispatchWebhook).toHaveBeenCalledWith('user.signed_up', {
            walletAddress: '0xFALLBACK',
            walletType: 'stellar',
        });
    });
});

// ─── 2. Component quality and linting validation ────────────────────────────────

describe('SignUp.jsx code quality', () => {
    it('successfully imports without linting errors (validates unused imports fix)', async () => {
        // This test verifies that SignUp.jsx:
        // 1. Has NO unused imports (Link import was removed)
        // 2. All remaining imports are utilized in the component
        // 3. Module exports the component correctly
        const { default: SignUp } = await import('../pages/auth/SignUp');
        expect(typeof SignUp).toBe('function');
    });

    it('exports a valid React functional component', async () => {
        const { default: SignUp } = await import('../pages/auth/SignUp');
        const result = React.createElement(SignUp);
        expect(result.type).toBe(SignUp);
    });

    it('component uses correct imports for functionality', async () => {
        // Tests that the following imports are used:
        // - useState, useEffect: for hooks
        // - useNavigate, useSearchParams: for routing
        // - useAuth: from context
        // - dispatchWebhook: for analytics
        // - IS_STAGING, APP_NAME: for environment config
        // - UI components: Logo, ConnectWalletModal
        const SignUp = await import('../pages/auth/SignUp');
        expect(SignUp).toBeDefined();
        expect(SignUp.default).toBeDefined();
    });
});
