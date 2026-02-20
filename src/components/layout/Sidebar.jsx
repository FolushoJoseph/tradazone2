import { NavLink, useNavigate } from 'react-router-dom';
import {
    Home,
    FileText,
    ShoppingCart,
    Users,
    Package,
    Settings,
    LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
    { path: '/', icon: Home, label: 'Home' },
    { path: '/invoices', icon: FileText, label: 'Invoice' },
    { path: '/checkout', icon: ShoppingCart, label: 'Checkout' },
    { path: '/customers', icon: Users, label: 'Customer' },
    { path: '/items', icon: Package, label: 'Item and Services' },
    { path: '/settings', icon: Settings, label: 'Settings' },
];

function Sidebar() {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/signin');
    };

    return (
        <aside className="w-sidebar h-[calc(100vh-theme(spacing.header))] fixed top-header left-0 bg-white border-r border-border flex flex-col justify-between py-4 overflow-y-auto z-50">
            <nav className="flex flex-col gap-0.5">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-5 py-3 text-sm font-medium border-l-[3px] transition-all ${isActive
                                ? 'text-brand bg-brand-bg border-l-brand font-semibold'
                                : 'text-t-secondary border-l-transparent hover:text-brand hover:bg-brand-bg'
                            }`
                        }
                        end={item.path === '/'}
                    >
                        <item.icon size={20} />
                        <span className="whitespace-nowrap overflow-hidden text-ellipsis">{item.label}</span>
                    </NavLink>
                ))}
            </nav>
            <button
                className="flex items-center gap-3 px-5 py-3 text-sm font-medium text-t-muted border-l-[3px] border-l-transparent hover:text-error hover:bg-error-bg transition-all w-full"
                onClick={handleLogout}
            >
                <LogOut size={20} />
                <span>Logout</span>
            </button>
        </aside>
    );
}

export default Sidebar;
