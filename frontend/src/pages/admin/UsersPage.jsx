import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { Plus, Edit2, Power } from 'lucide-react';

export default function UsersPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: 'sales' });
    const [submitting, setSubmitting] = useState(false);

    const fetchUsers = () => {
        setLoading(true);
        api.get('/users').then(r => setUsers(r.data.data)).finally(() => setLoading(false));
    };
    useEffect(fetchUsers, []);

    const openCreate = () => {
        setEditUser(null);
        setForm({ name: '', email: '', phone: '', password: '', role: 'sales' });
        setShowModal(true);
    };
    const openEdit = (u) => {
        setEditUser(u);
        setForm({ name: u.name, email: u.email, phone: u.phone || '', password: '', role: u.role });
        setShowModal(true);
    };
    const handleSubmit = async (e) => {
        e.preventDefault(); setSubmitting(true);
        try {
            if (editUser) await api.put(`/users/${editUser._id}`, { name: form.name, email: form.email, phone: form.phone, role: form.role });
            else await api.post('/users', form);
            setShowModal(false); fetchUsers();
        } catch (err) { alert(err.response?.data?.message || 'Error'); }
        finally { setSubmitting(false); }
    };
    const toggleStatus = async (u) => {
        if (!confirm(`${u.status === 'active' ? 'Deactivate' : 'Activate'} ${u.name}?`)) return;
        await api.patch(`/users/${u._id}/status`);
        fetchUsers();
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <div className="page-title">Users</div>
                    <div className="page-subtitle">Manage system access and roles</div>
                </div>
                <button className="btn btn-primary" onClick={openCreate}><Plus size={14} /> New User</button>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>User</th><th>Email</th><th>Phone</th><th>Role</th><th>Status</th><th>Joined</th><th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ textAlign: 'center', padding: 48 }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                        ) : users.map(u => (
                            <tr key={u._id}>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                        <div className="avatar">{u.name?.charAt(0)}</div>
                                        <span className="td-name">{u.name}</span>
                                    </div>
                                </td>
                                <td className="td-muted">{u.email}</td>
                                <td className="td-muted">{u.phone || '—'}</td>
                                <td><span className={`pill pill-${u.role}`}>{u.role}</span></td>
                                <td><span className={`pill pill-${u.status}`}>{u.status}</span></td>
                                <td className="td-muted">{new Date(u.createdAt).toLocaleDateString('en-IN')}</td>
                                <td>
                                    <div style={{ display: 'flex', gap: 6 }}>
                                        <button className="icon-btn" onClick={() => openEdit(u)} title="Edit"><Edit2 size={13} /></button>
                                        <button
                                            className="icon-btn"
                                            onClick={() => toggleStatus(u)}
                                            title={u.status === 'active' ? 'Deactivate' : 'Activate'}
                                            style={{ color: u.status === 'active' ? 'var(--s-lost-ink)' : 'var(--s-active-ink)' }}
                                        >
                                            <Power size={13} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <span className="modal-title">{editUser ? 'Edit User' : 'New User'}</span>
                            <button className="icon-btn" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="grid-2">
                                <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                            </div>
                            <div className="grid-2">
                                <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                                <div className="form-group"><label className="form-label">Role *</label>
                                    <select className="form-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                                        <option value="admin">Admin</option><option value="manager">Manager</option>
                                        <option value="sales">Sales</option><option value="operations">Operations</option>
                                    </select>
                                </div>
                            </div>
                            {!editUser && <div className="form-group"><label className="form-label">Password *</label><input className="form-input" type="password" required minLength={6} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>}
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? 'Saving…' : editUser ? 'Save Changes' : 'Create User'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
