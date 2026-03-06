"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    cuit: string;
    tax_status: string;
}

export default function CustomerManagementPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        cuit: '',
        taxStatus: 'responsable_inscripto'
    });

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlPass = urlParams.get('pw');
        if (urlPass) {
            sessionStorage.setItem('admin_password', urlPass);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        const savedPass = urlPass || sessionStorage.getItem('admin_password');

        if (savedPass) {
            setPassword(savedPass);
            setIsAuthenticated(true);
            fetchCustomers(savedPass);
        } else {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) fetchCustomers();
    }, [isAuthenticated]);

    const fetchCustomers = async (passOverride?: string) => {
        const currentPass = passOverride || password;
        if (!currentPass) return;

        try {
            const res = await fetch('/api/customers', {
                headers: { 'x-admin-password': currentPass }
            });
            const data = await res.json();
            if (res.ok) {
                setCustomers(data);
                setIsAuthenticated(true);
                if (password) sessionStorage.setItem('admin_password', password);
            } else {
                if (res.status === 401) {
                    setIsAuthenticated(false);
                    sessionStorage.removeItem('admin_password');
                    if (password) alert('Contraseña Incorrecta');
                }
            }
        } catch (e) {
            console.error(e);
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) return;
        setLoading(true);
        await fetchCustomers();
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const method = editingCustomer ? 'PATCH' : 'POST';
            const res = await fetch('/api/customers', {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password
                },
                body: JSON.stringify({
                    ...form,
                    id: editingCustomer?.id
                })
            });
            if (res.ok) {
                setForm({ name: '', email: '', phone: '', cuit: '', taxStatus: 'responsable_inscripto' });
                setEditingCustomer(null);
                fetchCustomers();
            } else {
                const err = await res.json();
                if (res.status === 401) {
                    setIsAuthenticated(false);
                    alert('Contraseña Incorrecta');
                } else {
                    alert(`Error: ${err.error}`);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Seguro que quieres eliminar a ${name}?`)) return;
        try {
            const res = await fetch(`/api/customers?id=${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-password': password }
            });
            if (res.ok) {
                // Limpiar estado de edición si el borrado era el que se estaba editando
                if (editingCustomer?.id === id) {
                    setEditingCustomer(null);
                    setForm({ name: '', email: '', phone: '', cuit: '', taxStatus: 'responsable_inscripto' });
                }
                fetchCustomers();
            }
            else alert('Error al eliminar o contraseña incorrecta');
        } catch (e) {
            console.error(e);
        }
    };

    const handleEdit = (c: Customer) => {
        setEditingCustomer(c);
        setForm({
            name: c.name,
            email: c.email || '',
            phone: c.phone || '',
            cuit: c.cuit || '',
            taxStatus: c.tax_status || 'responsable_inscripto'
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleLogout = () => {
        sessionStorage.removeItem('admin_password');
        setIsAuthenticated(false);
        setPassword('');
    };

    if (!isAuthenticated) {
        return (
            <div className="page-container" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
                <div className="glass-panel" style={{ padding: '40px 20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>👥</div>
                    <h2 style={{ marginBottom: '20px' }} className="text-gradient">Base de Clientes</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '0.9rem' }}>Ingresá la Contraseña Maestra para gestionar clientes.</p>
                    <form onSubmit={handleLogin} method="POST">
                        <input
                            type="password"
                            className="glass-input"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ marginBottom: '20px', textAlign: 'center' }}
                            required
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
                            <button type="submit" className="glass-button" style={{ width: '100%', padding: '15px' }}>
                                Ingresar
                            </button>
                            <Link href="/admin">
                                <button type="button" className="glass-button" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: 'none' }}>
                                    Cancelar
                                </button>
                            </Link>
                        </div>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '5px' }}>Base de Clientes</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Gestiona tus clientes recurrentes</p>
                </div>
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                    gap: '10px',
                    background: 'rgba(255,255,255,0.02)',
                    padding: '10px',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    width: '100%',
                    maxWidth: '800px'
                }}>
                    <button onClick={() => window.location.reload()} className="glass-button" style={{ padding: '8px', fontSize: '0.7rem', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid #f59e0b', color: '#f59e0b' }}>
                        🔄 Actualizar
                    </button>
                    <Link href="/admin" style={{ display: 'flex' }}>
                        <button className="glass-button" style={{ padding: '8px', fontSize: '0.7rem', width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--accent-light)' }}>
                            📦 Pedidos
                        </button>
                    </Link>
                    <Link href="/admin/drivers" style={{ display: 'flex' }}>
                        <button className="glass-button" style={{ padding: '8px', fontSize: '0.7rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success-color)', color: 'var(--success-color)', width: '100%' }}>
                            👷 Choferes
                        </button>
                    </Link>
                    <Link href="/admin/vehicles" style={{ display: 'flex' }}>
                        <button className="glass-button" style={{ padding: '8px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--accent-light)', width: '100%' }}>
                            🚘 Vehículos
                        </button>
                    </Link>
                    <Link href="/admin/config" style={{ display: 'flex' }}>
                        <button className="glass-button" style={{ padding: '8px', fontSize: '0.7rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--accent-light)', width: '100%' }}>
                            ⚙️ Tarifas
                        </button>
                    </Link>
                    <button onClick={handleLogout} className="glass-button" style={{ padding: '8px', fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444' }}>
                        🚪 Salir
                    </button>
                </div>
            </div>

            <div className="glass-panel mb-20" style={{ padding: '30px' }}>
                <h3 style={{ marginBottom: '20px' }}>{editingCustomer ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}</h3>
                <form onSubmit={handleSave} className="flex-col gap-20" method="POST">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                        <div>
                            <label className="glass-label">Nombre / Empresa</label>
                            <input
                                type="text"
                                className="glass-input"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="glass-label">Email</label>
                            <input
                                type="email"
                                className="glass-input"
                                value={form.email}
                                onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="glass-label">Teléfono</label>
                            <input
                                type="text"
                                className="glass-input"
                                value={form.phone}
                                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="glass-label">CUIT</label>
                            <input
                                type="text"
                                className="glass-input"
                                value={form.cuit}
                                onChange={(e) => setForm({ ...form, cuit: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="glass-label">Condición Fiscal</label>
                            <select
                                className="glass-input"
                                value={form.taxStatus}
                                onChange={(e) => setForm({ ...form, taxStatus: e.target.value })}
                            >
                                <option value="responsable_inscripto">Responsable Inscripto</option>
                                <option value="monotributista">Monotributista</option>
                                <option value="consumidor_final">Consumidor Final</option>
                                <option value="exento">Exento</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-10">
                        <button type="submit" className="glass-button" style={{ flex: 1, padding: '15px' }} disabled={saving}>
                            {saving ? 'Guardando...' : editingCustomer ? 'Actualizar Cliente' : 'Crear Cliente'}
                        </button>
                        {editingCustomer && (
                            <button type="button" className="glass-button" style={{ background: 'rgba(255,255,255,0.05)', border: 'none' }} onClick={() => { setEditingCustomer(null); setForm({ name: '', email: '', phone: '', cuit: '', taxStatus: 'responsable_inscripto' }); }}>
                                Cancelar
                            </button>
                        )}
                    </div>
                </form>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ textAlign: 'left', padding: '15px', color: 'var(--text-secondary)' }}>Cliente</th>
                                <th style={{ textAlign: 'left', padding: '15px', color: 'var(--text-secondary)' }}>Contacto</th>
                                <th style={{ textAlign: 'left', padding: '15px', color: 'var(--text-secondary)' }}>DNI/CUIT</th>
                                <th style={{ textAlign: 'right', padding: '15px', color: 'var(--text-secondary)' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map(c => (
                                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ padding: '15px' }}>
                                        <div style={{ fontWeight: 'bold' }}>{c.name}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.tax_status.replace('_', ' ')}</div>
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        <div style={{ fontSize: '0.9rem' }}>{c.phone}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.email}</div>
                                    </td>
                                    <td style={{ padding: '15px' }}>{c.cuit}</td>
                                    <td style={{ padding: '15px', textAlign: 'right' }}>
                                        <div className="flex gap-10" style={{ justifyContent: 'flex-end' }}>
                                            <button className="glass-button" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={() => handleEdit(c)}> Editar </button>
                                            <button className="glass-button" style={{ padding: '5px 12px', fontSize: '0.8rem', color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleDelete(c.id, c.name)}> Borrar </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {customers.length === 0 && (
                                <tr>
                                    <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay clientes registrados.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
