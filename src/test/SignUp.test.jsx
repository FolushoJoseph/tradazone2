import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

let mockNavigate;
let mockSearchParams;
let mockUser;
let mockOnConnectArgs;
const mockConnectWallet = vi.fn();
const mockDispatchWebhook = vi.fn().mockResolvedValue({ ok: true });

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        BrowserRouter: ({ children }) => React.createElement(React.Fragment, null, children),
        useNavigate: () => mockNavigate,
        useSearchParams: () => [mockSearchParams],
    };
});

vi.mock('../components/ui/Logo', () => ({
    default: () => React.createElement('div', { 'data-testid': 'logo' }),
}));

vi.mock('../assets/auth-splash.svg', () => ({ default: 'splash.svg' }));

vi.mock('../services/webhook', () => ({
    dispatchWebhook: (...args) => mockDispatchWebhook(...args),
}));

vi.mock('../config/env', () => ({
    IS_STAGING: false,
    APP_NAME: 'Tradazone',
}));

vi.mock('../context/AuthContext', () => ({
    useAuthActions: () => ({ connectWallet: mockConnectWallet }),
    useAuthUser: () => mockUser,
}));

vi.mock('../components/ui/ConnectWalletModal', () => ({
    default: ({ isOpen, onConnect }) => (
        isOpen ? (
            <button
                data-testid="mock-connect-success"
                onClick={() => onConnect(mockOnConnectArgs.walletAddress, mockOnConnectArgs.walletType)}
            >
                Simulate Connect
            </button>
        ) : null
    ),
}));

async function renderSignUp() {
    const { default: SignUp } = await import('../pages/auth/SignUp');
    const { BrowserRouter } = await import('react-router-dom');

    render(
        React.createElement(
            BrowserRouter,
            null,
            React.createElement(SignUp)
        )
    );
}

beforeEach(() => {
    localStorage.clear();
    mockNavigate = vi.fn();
    mockSearchParams = new URLSearchParams();
    mockUser = { isAuthenticated: false, walletAddress: null, walletType: null };
    mockOnConnectArgs = { walletAddress: '0xWALLET', walletType: 'evm' };
    mockConnectWallet.mockReset();
    mockDispatchWebhook.mockClear();
});

describe('SignUp', () => {
    it('renders the onboarding copy', async () => {
        await renderSignUp();

        expect(screen.getByText(/Manage clients, send invoices/i)).toBeInTheDocument();
        expect(screen.getByText('Connect your wallet to get started')).toBeInTheDocument();
        expect(screen.getByText('Connect Wallet')).toBeInTheDocument();
    });

    it('redirects authenticated users immediately', async () => {
        mockSearchParams = new URLSearchParams('redirect=/dashboard');
        mockUser = { isAuthenticated: true, walletAddress: '0xAUTH', walletType: 'evm' };

        await renderSignUp();

        expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });

    it('fires the signup webhook and navigates after a successful wallet connection', async () => {
        const user = userEvent.setup();
        await renderSignUp();

        await user.click(screen.getByText('Connect Wallet'));
        await user.click(screen.getByTestId('mock-connect-success'));

        expect(mockDispatchWebhook).toHaveBeenCalledWith('user.signed_up', {
            walletAddress: '0xWALLET',
            walletType: 'evm',
        });
        expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true });
    });

    it('exports a csv snapshot of the current signup state', async () => {
        const user = userEvent.setup();
        const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        let appendedLink = null;
        const realAppendChild = document.body.appendChild.bind(document.body);
        const realRemoveChild = document.body.removeChild.bind(document.body);

        const appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((element) => {
            appendedLink = element;
            return realAppendChild(element);
        });
        const removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((element) => {
            return realRemoveChild(element);
        });

        mockUser = { isAuthenticated: false, walletAddress: null, walletType: null };

        await renderSignUp();
        await user.click(screen.getByRole('button', { name: /export signup data to csv/i }));

        expect(appendedLink).toBeTruthy();
        expect(appendedLink.getAttribute('download')).toBe('auth_data.csv');
        expect(clickSpy).toHaveBeenCalled();

        appendSpy.mockRestore();
        removeSpy.mockRestore();
        clickSpy.mockRestore();
    });

    it('falls back to the auth user wallet metadata when modal data is missing', async () => {
        const user = userEvent.setup();
        mockUser = { isAuthenticated: false, walletAddress: '0xFALLBACK', walletType: 'stellar' };
        mockOnConnectArgs = { walletAddress: null, walletType: null };

        await renderSignUp();
        await user.click(screen.getByRole('button', { name: /connect wallet/i }));
        await user.click(screen.getByTestId('mock-connect-success'));

        expect(mockDispatchWebhook).toHaveBeenCalledWith('user.signed_up', {
            walletAddress: '0xFALLBACK',
            walletType: 'stellar',
        });
    });
});
