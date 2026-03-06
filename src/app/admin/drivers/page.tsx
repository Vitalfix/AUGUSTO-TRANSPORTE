"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AdminHeader from '@/components/AdminHeader';

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
            <div className="page-container flex items-center justify-center" style={{ minHeight: '80vh' }}>
                <div className="glass-panel p-20 w-full" style={{ maxWidth: '400px' }}>
                    <h2 className="text-gradient mb-20 text-center">Acceso Admin</h2>
                    <form onSubmit={handleLogin} className="flex-col gap-15">
                        <input
                            type="password"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9]*"
                            maxLength={4}
                            className="glass-input"
                            placeholder="Contraseña del Panel"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoFocus
                            required
                        />
                        <div className="grid-cols-auto gap-10">
                            <button type="submit" className="glass-button w-full p-15">
                                Ingresar
                            </button>
                            <Link href="/admin">
                                <button type="button" className="glass-button w-full border-none" style={{ background: 'rgba(255,255,255,0.05)' }}>
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
            <AdminHeader title="Gestión de Choferes" />

            <div className="flex-col gap-30" style={{ width: '100%' }}>
                {/* Form to New Driver */}
                <div className="glass-panel mb-20 p-20">
                    <div className="flex justify-between items-center pointer" onClick={() => setFormExpanded(!formExpanded)}>
                        <h3 className="m-0">➕ {formExpanded ? 'Cerrar Formulario' : 'Nuevo Chofer'}</h3>
                        <span style={{ transform: formExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }}>⌄</span>
                    </div>

                    {formExpanded && (
                        <form onSubmit={handleCreate} className="flex-col gap-20 mt-20" method="POST">
                            <div className="grid-cols-auto">
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
                    )}
                </div>
            </div>

            {/* List of Drivers */}
            <div className="flex-col gap-15">
                <h3 className="mb-10" style={{ opacity: 0.7 }}>Personal Registrado</h3>
                {drivers.length === 0 ? (
                    <div className="glass-panel p-20 text-center text-secondary">No hay choferes cargados aún.</div>
                ) : drivers.map(d => {
                    const isExpanded = expandedDrivers.includes(d.id);
                    const isEditing = editDriverId === d.id;

                    return (
                        <div key={d.id} className="glass-panel over-hidden" style={{ border: '1px solid var(--glass-border)', transition: 'all 0.3s ease' }}>
                            <div
                                className={`flex justify-between items-center p-20 pointer ${isExpanded ? 'p-20' : ''}`}
                                onClick={() => toggleDriver(d.id)}
                                style={{ background: isExpanded ? 'rgba(255,255,255,0.05)' : 'transparent' }}
                            >
                                <div className="flex items-center gap-15">
                                    <span style={{ fontSize: '1rem', transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: '0.3s' }}>▶</span>
                                    <div>
                                        <div className="text-lg text-bold">{d.name}</div>
                                    </div>
                                </div>
                                {!d.is_active && <span className="badge badge-pending text-error" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>INACTIVO</span>}
                                {d.is_active && <span className="badge badge-completed">ACTIVO</span>}
                            </div>

                            {isExpanded && !isEditing && (
                                <div className="p-20 flex justify-between items-center flex-wrap gap-20" style={{ borderTop: '1px solid var(--glass-border)' }}>
                                    <div className="grid-cols-auto flex-1 gap-20">
                                        <div>
                                            <div className="glass-label text-sm">TELÉFONO</div>
                                            <div className="text-accent">{d.phone}</div>
                                        </div>
                                        <div>
                                            <div className="glass-label text-sm">PIN DE ACCESO</div>
                                            <div className="font-mono" style={{ letterSpacing: '2px' }}>{d.pin}</div>
                                        </div>
                                        <div>
                                            <div className="glass-label text-sm">ID INTERNO</div>
                                            <div className="text-sm" style={{ opacity: 0.5 }}>{d.id.substring(0, 8)}...</div>
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
    );
}
