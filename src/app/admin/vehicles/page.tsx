"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export interface Vehicle {
    id: string;
    name: string;
    description: string;
}

export default function VehiclesPage() {
    const [vehicles, setVehicles] = useState<Vehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    const [form, setForm] = useState({ name: '', description: '' });
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
                setForm({ name: '', description: '' });
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
        setForm({ name: v.name, description: v.description });
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
            <div className="flex justify-between items-center mb-20" style={{ flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '5px' }}>Gestión de Vehículos / Tipos de Carga</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Modificá los nombres y la capacidad (Kilos/Pallets) de tu flota</p>
                </div>
                <div className="flex gap-10">
                    <Link href="/admin" style={{ display: 'contents' }}>
                        <button className="glass-button" style={{ padding: '10px 20px', fontSize: '0.9rem' }}>📦 Pedidos</button>
                    </Link>
                    <Link href="/admin/config" style={{ display: 'contents' }}>
                        <button className="glass-button" style={{ padding: '10px 20px', fontSize: '0.9rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--accent-light)' }}>
                            ⚙️ Tarifas
                        </button>
                    </Link>
                    <button onClick={handleLogout} className="glass-button" style={{ padding: '10px 20px', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444' }}>
                        🚪 Salir
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

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

                        <div className="flex gap-10 mt-10">
                            {editingVehicle && (
                                <button type="button" className="glass-button" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }} onClick={() => { setEditingVehicle(null); setForm({ name: '', description: '' }); }}>
                                    Cancelar
                                </button>
                            )}
                            <button type="submit" className="glass-button" style={{ flex: 2, background: 'var(--accent-gradient)' }} disabled={saving}>
                                {saving ? 'Guardando...' : (editingVehicle ? '💾 GUARDAR CAMBIOS' : '➕ AGREGAR VEHÍCULO')}
                            </button>
                        </div>
                    </form>

                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '10px', marginTop: '20px' }}>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            ℹ️ Nota: Para que el nuevo vehículo aparezca en la cotización, asegurate de configurarle su precio por kilómetro y hora en la sección de <strong><Link href="/admin/config" style={{ color: 'var(--accent-color)', textDecoration: 'underline' }}>Tarifas</Link></strong> una vez agregado.
                        </p>
                    </div>
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
