import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Bell, Menu } from 'lucide-react';

const pageTitles = {
    'dashboard': 'Dashboard',
    'users': 'User Management',
    'packages': 'Packages',
    'leads': 'Leads',
    'followups': "Today's Followups",
    'service-orders': 'Service Orders',
    'clients': 'Clients',
};
export default function Layout() {
    const { user } = useAuth();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const segment = location.pathname.split('/').pop();
    const title = pageTitles[segment] || 'Dashboard';

    return (
        <div className="app-shell">
            {/* Mobile Sidebar Overlay */}
            <div 
                className={`sidebar-overlay ${isSidebarOpen ? 'active' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
            <div className="workspace">
                {/* Top header */}
                <header className="topbar">
                    {/* Mobile Hamburger Menu */}
                    <button 
                        className="mobile-only icon-btn" 
                        style={{ border: 'none', background: 'transparent', marginRight: 8, padding: 0, width: 'auto', color: 'var(--ink)' }}
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu size={20} />
                    </button>
                    <span className="topbar-title">{title}</span>

                    {/* Top right controls */}
                    <div className="topbar-controls">
                        <button className="icon-btn"><Search /></button>
                        <button className="icon-btn"><Bell /></button>
                        <div
                            className="avatar-btn"
                            title={`${user?.name} — ${user?.role}`}
                        >
                            {user?.name?.charAt(0).toUpperCase()}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="page-body">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
