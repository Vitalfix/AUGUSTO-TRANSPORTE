"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminHeader from '@/components/AdminHeader';

interface Customer {
    id: string;
    name: string;
    email: string;
    phone: string;
    cuit: string;
    tax_status: string;
    has_special_pricing: boolean;
    special_prices: any;
}

interface VehiclePricing {
    id: string;
    name: string;
    priceKm: number;
    priceHour: number;
    priceWaitHour?: number;
}

export default function CustomerManagementPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [vehicles, setVehicles] = useState<VehiclePricing[]>([]);
    const [showSpecialPricesModal, setShowSpecialPricesModal] = useState(false);

    const [form, setForm] = useState({
        name: '',
        email: '',
        phone: '',
        cuit: '',
        taxStatus: 'responsable_inscripto',
        hasSpecialPricing: false,
        specialPrices: {} as any
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
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        try {
            const res = await fetch('/api/pricing');
            const data = await res.json();
            if (res.ok) setVehicles(data);
        } catch (e) {
            console.error("Error fetching vehicles:", e);
        }
    };

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
        if (e) e.preventDefault();
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
                setForm({
                    name: '',
                    email: '',
                    phone: '',
                    cuit: '',
                    taxStatus: 'responsable_inscripto',
                    hasSpecialPricing: false,
                    specialPrices: {}
                });
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
                    setForm({ name: '', email: '', phone: '', cuit: '', taxStatus: 'responsable_inscripto', hasSpecialPricing: false, specialPrices: {} });
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
            taxStatus: c.tax_status || 'responsable_inscripto',
            hasSpecialPricing: c.has_special_pricing || false,
            specialPrices: c.special_prices || {}
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const updateSpecialPrice = (vehicleId: string, field: string, value: string) => {
        const numVal = parseFloat(value) || 0;
        setForm(prev => ({
            ...prev,
            specialPrices: {
                ...prev.specialPrices,
                [vehicleId]: {
                    ...(prev.specialPrices[vehicleId] || {}),
                    [field]: numVal
                }
            }
        }));
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
            {showSpecialPricesModal && (
                <div className="modal-overlay" style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}>
                    <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '25px' }}>
                            <h2 className="text-gradient">Precios Especiales: {form.name || 'Cliente'}</h2>
                            <button onClick={() => setShowSpecialPricesModal(false)} className="glass-button" style={{ padding: '5px 15px', background: 'rgba(255,255,255,0.05)', border: 'none' }}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gap: '15px' }}>
                            {vehicles.map(v => (
                                <div key={v.id} className="glass-panel" style={{ padding: '15px', background: 'rgba(255,255,255,0.02)' }}>
                                    <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid var(--glass-border)', paddingBottom: '5px' }}>{v.name}</h4>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '15px' }}>
                                        <div>
                                            <label className="glass-label" style={{ fontSize: '0.75rem' }}>Precio KM</label>
                                            <input
                                                type="number"
                                                className="glass-input"
                                                value={form.specialPrices[v.id]?.priceKm ?? v.priceKm}
                                                onChange={e => updateSpecialPrice(v.id, 'priceKm', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="glass-label" style={{ fontSize: '0.75rem' }}>Precio Hora</label>
                                            <input
                                                type="number"
                                                className="glass-input"
                                                value={form.specialPrices[v.id]?.priceHour ?? v.priceHour}
                                                onChange={e => updateSpecialPrice(v.id, 'priceHour', e.target.value)}
                                            />
                                        </div>
                                        <div>
                                            <label className="glass-label" style={{ fontSize: '0.75rem' }}>Precio Espera</label>
                                            <input
                                                type="number"
                                                className="glass-input"
                                                value={form.specialPrices[v.id]?.priceWaitHour ?? (v.priceWaitHour || 0)}
                                                onChange={e => updateSpecialPrice(v.id, 'priceWaitHour', e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: '30px', display: 'flex', gap: '15px' }}>
                            <button onClick={() => setShowSpecialPricesModal(false)} className="glass-button" style={{ flex: 1, padding: '15px' }}>Listo</button>
                        </div>
                    </div>
                </div>
            )}

            <AdminHeader title="Base de Clientes" />

            <div className="glass-panel mb-20 p-20">
                <h3 className="mb-20">{editingCustomer ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}</h3>
                <form onSubmit={handleSave} className="flex-col gap-20" method="POST">
                    <div className="grid-cols-auto">
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
                        <div className="flex items-center gap-10 mt-10">
                            <label className="glass-label" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                <input
                                    type="checkbox"
                                    checked={form.hasSpecialPricing}
                                    onChange={(e) => setForm({ ...form, hasSpecialPricing: e.target.checked })}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                Tiene Precio Especial
                            </label>
                            {form.hasSpecialPricing && (
                                <button
                                    type="button"
                                    className="glass-button"
                                    style={{ padding: '5px 15px', background: 'var(--accent-gradient)', fontSize: '0.8rem' }}
                                    onClick={() => setShowSpecialPricesModal(true)}
                                >
                                    ⚙️ Configurar Precios
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex gap-10">
                        <button type="submit" className="glass-button" style={{ flex: 1, padding: '15px' }} disabled={saving}>
                            {saving ? 'Guardando...' : editingCustomer ? 'Actualizar Cliente' : 'Crear Cliente'}
                        </button>
                        {editingCustomer && (
                            <button
                                type="button"
                                className="glass-button"
                                style={{ background: 'rgba(255,255,255,0.05)', border: 'none' }}
                                onClick={() => {
                                    setEditingCustomer(null);
                                    setForm({
                                        name: '',
                                        email: '',
                                        phone: '',
                                        cuit: '',
                                        taxStatus: 'responsable_inscripto',
                                        hasSpecialPricing: false,
                                        specialPrices: {}
                                    });
                                }}
                            >
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
                                        <div style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {c.name}
                                            {c.has_special_pricing && <span title="Precio Especial" style={{ fontSize: '0.9rem' }}>⭐</span>}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.tax_status?.replace('_', ' ') || 'Sin clasificar'}</div>
                                    </td>
                                    <td style={{ padding: '15px' }}>
                                        <div style={{ fontSize: '0.9rem' }}>{c.phone}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{c.email}</div>
                                    </td>
                                    <td style={{ padding: '15px' }}>{c.cuit}</td>
                                    <td style={{ padding: '15px', textAlign: 'right' }}>
                                        <div className="flex gap-10" style={{ justifyContent: 'flex-end' }}>
                                            <button className="glass-button" style={{ padding: '5px 12px', fontSize: '0.8rem' }} onClick={() => handleEdit(c)}> Editar </button>
                                            <button className="glass-button" style={{ padding: '5px 12px', fontSize: '0.8rem', color: '#fff', background: 'rgba(239, 68, 68, 0.2)', borderColor: '#ef4444' }} onClick={() => handleDelete(c.id, c.name)}> Borrar </button>
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
        </div >
    );
}
