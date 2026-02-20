import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

function Layout() {
    return (
        <div className="min-h-screen">
            <Header />
            <Sidebar />
            <main className="ml-sidebar mt-header p-6 min-h-[calc(100vh-theme(spacing.header))]">
                <Outlet />
            </main>
        </div>
    );
}

export default Layout;
