import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute, RoleRedirect } from './routes/ProtectedRoute';

// Layout
import Layout from './components/layout/Layout';

// Auth
import LoginPage from './pages/auth/LoginPage';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import PackagesPage from './pages/admin/PackagesPage';
import AdminSettings from './pages/admin/AdminSettings';
import AdminAnalytics from './pages/admin/AdminAnalytics';
import StaffPerformance from './pages/admin/StaffPerformance';

// Manager
import ManagerDashboard from './pages/manager/ManagerDashboard';

// Sales
import SalesDashboard from './pages/sales/SalesDashboard';
import LeadsListPage from './pages/sales/LeadsListPage';
import LeadDetailPage from './pages/sales/LeadDetailPage';
import QuotesListPage from './pages/sales/QuotesListPage';
import QuoteDetailPage from './pages/sales/QuoteDetailPage';

// Operations
import OperationsDashboard from './pages/operations/OperationsDashboard';
import ServiceOrdersListPage from './pages/operations/ServiceOrdersListPage';
import ServiceOrderDetailPage from './pages/operations/ServiceOrderDetailPage';

const Unauthorized = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>🔒</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Access Denied</h1>
      <p style={{ color: 'var(--ink-3)' }}>You don't have permission to view this page.</p>
      <a href="/" style={{ display: 'inline-block', marginTop: 20 }} className="btn btn-primary">Go Home</a>
    </div>
  </div>
);

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{
          style: { background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--border)', borderRadius: 10 }
        }} />
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/" element={<RoleRedirect />} />

          {/* Admin — can also view & assign leads */}
          <Route path="/admin" element={<ProtectedRoute roles={['admin']}><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="users" element={<UsersPage />} />
            <Route path="packages" element={<PackagesPage />} />
            <Route path="leads" element={<LeadsListPage />} />
            <Route path="leads/:id" element={<LeadDetailPage />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="staff-performance" element={<StaffPerformance />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Manager */}
          <Route path="/manager" element={<ProtectedRoute roles={['manager']}><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<ManagerDashboard />} />
            <Route path="leads" element={<LeadsListPage />} />
            <Route path="leads/:id" element={<LeadDetailPage />} />
            <Route path="service-orders" element={<ServiceOrdersListPage />} />
            <Route path="service-orders/:id" element={<ServiceOrderDetailPage />} />
            <Route path="quotes" element={<QuotesListPage />} />
            <Route path="quotes/:id" element={<QuoteDetailPage />} />
            <Route path="clients" element={<div style={{ padding: 24 }}><h2>Clients</h2></div>} />
            <Route path="packages" element={<PackagesPage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Sales */}
          <Route path="/sales" element={<ProtectedRoute roles={['sales']}><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<SalesDashboard />} />
            <Route path="leads" element={<LeadsListPage />} />
            <Route path="leads/:id" element={<LeadDetailPage />} />
            <Route path="quotes" element={<QuotesListPage />} />
            <Route path="quotes/:id" element={<QuoteDetailPage />} />
            <Route path="service-orders" element={<ServiceOrdersListPage />} />
            <Route path="service-orders/:id" element={<ServiceOrderDetailPage />} />
            <Route path="followups" element={<LeadsListPage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Operations */}
          <Route path="/operations" element={<ProtectedRoute roles={['operations']}><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<OperationsDashboard />} />
            <Route path="service-orders" element={<ServiceOrdersListPage />} />
            <Route path="service-orders/:id" element={<ServiceOrderDetailPage />} />
            <Route index element={<Navigate to="dashboard" replace />} />
          </Route>

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
