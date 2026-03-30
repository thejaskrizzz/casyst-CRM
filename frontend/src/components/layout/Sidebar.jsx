import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
    LayoutDashboard, Users, Package, TrendingUp, Briefcase,
    FileText, Moon, Sun, Building2, LogOut, Receipt, Settings, BarChart2, Award, CheckCircle, ClipboardList, Search
} from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../../api/axios';

const navConfig = {
    admin: [
        { label: 'Dashboard', to: '/admin/dashboard', icon: LayoutDashboard },
        { label: 'Leads', to: '/admin/leads', icon: TrendingUp },
        { label: 'Users', to: '/admin/users', icon: Users },
        { label: 'Companies', to: '/admin/branches', icon: Building2 },
        { label: 'Packages', to: '/admin/packages', icon: Package },
        { label: 'Analytics', to: '/admin/analytics', icon: BarChart2 },
        { label: 'Staff Performance', to: '/admin/staff-performance', icon: Award },
        { label: 'My Tasks', to: '/admin/my-tasks', icon: ClipboardList },
        { label: 'Track Order', to: '/admin/track-order', icon: Search },
        { label: 'Settings', to: '/admin/settings', icon: Settings },
    ],

    manager: [
        { label: 'Dashboard', to: '/manager/dashboard', icon: LayoutDashboard },
        { label: 'All Leads', to: '/manager/leads', icon: TrendingUp },
        { label: 'Quotes', to: '/manager/quotes', icon: Receipt },
        { label: 'Service Orders', to: '/manager/service-orders', icon: Briefcase },
        { label: 'Clients', to: '/manager/clients', icon: Building2 },
        { label: 'Packages', to: '/manager/packages', icon: Package },
        { label: 'My Tasks', to: '/manager/my-tasks', icon: ClipboardList },
        { label: 'Track Order', to: '/manager/track-order', icon: Search },
        { label: 'Company Settings', to: '/manager/settings', icon: Settings },
    ],
    sales: [
        { label: 'Dashboard', to: '/sales/dashboard', icon: LayoutDashboard },
        { label: 'My Leads', to: '/sales/leads', icon: TrendingUp },
        { label: 'Quotes', to: '/sales/quotes', icon: Receipt },
        { label: 'My Orders', to: '/sales/service-orders', icon: Briefcase },
        { label: 'Followups', to: '/sales/followups', icon: FileText },
        { label: 'My Tasks', to: '/sales/my-tasks', icon: ClipboardList },
        { label: 'Track Order', to: '/sales/track-order', icon: Search },
    ],
    operations: [
        { label: 'Dashboard', to: '/operations/dashboard', icon: LayoutDashboard },
        { label: 'Service Orders', to: '/operations/service-orders', icon: Briefcase },
        { label: 'Expenses', to: '/operations/expenses', icon: Receipt },
        { label: 'My Tasks', to: '/operations/my-tasks', icon: ClipboardList },
        { label: 'Track Order', to: '/operations/track-order', icon: Search },
    ],
    accountant: [
        { label: 'Dashboard', to: '/accountant/dashboard', icon: LayoutDashboard },
        { label: 'Payments Queue', to: '/accountant/payments', icon: CheckCircle },
        { label: 'Expenses Queue', to: '/accountant/expenses', icon: Receipt },
        { label: 'Invoices', to: '/accountant/invoices', icon: FileText },
        { label: 'My Tasks', to: '/accountant/my-tasks', icon: ClipboardList },
    ],
};

export default function Sidebar({ isOpen, onClose }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [dark, setDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        api.get('/settings').then(r => setSettings(r.data.data)).catch(() => { });
    }, []);

    const nav = navConfig[user?.role] || [];

    const toggleTheme = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.setAttribute('data-theme', next ? 'dark' : '');
    };

    const handleLogout = async () => {
        await logout();
        if (onClose) onClose();
        navigate('/login');
    };

    const handleNavClick = () => {
        if (onClose) onClose();
    };

    return (
        <nav className={`rail ${isOpen ? 'mobile-open' : ''}`}>
            {/* Logo */}
            <div style={{ padding: '4px 10px 20px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, flexShrink: 0, overflow: 'hidden', borderRadius: 8, background: settings?.logo_url ? '#ffffff' : 'var(--ink)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {settings?.logo_url ? (
                        <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '') || 'https://casyst-crm-2.onrender.com'}${settings.logo_url}`} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    ) : (
                        <span style={{ color: '#fff', fontSize: 15, fontWeight: 800 }}>{settings?.company_name?.charAt(0) || 'C'}</span>
                    )}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {settings?.company_name || 'Casyst CRM'}
                </div>
            </div>

            {/* Navigation icons */}
            <div className="rail-nav">
                {nav.map(({ label, to, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        onClick={handleNavClick}
                        className={({ isActive }) => `rail-btn${isActive ? ' active' : ''}`}
                    >
                        <Icon />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </div>

            <div className="rail-bottom">
                <button
                    className="rail-btn mobile-only"
                    onClick={onClose}
                    style={{ marginBottom: 4, color: 'var(--s-lost-ink)', background: 'var(--s-lost)', justifyContent: 'center' }}
                >
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Close Menu</span>
                </button>
                {/* Branch badge for scoped roles */}
                {user?.branch && ['manager', 'sales', 'operations'].includes(user?.role) && (
                    <div style={{ padding: '6px 14px', marginBottom: 4 }}>
                        <span style={{ fontSize: 10, background: 'var(--surface-2)', color: 'var(--ink-3)', borderRadius: 6, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Building2 size={10} /> {user.branch.name || user.branch.code}
                        </span>
                    </div>
                )}
                <button className="rail-btn" onClick={toggleTheme}>
                    {dark ? <Sun /> : <Moon />}
                    <span>{dark ? 'Light mode' : 'Dark mode'}</span>
                </button>
                <button className="rail-btn" onClick={handleLogout}>
                    <LogOut />
                    <span>Logout ({user?.name})</span>
                </button>
            </div>
        </nav>
    );
}
