import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const ProtectedRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen bg-gray-950">
            <div className="spinner"></div>
        </div>
    );

    if (!user) return <Navigate to="/login" replace />;
    if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
    return children;
};

export const RoleRedirect = () => {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    const redirectMap = {
        admin: '/admin/dashboard',
        manager: '/manager/dashboard',
        sales: '/sales/dashboard',
        operations: '/operations/dashboard',
        accountant: '/accountant/dashboard',
    };
    return <Navigate to={redirectMap[user.role] || '/login'} replace />;
};
