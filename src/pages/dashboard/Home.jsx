import { Link } from 'react-router-dom';
import {
    Wallet,
    TrendingUp,
    ArrowDownRight,
    FileText,
    Users,
    ShoppingCart,
    Package,
    Zap,
    ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';

function Home() {
    const { user, wallet, connectWallet } = useAuth();
    const { transactions, dashboardStats } = useData();
    const recentTransactions = transactions.slice(0, 5);

    return (
        <div className="max-w-[1100px]">
            {/* Page Heading */}
            <h1 className="text-lg font-medium text-t-secondary mb-6">Welcome to Tradazone</h1>

            {/* Top Row: Wallet + Receivable */}
            <div className="grid grid-cols-[1.2fr_1fr] gap-5 mb-5">
                {/* Wallet Balance Card */}
                <div className="bg-brand rounded-card p-6 text-white flex flex-col min-h-[180px]">
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-7 h-7 bg-accent-orange/80 rounded-full flex items-center justify-center">
                            <Wallet size={14} strokeWidth={2} />
                        </div>
                        <span className="text-[13px] text-white/70">
                            {wallet.address
                                ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}`
                                : 'Gx74893k2k3...'}
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-4xl font-bold leading-none">{dashboardStats.walletBalance}</span>
                        <span className="text-base text-white/60">STRK</span>
                    </div>
                    <span className="text-[13px] text-white/50 mt-auto">Wallet balance</span>
                </div>

                {/* Total Receivable Card */}
                <div className="bg-white border border-border rounded-card p-6">
                    <div className="flex items-center gap-2 mb-1">
                        <ArrowDownRight size={18} strokeWidth={2} className="text-brand" />
                        <span className="text-base font-semibold text-t-primary">Total receivable</span>
                    </div>
                    <p className="text-[13px] text-t-muted mb-4">Total unpaid invoices</p>
                    <div className="w-full h-2 bg-page rounded-full overflow-hidden mb-4">
                        <div
                            className="h-full bg-brand rounded-full"
                            style={{ width: `${(parseFloat(dashboardStats.walletBalance) / (parseFloat(dashboardStats.walletBalance) + parseFloat(dashboardStats.receivables.replace(',', '')))) * 100}%` }}
                        ></div>
                    </div>
                    <div className="flex gap-8">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-t-muted">Current</span>
                            <span className="text-[15px] font-bold text-t-primary">{dashboardStats.walletBalance} STRK</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <span className="text-xs text-t-muted">Unpaid</span>
                            <span className="text-[15px] font-bold text-t-primary">{dashboardStats.receivables} STRK</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Transactions & Activity Row */}
            <div className="grid grid-cols-2 gap-5 mb-6">
                {/* Transactions Card */}
                <div className="bg-white border border-border rounded-card overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <FileText size={16} />
                            <span>Transactions</span>
                        </div>
                        <button className="flex items-center gap-1 text-xs text-t-muted font-medium px-2 py-1 border border-border rounded-md bg-white hover:border-border-medium">
                            Last 6 months <ChevronDown size={14} />
                        </button>
                    </div>
                    <div>
                        {recentTransactions.map((tx, i) => (
                            <div key={tx.id} className={`flex items-center gap-3 px-5 py-3 ${i < recentTransactions.length - 1 ? 'border-b border-border' : ''}`}>
                                <div className="w-8 h-8 bg-page rounded-md flex items-center justify-center text-t-muted flex-shrink-0">
                                    <FileText size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="block text-[13px] font-medium text-t-primary truncate">{tx.description}</span>
                                    <span className="block text-[11px] text-t-muted mt-0.5">{tx.date}</span>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <span className="block text-[13px] font-semibold">{tx.amount} STRK</span>
                                    <span className="block text-[11px] text-t-muted mt-0.5">6:00 pm</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activity Card */}
                <div className="bg-white border border-border rounded-card overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                        <div className="flex items-center gap-2 font-semibold text-sm">
                            <TrendingUp size={16} />
                            <span>Activity</span>
                        </div>
                        <button className="flex items-center gap-1 text-xs text-t-muted font-medium px-2 py-1 border border-border rounded-md bg-white hover:border-border-medium">
                            Last 6 months <ChevronDown size={14} />
                        </button>
                    </div>
                    <div>
                        {recentTransactions.map((tx, i) => (
                            <div key={`act-${tx.id}`} className={`flex items-center gap-3 px-5 py-3 ${i < recentTransactions.length - 1 ? 'border-b border-border' : ''}`}>
                                <div className="w-8 h-8 bg-page rounded-md flex items-center justify-center text-t-muted flex-shrink-0">
                                    <FileText size={14} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="block text-[13px] font-medium text-t-primary truncate">You sent an invoice to {tx.customer || 'John Doe'}</span>
                                    <span className="block text-[11px] text-t-muted mt-0.5">{tx.date}</span>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    <span className="block text-[13px] font-semibold">{tx.amount} STRK</span>
                                    <span className="block text-[11px] text-t-muted mt-0.5">6:00 pm</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="text-center py-6">
                <div className="flex items-center justify-center gap-2 font-semibold mb-5">
                    <Zap size={18} className="text-accent-orange" />
                    <span>Quick action</span>
                </div>
                <div className="flex justify-center gap-6">
                    {[
                        { icon: FileText, label: 'Invoice', to: '/invoices/create' },
                        { icon: Users, label: 'Customer', to: '/customers/add' },
                        { icon: ShoppingCart, label: 'Checkout', to: '/checkout/create' },
                        { icon: Package, label: 'Products', to: '/items/add' },
                    ].map((action) => (
                        <Link key={action.label} to={action.to} className="flex flex-col items-center gap-2 hover:-translate-y-0.5 transition-transform">
                            <div className="w-14 h-14 bg-brand rounded-lg flex items-center justify-center text-white shadow-md shadow-brand/30">
                                <action.icon size={22} strokeWidth={1.8} />
                            </div>
                            <span className="text-xs font-medium text-t-secondary">{action.label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default Home;
