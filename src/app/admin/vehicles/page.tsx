"use client";

import { useState, useEffect } from 'react';
import AdminMenu from '@/components/AdminMenu';

export interface Vehicle {
    id: string;
    name: string;
    description: string;
    price_km: number;
    price_hour: number;
    price_wait_hour: number;
}

export default function VehiclesPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const [form, setForm] = useState({
        name: '',
        description: '',
        price_km: 0,
        price_hour: 0,
        price_wait_hour: 0
    });
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
    const [saving, setSaving] = useState(false);

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
        }
        fetchVehicles();
    }, []);

    const fetchVehicles = async () => {
        try {
            const res = await fetch('/api/vehicles');
            const data = await res.json();
            if (res.ok) {
                setVehicles(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'login', password })
            });
            if (res.ok) {
                setIsAuthenticated(true);
                sessionStorage.setItem('admin_password', password);
            } else {
                alert('Contraseña Incorrecta');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión al validar contraseña');
        }
    };

    const saveVehicle = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.description) {
            alert('Completá nombre y descripción (capacidad)');
            return;
        }

        setSaving(true);
        try {
            const url = '/api/vehicles';
            const method = editingVehicle ? 'PATCH' : 'POST';

            const payload = editingVehicle
                ? { id: editingVehicle.id, ...form }
                : { ...form };

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                fetchVehicles();
                setEditingVehicle(null);
                setForm({ name: '', description: '', price_km: 0, price_hour: 0, price_wait_hour: 0 });
            } else {
                const data = await res.json();
                alert(`Error al guardar: ${data.error}`);
            }
        } catch (e) {
            console.error(e);
            alert('Error al guardar vehículo');
        } finally {
            setSaving(false);
        }
    };

    const deleteVehicle = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que deseás eliminar el vehículo ${name}? Las órdenes pasadas no se verán afectadas.`)) {
            return;
        }
        try {
            const res = await fetch(`/api/vehicles?id=${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-password': password }
            });
            if (res.ok) {
                fetchVehicles();
            } else {
                const data = await res.json();
                alert(`Error: ${data.error}`);
            }
        } catch (e) {
            console.error(e);
            alert("Error al eliminar");
        }
    };

    const handleEditClick = (v: Vehicle) => {
        setEditingVehicle(v);
        setForm({
            name: v.name,
            description: v.description,
            price_km: v.price_km || 0,
            price_hour: v.price_hour || 0,
            price_wait_hour: v.price_wait_hour || 0
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleLogout = () => {
        sessionStorage.removeItem('admin_password');
        setIsAuthenticated(false);
        setPassword('');
    };

    if (loading) return <div className="page-container" style={{ textAlign: 'center', padding: '50px' }}>Cargando Vehículos...</div>;

    if (!isAuthenticated) {
        return (
            <div className="page-container" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
                <div className="glass-panel" style={{ padding: '40px 20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🚘</div>
                    <h2 style={{ marginBottom: '20px' }} className="text-gradient">Autenticación Requerida</h2>
                    <form onSubmit={handleLogin} method="POST">
                        <input
                            type="password"
                            className="glass-input"
                            placeholder="Contraseña Maestra"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ marginBottom: '20px', textAlign: 'center' }}
                            required
                        />
                        <button type="submit" className="glass-button" style={{ width: '100%' }}>Ingresar</button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ padding: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'nowrap', gap: '20px' }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '5px' }}>Gestión de Flota</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Configurá vehículos y sus tarifas base</p>
                </div>
                <AdminMenu password={password} onLogout={handleLogout} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

                {/* Formulario */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <h2 style={{ marginBottom: '15px', color: 'var(--accent-color)' }}>
                        {editingVehicle ? `Edición: ${editingVehicle.name}` : 'Crear Nuevo Vehículo'}
                    </h2>

                    <form onSubmit={saveVehicle} className="flex-col gap-15">
                        <div>
                            <label className="glass-label">Nombre del Vehículo</label>
                            <input
                                type="text"
                                className="glass-input"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="Ej: Camioneta XL"
                                required
                            />
                        </div>
                        <div>
                            <label className="glass-label">Capacidad (Kilos / Pallets)</label>
                            <input
                                type="text"
                                className="glass-input"
                                value={form.description}
                                onChange={e => setForm({ ...form, description: e.target.value })}
                                placeholder="Ej: Hasta 1500kg o 4 pallets"
                                required
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                            <div>
                                <label className="glass-label">Precio x KM ($)</label>
                                <input
                                    type="number"
                                    className="glass-input"
                                    value={form.price_km}
                                    onChange={e => setForm({ ...form, price_km: parseFloat(e.target.value) || 0 })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="glass-label">Precio x Hora ($)</label>
                                <input
                                    type="number"
                                    className="glass-input"
                                    value={form.price_hour}
                                    onChange={e => setForm({ ...form, price_hour: parseFloat(e.target.value) || 0 })}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="glass-label">Precio Hora de Espera ($)</label>
                            <input
                                type="number"
                                className="glass-input"
                                value={form.price_wait_hour}
                                onChange={e => setForm({ ...form, price_wait_hour: parseFloat(e.target.value) || 0 })}
                                required
                            />
                        </div>

                        <div className="flex gap-10 mt-10">
                            {editingVehicle && (
                                <button type="button" className="glass-button" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }} onClick={() => { setEditingVehicle(null); setForm({ name: '', description: '', price_km: 0, price_hour: 0, price_wait_hour: 0 }); }}>
                                    Cancelar
                                </button>
                            )}
                            <button type="submit" className="glass-button" style={{ flex: 2, background: 'var(--accent-gradient)' }} disabled={saving}>
                                {saving ? 'Guardando...' : (editingVehicle ? '💾 GUARDAR CAMBIOS' : '➕ AGREGAR VEHÍCULO')}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Lista */}
                <div className="flex-col gap-15">
                    {vehicles.length === 0 ? (
                        <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>No hay vehículos configurados.</div>
                    ) : (
                        vehicles.map(v => (
                            <div key={v.id} className="glass-panel items-center justify-between flex" style={{ padding: '15px' }}>
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'white' }}>{v.name}</h3>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '5px' }}>{v.description}</div>
                                    <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-light)' }}>
                                            KM: <strong>${v.price_km}</strong>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-light)' }}>
                                            Hora: <strong>${v.price_hour}</strong>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-light)' }}>
                                            Espera: <strong>${v.price_wait_hour}</strong>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-5">
                                    <button
                                        className="glass-button"
                                        style={{ padding: '8px 12px', fontSize: '0.8rem' }}
                                        onClick={() => handleEditClick(v)}
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        className="glass-button"
                                        style={{ padding: '8px 12px', fontSize: '0.8rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}
                                        onClick={() => deleteVehicle(v.id, v.name)}
                                    >
                                        ❌
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
