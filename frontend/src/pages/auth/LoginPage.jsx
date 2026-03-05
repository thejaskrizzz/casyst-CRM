import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, Eye, EyeOff } from 'lucide-react';

const roleRedirect = {
    admin: '/admin/dashboard',
    manager: '/manager/dashboard',
    sales: '/sales/dashboard',
    operations: '/operations/dashboard',
};

const demos = [
    { label: 'Admin', role: 'admin', email: 'admin@casyst.com', pw: 'admin123' },
    { label: 'Manager', role: 'manager', email: 'manager@casyst.com', pw: 'manager123' },
    { label: 'Sales', role: 'sales', email: 'sales@casyst.com', pw: 'sales123' },
    { label: 'Operations', role: 'operations', email: 'ops@casyst.com', pw: 'ops123' },
];

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(''); setLoading(true);
        try {
            const user = await login(email, password);
            navigate(roleRedirect[user.role] || '/');
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid email or password.');
        } finally { setLoading(false); }
    };

    return (
        <div style={{
            minHeight: '100vh',
            background: 'var(--bg)',
            display: 'flex',
        }}>
            {/* Left panel — branding */}
            <div style={{
                width: '44%',
                background: 'var(--ink)',
                display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '48px',
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                        width: 36, height: 36, borderRadius: 10,
                        background: 'rgba(255,255,255,0.12)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 16, fontWeight: 800, color: '#fff',
                    }}>C</div>
                    <span style={{ color: '#fff', fontWeight: 700, fontSize: 17, letterSpacing: '-0.3px' }}>Casyst CRM</span>
                </div>

                {/* Center copy */}
                <div>
                    <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16, fontWeight: 600 }}>Service Lifecycle Platform</p>
                    <h1 style={{ color: '#fff', fontSize: 40, fontWeight: 800, lineHeight: 1.2, letterSpacing: '-1px', maxWidth: 340 }}>
                        One system.<br />Every stage.
                    </h1>
                    <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16, fontSize: 15, maxWidth: 320, lineHeight: 1.6 }}>
                        Track business registration workflows from lead to archival — across sales and operations teams.
                    </p>
                </div>

                {/* Bottom role pills */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['Admin', 'Manager', 'Sales', 'Operations'].map(r => (
                        <span key={r} style={{
                            padding: '4px 12px', borderRadius: 999,
                            background: 'rgba(255,255,255,0.1)',
                            color: 'rgba(255,255,255,0.6)',
                            fontSize: 12, fontWeight: 500,
                        }}>{r}</span>
                    ))}
                </div>
            </div>

            {/* Right panel — form */}
            <div style={{
                flex: 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '48px',
            }}>
                <div style={{ width: '100%', maxWidth: 380 }}>
                    <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 6 }}>Sign in</h2>
                    <p style={{ color: 'var(--ink-3)', fontSize: 14, marginBottom: 32 }}>Access your role-based workspace</p>

                    {error && <div className="alert alert-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">Email Address</label>
                            <input
                                id="login-email"
                                className="form-input"
                                type="email"
                                placeholder="you@company.com"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="login-password"
                                    className="form-input"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    style={{ paddingRight: 42 }}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass(!showPass)}
                                    style={{
                                        position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                                        background: 'none', border: 'none', color: 'var(--ink-3)', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center',
                                    }}
                                >
                                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                        </div>

                        <button
                            id="login-submit"
                            className="btn btn-primary"
                            type="submit"
                            disabled={loading}
                            style={{ width: '100%', justifyContent: 'center', padding: '12px 24px', fontSize: 14, marginTop: 4, borderRadius: 12 }}
                        >
                            {loading
                                ? <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                                : <><LogIn size={15} /> Sign in</>}
                        </button>
                    </form>

                    <div className="divider" style={{ margin: '28px 0' }} />

                    {/* Demo quick fill */}
                    <p style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
                        Quick demo login
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {demos.map(d => (
                            <button
                                key={d.role}
                                id={`demo-${d.role}`}
                                className="btn btn-outline btn-sm"
                                style={{ justifyContent: 'center', borderRadius: 10 }}
                                onClick={() => { setEmail(d.email); setPassword(d.pw); }}
                            >
                                {d.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
