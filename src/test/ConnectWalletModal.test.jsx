import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// #64: verify that the search input is responsive (updates immediately) but
// the wallet list filter is debounced by 300 ms.

const mockAvailableWallets = [
    { id: 'stellar', name: 'LOBSTR', network: 'stellar', networkName: 'Stellar Network', isRecommended: true, isInstalled: false },
    { id: 'starknet', name: 'Argent', network: 'starknet', networkName: 'Starknet Network', isInstalled: false },
    { id: 'metamask', name: 'MetaMask', network: 'evm', networkName: 'EVM Network', isInstalled: false },
];

vi.mock('../context/AuthContext', () => ({
    useAuthActions: () => ({ completeWalletLogin: vi.fn(), disconnectAll: vi.fn() }),
    useAuthWalletState: () => ({ wallet: { isConnected: false } }),
    useAuthWalletCatalog: () => ({
        installed: { discovered: [] },
        availableWallets: mockAvailableWallets,
    }),
}));

vi.mock('../hooks/useLobstr', () => ({
    useLobstr: () => ({ connect: vi.fn(), isConnecting: false }),
}));

vi.mock('../hooks/useFocusTrap', () => ({
    useFocusTrap: () => ({ current: null }),
}));

vi.mock('./StagingBanner', () => ({ default: () => null }));
vi.mock('./Logo', () => ({ default: () => <div data-testid="logo" /> }));

async function renderModal() {
    const { default: ConnectWalletModal } = await import('../components/ui/ConnectWalletModal');
    render(
        <MemoryRouter>
            <ConnectWalletModal
                isOpen={true}
                onClose={vi.fn()}
                onConnect={vi.fn()}
                connectWalletFn={vi.fn().mockResolvedValue({ success: true })}
            />
        </MemoryRouter>
    );
}

beforeEach(() => {
    vi.useFakeTimers();
});

afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
});

describe('ConnectWalletModal search debounce (Issue #64)', () => {
    it('updates the input value immediately on each keystroke', async () => {
        await act(async () => { await renderModal(); });

        const input = screen.getByPlaceholderText('Search wallets...');
        fireEvent.change(input, { target: { value: 'meta' } });

        expect(input.value).toBe('meta');
    });

    it('does not filter the wallet list before 300 ms have elapsed', async () => {
        await act(async () => { await renderModal(); });

        const input = screen.getByPlaceholderText('Search wallets...');
        fireEvent.change(input, { target: { value: 'meta' } });

        // Advance only 299 ms — debounce has not fired yet
        act(() => { vi.advanceTimersByTime(299); });

        // All 3 wallets should still be visible (filter not applied yet)
        expect(screen.getByText('LOBSTR')).toBeTruthy();
        expect(screen.getByText('Argent')).toBeTruthy();
        expect(screen.getByText('MetaMask')).toBeTruthy();
    });

    it('filters the wallet list after 300 ms have elapsed', async () => {
        await act(async () => { await renderModal(); });

        const input = screen.getByPlaceholderText('Search wallets...');
        fireEvent.change(input, { target: { value: 'meta' } });

        // Advance exactly 300 ms — debounce fires
        act(() => { vi.advanceTimersByTime(300); });

        expect(screen.getByText('MetaMask')).toBeTruthy();
        expect(screen.queryByText('LOBSTR')).toBeNull();
        expect(screen.queryByText('Argent')).toBeNull();
    });

    it('resets the filter when the input is cleared after debounce', async () => {
        await act(async () => { await renderModal(); });

        const input = screen.getByPlaceholderText('Search wallets...');
        fireEvent.change(input, { target: { value: 'meta' } });
        act(() => { vi.advanceTimersByTime(300); });

        fireEvent.change(input, { target: { value: '' } });
        act(() => { vi.advanceTimersByTime(300); });

        expect(screen.getByText('LOBSTR')).toBeTruthy();
        expect(screen.getByText('Argent')).toBeTruthy();
        expect(screen.getByText('MetaMask')).toBeTruthy();
    });
});
