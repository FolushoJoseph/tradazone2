import { useState } from 'react';
import { Wallet, LogOut, Copy, CheckCircle, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Button from '../../components/forms/Button';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import ConnectWalletModal from '../../components/ui/ConnectWalletModal';

function StellarIcon({ size = 20 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <path d="M12 2L14.4 9.6H22.4L16 14.1L18.4 21.7L12 17.2L5.6 21.7L8 14.1L1.6 9.6H9.6L12 2Z" fill="currentColor" />
        </svg>
    );
}

function CopyButton({ text }) {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };
    return (
        <button onClick={copy} className="p-1.5 text-t-muted hover:text-brand transition-colors">
            {copied ? <CheckCircle size={15} className="text-success" /> : <Copy size={15} />}
        </button>
    );
}

const NETWORK_INFO = {
    stellar: {
        name: 'Stellar',
        currencies: ['XLM', 'USDC'],
        description: 'Payments processed on the Stellar network via Freighter.',
        colorClasses: 'bg-blue-50 text-blue-700',
    },
    starknet: {
        name: 'Starknet',
        currencies: ['STRK'],
        description: 'Payments processed on the Starknet L2 via Argent.',
        colorClasses: 'bg-brand-bg text-brand',
    },
    evm: {
        name: 'Ethereum',
        currencies: ['ETH', 'USDC'],
        description: 'Payments processed on Ethereum via MetaMask or any EVM wallet.',
        colorClasses: 'bg-orange-50 text-orange-700',
    },
    ethereum: {
        name: 'Ethereum',
        currencies: ['ETH', 'USDC'],
        description: 'Payments processed on Ethereum via MetaMask or any EVM wallet.',
        colorClasses: 'bg-orange-50 text-orange-700',
    },
};

function PaymentSettings() {
    const { wallet, walletType, connectWallet, disconnectWallet } = useAuth();
    const { resetDemoData } = useData();
    const navigate = useNavigate();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const isStellar = walletType === 'stellar';
    const networkInfo = NETWORK_INFO[walletType] || NETWORK_INFO.starknet;

    const handleSwitchNetwork = async () => {
        await disconnectWallet();
        navigate('/signin');
    };

    const handleReset = () => {
        resetDemoData();
        setShowResetConfirm(false);
    };

    return (
        <div>
            <h2 className="text-lg font-semibold mb-6">Payment Settings</h2>

            {/* ── Connected wallet ── */}
            <div className="flex items-center gap-4 p-5 bg-white border border-border mb-5">
                <div className={`w-10 h-10 flex items-center justify-center ${isStellar ? 'bg-blue-50 text-blue-600' : 'bg-brand-bg text-brand'}`}>
                    {isStellar ? <StellarIcon size={22} /> : <Wallet size={22} />}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">
                        {isStellar ? 'Freighter Wallet' : walletType === 'evm' ? 'EVM Wallet' : 'Argent Wallet'}
                    </div>
                    <div className="flex items-center gap-1 min-w-0">
                        <span className="text-xs text-t-muted truncate">
                            {wallet.isConnected ? wallet.address : 'Not connected'}
                        </span>
                        {wallet.isConnected && wallet.address && <CopyButton text={wallet.address} />}
                    </div>
                </div>
                {wallet.isConnected ? (
                    <div className="flex gap-2 flex-shrink-0">
                        <Button variant="secondary" onClick={handleSwitchNetwork} className="hidden sm:flex">
                            Switch Network
                        </Button>
                        <Button variant="secondary" onClick={disconnectWallet}>
                            <span className="hidden sm:inline">Disconnect</span>
                            <LogOut size={16} className="sm:hidden" />
                        </Button>
                    </div>
                ) : (
                    <Button variant="primary" onClick={() => setIsModalOpen(true)}>Connect Wallet</Button>
                )}
            </div>

            {/* ── Wallet balance ── */}
            <div className="p-5 bg-page border border-border mb-5">
                <h3 className="text-sm font-semibold mb-2">Wallet Balance</h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold">{wallet.balance}</span>
                    <span className="text-t-muted">{wallet.currency}</span>
                </div>
            </div>

            {/* ── Network & accepted currencies ── */}
            {wallet.isConnected && (
                <div className={`p-5 border mb-5 ${networkInfo.colorClasses} border-current/10`}>
                    <h3 className="text-sm font-semibold mb-1">{networkInfo.name} Network</h3>
                    <p className="text-sm mb-3">{networkInfo.description}</p>
                    <div className="flex gap-2 flex-wrap">
                        {networkInfo.currencies.map((c) => (
                            <span key={c} className="px-2.5 py-0.5 text-xs font-semibold bg-white/60 border border-current/20">
                                {c}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Blockchain RPC endpoints ── */}
            <div className="bg-white border border-border p-5 mb-5">
                <h3 className="text-sm font-semibold mb-1">Blockchain Monitoring</h3>
                <p className="text-xs text-t-muted mb-3">
                    Payment detection polls public RPC nodes. Override via env vars for private nodes or testnet.
                </p>
                <div className="flex flex-col gap-2 text-xs">
                    {[
                        { label: 'Ethereum RPC', env: 'VITE_ETH_RPC', default: 'eth.llamarpc.com' },
                        { label: 'Starknet RPC', env: 'VITE_STARKNET_RPC', default: 'nethermind.io/mainnet-juno' },
                        { label: 'Stellar Horizon', env: 'VITE_STELLAR_HORIZON', default: 'horizon.stellar.org' },
                    ].map(({ label, env, default: def }) => (
                        <div key={env} className="flex justify-between items-center py-1.5 border-b border-border last:border-b-0">
                            <span className="text-t-secondary">{label}</span>
                            <span className="font-mono text-t-muted">
                                {import.meta.env[env] ? '✓ custom' : def}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Demo reset ── */}
            <div className="bg-error-bg border border-error/20 p-5">
                <h3 className="text-sm font-semibold text-error mb-1">Reset Demo Data</h3>
                <p className="text-xs text-t-muted mb-3">
                    Clears all invoices, customers, items, and checkouts from localStorage. This cannot be undone.
                </p>
                {!showResetConfirm ? (
                    <Button variant="danger" icon={RotateCcw} size="small" onClick={() => setShowResetConfirm(true)}>
                        Reset All Data
                    </Button>
                ) : (
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-error font-medium">Are you sure?</span>
                        <Button variant="danger" size="small" onClick={handleReset}>Yes, reset</Button>
                        <Button variant="secondary" size="small" onClick={() => setShowResetConfirm(false)}>Cancel</Button>
                    </div>
                )}
            </div>

            <ConnectWalletModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                connectWalletFn={connectWallet}
            />
        </div>
    );
}

export default PaymentSettings;
