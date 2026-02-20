import { Wallet } from 'lucide-react';
import Button from '../../components/forms/Button';
import { useAuth } from '../../context/AuthContext';

function PaymentSettings() {
    const { wallet, connectWallet, disconnectWallet } = useAuth();

    return (
        <div>
            <h2 className="text-lg font-semibold mb-6">Payment Settings</h2>

            <div className="flex items-center gap-4 p-5 bg-white border border-border rounded-card mb-5">
                <div className="w-10 h-10 bg-brand-bg rounded-full flex items-center justify-center text-brand">
                    <Wallet size={22} />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-semibold">Argent Wallet</div>
                    <div className="text-xs text-t-muted">{wallet.isConnected ? wallet.address : 'Not connected'}</div>
                </div>
                {wallet.isConnected ? (
                    <Button variant="secondary" onClick={disconnectWallet}>Disconnect</Button>
                ) : (
                    <Button variant="primary" onClick={connectWallet}>Connect Wallet</Button>
                )}
            </div>

            <div className="p-5 bg-page rounded-card mb-5">
                <h3 className="text-sm font-semibold mb-2">Wallet Balance</h3>
                <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold">{wallet.balance}</span>
                    <span className="text-t-muted">{wallet.currency}</span>
                </div>
            </div>

            <div className="p-5 bg-brand-bg rounded-card text-brand">
                <p className="text-sm">
                    <strong>Starknet Network</strong><br />
                    Payments are processed on the Starknet network. Make sure your wallet is connected to receive payments.
                </p>
            </div>
        </div>
    );
}

export default PaymentSettings;
