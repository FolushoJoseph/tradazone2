import { useParams } from 'react-router-dom';
import { Wallet, Check } from 'lucide-react';
import { useData } from '../../context/DataContext';
import logo from '../../assets/logo.png';

function MailCheckout() {
    const { checkoutId } = useParams();
    const { checkouts } = useData();
    const checkout = checkouts.find(c => c.id === checkoutId) || {
        id: checkoutId || 'demo', title: 'Premium Package', description: 'Full service web development package', amount: '200', currency: 'STRK'
    };

    const handlePay = () => { console.log('Initiating payment...'); };

    return (
        <div className="min-h-screen bg-brand flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <img src={logo} alt="Tradazone" className="h-7 mx-auto mb-1" />
                    <p className="text-white/60 text-sm">Secure crypto payment</p>
                </div>

                <div className="bg-white rounded-2xl p-8 text-center shadow-xl">
                    <h1 className="text-xl font-bold text-t-primary mb-2">{checkout.title}</h1>
                    <p className="text-sm text-t-muted mb-8">{checkout.description}</p>

                    <div className="flex items-baseline justify-center gap-2 mb-8">
                        <span className="text-5xl font-bold text-t-primary">{checkout.amount}</span>
                        <span className="text-lg text-t-muted">{checkout.currency}</span>
                    </div>

                    <button className="w-full flex items-center justify-center gap-2 py-3.5 bg-brand text-white font-semibold rounded-xl hover:bg-brand-dark transition-colors" onClick={handlePay}>
                        <Wallet size={20} /> Connect Wallet to Pay
                    </button>
                </div>

                <p className="text-center text-sm text-white/40 mt-6">Powered by Tradazone on Starknet</p>
            </div>
        </div>
    );
}

export default MailCheckout;
