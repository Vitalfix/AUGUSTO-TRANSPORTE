"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function DriverManagementPage() {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formExpanded, setFormExpanded] = useState(false);
    const [expandedDrivers, setExpandedDrivers] = useState<string[]>([]);

    const toggleDriver = (id: string) => {
        setExpandedDrivers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
        setEditDriverId(null);
    };

    // Form for new driver
    const [newDriver, setNewDriver] = useState({
        name: '',
        phone: '',
        pin: '1234'
    });

    const [editDriverId, setEditDriverId] = useState<string | null>(null);
    const [editDriverForm, setEditDriverForm] = useState({
        name: '', phone: '', pin: ''
    });

    useEffect(() => {
        const savedPass = sessionStorage.getItem('admin_password');
        if (savedPass) {
            setPassword(savedPass);
            setIsAuthenticated(true);
        } else {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) fetchDrivers();
    }, [isAuthenticated]);

    const handleLogout = () => {
        sessionStorage.removeItem('admin_password');
        setIsAuthenticated(false);
        setPassword('');
    };

    const fetchDrivers = async () => {
        try {
            const res = await fetch('/api/drivers/manage', {
                headers: { 'x-admin-password': password }
            });
            const data = await res.json();
            if (res.ok) {
                setDrivers(data);
            } else {
                setIsAuthenticated(false);
                alert('Sesión expirada o contraseña incorrecta');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/drivers/manage', {
                headers: { 'x-admin-password': password }
            });
            if (res.ok) {
                setIsAuthenticated(true);
                sessionStorage.setItem('admin_password', password);
                const data = await res.json();
                setDrivers(data);
            } else {
                alert('Contraseña Incorrecta');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/drivers/manage', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password
                },
                body: JSON.stringify({ ...newDriver, license_plate: '' })
            });
            if (res.ok) {
                setNewDriver({ name: '', phone: '', pin: '1234' });
                setFormExpanded(false);
                fetchDrivers();
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (d: any) => {
        setEditDriverId(d.id);
        setEditDriverForm({ name: d.name, phone: d.phone, pin: d.pin });
    };

    const saveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editDriverId) return;
        setSaving(true);
        try {
            const res = await fetch('/api/drivers/manage', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password
                },
                body: JSON.stringify({ id: editDriverId, ...editDriverForm })
            });
            if (res.ok) {
                setEditDriverId(null);
                fetchDrivers();
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Seguro que quieres eliminar a ${name}?`)) return;
        try {
            const res = await fetch(`/api/drivers/manage?id=${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-password': password }
            });
            if (res.ok) fetchDrivers();
            else alert('Error al eliminar');
        } catch (e) {
            console.error(e);
        }
    };

    const toggleActive = async (id: string, current: boolean) => {
        try {
            await fetch('/api/drivers/manage', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
                body: JSON.stringify({ id, is_active: !current })
            });
            fetchDrivers();
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) return <div className="page-container" style={{ textAlign: 'center', padding: '50px' }}>Cargando...</div>;

    if (!isAuthenticated) {
        return (
            <div className="page-container" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
                <div className="glass-panel" style={{ padding: '40px 20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🔒</div>
                    <h2 style={{ marginBottom: '20px' }} className="text-gradient">Autenticación Requerida</h2>
                    <form onSubmit={handleLogin} method="POST">
                        <input
                            type="password"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9]*"
                            maxLength={4}
                            className="glass-input"
                            placeholder="Contraseña Maestra"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ marginBottom: '20px', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '10px' }}
                            required
                        />
                        <button type="submit" className="glass-button" style={{ width: '100%', padding: '15px' }}>Ingresar</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', flexWrap: 'wrap', gap: '20px' }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '5px' }}>Gestión de Choferes</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Da de alta, baja y modifica los datos de tus choferes</p>
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
                    <Link href="/admin/customers" style={{ display: 'flex' }}>
                        <button className="glass-button" style={{ padding: '8px', fontSize: '0.7rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#3b82f6', width: '100%' }}>
                            👥 Clientes
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

            <div className="flex-col gap-30" style={{ width: '100%' }}>
                {/* Form to New Driver */}
                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
                    <div
                        onClick={() => setFormExpanded(!formExpanded)}
                        style={{ padding: '20px 30px', background: 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                    >
                        <h3 style={{ margin: 0 }}>➕ Nuevo Chofer</h3>
                        <span style={{ fontSize: '1.2rem', transform: formExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.3s ease' }}>⌄</span>
                    </div>

                    {formExpanded && (
                        <div style={{ padding: '30px' }}>
                            <form onSubmit={handleCreate} className="flex-col gap-20" method="POST">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                    <div>
                                        <label className="glass-label">Nombre Completo</label>
                                        <input
                                            type="text"
                                            className="glass-input"
                                            value={newDriver.name}
                                            onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="glass-label">Teléfono (X WhatsApp)</label>
                                        <input
                                            type="tel"
                                            className="glass-input"
                                            value={newDriver.phone}
                                            onChange={(e) => setNewDriver({ ...newDriver, phone: e.target.value })}
                                            placeholder="Ej: 54911..."
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="glass-label">PIN de acceso (4 números)</label>
                                        <input
                                            type="password"
                                            className="glass-input"
                                            maxLength={4}
                                            value={newDriver.pin}
                                            onChange={(e) => setNewDriver({ ...newDriver, pin: e.target.value })}
                                            placeholder="Por defecto: 1234"
                                            required
                                        />
                                    </div>
                                </div>
                                <button type="submit" className="glass-button w-full" disabled={saving} style={{ padding: '15px' }}>
                                    {saving ? 'Guardando...' : 'Registrar Chofer'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* List of Drivers */}
                <div className="flex-col gap-15">
                    <h3 style={{ marginBottom: '10px', opacity: 0.7 }}>Personal Registrado</h3>
                    {drivers.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay choferes cargados aún.</div>
                    ) : drivers.map(d => {
                        const isExpanded = expandedDrivers.includes(d.id);
                        const isEditing = editDriverId === d.id;

                        return (
                            <div key={d.id} className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--glass-border)', transition: 'all 0.3s ease' }}>
                                <div
                                    onClick={() => toggleDriver(d.id)}
                                    style={{ padding: '15px 25px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isExpanded ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <span style={{ fontSize: '1rem', transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.3s ease' }}>⌄</span>
                                        <div>
                                            <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{d.name}</div>
                                        </div>
                                    </div>
                                    {!d.is_active && <span className="badge badge-pending" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>INACTIVO</span>}
                                    {d.is_active && <span className="badge badge-completed">ACTIVO</span>}
                                </div>

                                {isExpanded && !isEditing && (
                                    <div style={{ padding: '20px 25px', borderTop: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', flex: 1 }}>
                                            <div>
                                                <div className="glass-label" style={{ fontSize: '0.7rem' }}>TELÉFONO</div>
                                                <div style={{ color: 'var(--accent-color)' }}>{d.phone}</div>
                                            </div>
                                            <div>
                                                <div className="glass-label" style={{ fontSize: '0.7rem' }}>PIN DE ACCESO</div>
                                                <div style={{ fontFamily: 'monospace', letterSpacing: '2px' }}>{d.pin}</div>
                                            </div>
                                            <div>
                                                <div className="glass-label" style={{ fontSize: '0.7rem' }}>ID INTERNO</div>
                                                <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>{d.id.substring(0, 8)}...</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-10">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); startEdit(d); }}
                                                className="glass-button"
                                                style={{ padding: '10px 20px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', border: 'none' }}
                                            >
                                                ✏️ Editar
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); toggleActive(d.id, d.is_active); }}
                                                className="glass-button"
                                                style={{ padding: '10px 20px', fontSize: '0.85rem', background: d.is_active ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16,185,129,0.1)', color: d.is_active ? '#ef4444' : 'var(--success-color)', border: 'none' }}
                                            >
                                                {d.is_active ? 'Desactivar' : 'Activar'}
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDelete(d.id, d.name); }}
                                                className="glass-button"
                                                style={{ padding: '10px 20px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', color: '#ef4444', border: 'none' }}
                                            >
                                                🗑️ Eliminar
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {isExpanded && isEditing && (
                                    <div style={{ padding: '20px 25px', borderTop: '1px solid var(--glass-border)' }}>
                                        <form onSubmit={saveEdit} className="flex-col gap-20">
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '20px' }}>
                                                <div>
                                                    <label className="glass-label">Nombre</label>
                                                    <input type="text" className="glass-input" value={editDriverForm.name} onChange={e => setEditDriverForm({ ...editDriverForm, name: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="glass-label">Teléfono</label>
                                                    <input type="tel" className="glass-input" value={editDriverForm.phone} onChange={e => setEditDriverForm({ ...editDriverForm, phone: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="glass-label">PIN</label>
                                                    <input type="text" className="glass-input" value={editDriverForm.pin} onChange={e => setEditDriverForm({ ...editDriverForm, pin: e.target.value })} />
                                                </div>
                                            </div>
                                            <div className="flex gap-10">
                                                <button type="button" className="glass-button" onClick={() => setEditDriverId(null)} style={{ flex: 1, background: 'var(--glass-bg-secondary)', border: 'none' }}>Cancelar</button>
                                                <button type="submit" className="glass-button" disabled={saving} style={{ flex: 2, background: 'var(--accent-gradient)' }}>
                                                    {saving ? 'Guardando...' : '💾 Guardar Cambios'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
