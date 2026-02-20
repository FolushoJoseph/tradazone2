import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logo from '../../assets/logo.png';

function Header() {
    const { user } = useAuth();

    return (
        <header className="h-header bg-brand fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-6">
            {/* Left: Logo */}
            <div className="flex items-center gap-2.5">
                <img src={logo} alt="Tradazone" className="h-6" />
            </div>

            {/* Right: Bell + Avatar */}
            <div className="flex items-center gap-4">
                <button className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors">
                    <Bell size={20} />
                </button>
                <div className="w-[34px] h-[34px] rounded-full overflow-hidden border-2 border-white/30">
                    <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'User')}&background=3C3CEF&color=fff`}
                        alt={user.name}
                        className="w-full h-full object-cover"
                    />
                </div>
            </div>
        </header>
    );
}

export default Header;
