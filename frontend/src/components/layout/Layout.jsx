import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import { Search, Bell } from 'lucide-react';

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
    const segment = location.pathname.split('/').pop();
    const title = pageTitles[segment] || 'Dashboard';

    return (
        <div className="app-shell">
            <Sidebar />
            <div className="workspace">
                {/* Top header */}
                <header className="topbar">
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
