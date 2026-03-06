"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Location {
    id: string;
    name: string;
    lat: number;
    lng: number;
    icon: string;
}

export default function AdminLocationsPage() {
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [saving, setSaving] = useState(false);

    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [form, setForm] = useState({
        name: '',
        lat: '',
        lng: '',
        icon: '📍'
    });

    useEffect(() => {
        const savedPass = sessionStorage.getItem('admin_password');
        if (savedPass) {
            setPassword(savedPass);
            setIsAuthenticated(true);
        }
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const res = await fetch('/api/locations');
            if (res.ok) {
                const data = await res.json();
                setLocations(data);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
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
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name || !form.lat || !form.lng) {
            alert('Por favor completa Nombre, Latitud y Longitud');
            return;
        }

        setSaving(true);
        try {
            const method = editingLocation ? 'PATCH' : 'POST';
            const payload = editingLocation ? { id: editingLocation.id, ...form, lat: parseFloat(form.lat), lng: parseFloat(form.lng) } : { ...form, lat: parseFloat(form.lat), lng: parseFloat(form.lng) };

            const res = await fetch('/api/locations', {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setEditingLocation(null);
                setForm({ name: '', lat: '', lng: '', icon: '📍' });
                fetchLocations();
            } else {
                const data = await res.json();
                alert('Error: ' + data.error);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('¿Seguro quieres eliminar esta ubicación?')) return;
        try {
            const res = await fetch(`/api/locations?id=${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-password': password }
            });
            if (res.ok) fetchLocations();
        } catch (e) {
            console.error(e);
        }
    };

    const startEdit = (loc: Location) => {
        setEditingLocation(loc);
        setForm({
            name: loc.name,
            lat: loc.lat.toString(),
            lng: loc.lng.toString(),
            icon: loc.icon || '📍'
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (!isAuthenticated) {
        return (
            <div className="page-container flex justify-center items-center" style={{ minHeight: '80vh' }}>
                <form onSubmit={handleLogin} className="glass-panel" style={{ padding: '40px', maxWidth: '400px', width: '100%' }}>
                    <h2 className="text-gradient mb-20">Acceso Admin - Direcciones</h2>
                    <input
                        type="password"
                        className="glass-input mb-20"
                        placeholder="Contraseña de Administrador"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" className="glass-button w-full">Ingresar</button>
                    <Link href="/admin" className="block text-center mt-20" style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>← Volver al Panel</Link>
                </form>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ maxWidth: '900px' }}>
            <header className="flex justify-between items-center mb-30">
                <div>
                    <Link href="/admin" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>← Volver</Link>
                    <h1 className="text-gradient">Gestionar Direcciones Fijas</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Bases y Puntos de Referencia para Presupuestos</p>
                </div>
            </header>

            <div className="glass-panel mb-30 animate-fade-in" style={{ padding: '30px' }}>
                <h3 className="mb-25 flex items-center gap-10">
                    {editingLocation ? '✏️ Editar Ubicación' : '➕ Nueva Ubicación Registrada'}
                </h3>
                <form onSubmit={handleSave} className="flex-col gap-20">
                    <div className="grid-cols-2 gap-20">
                        <div style={{ flex: '2 1 300px' }}>
                            <label className="glass-label">Nombre de la Ubicación (ej: Ezeiza Base)</label>
                            <input
                                className="glass-input"
                                value={form.name}
                                onChange={e => setForm({ ...form, name: e.target.value })}
                                placeholder="Nombre descriptivo"
                                required
                            />
                        </div>
                        <div style={{ flex: '1 1 80px' }}>
                            <label className="glass-label">Icono</label>
                            <input
                                className="glass-input"
                                value={form.icon}
                                onChange={e => setForm({ ...form, icon: e.target.value })}
                                placeholder="Emoji"
                            />
                        </div>
                    </div>
                    <div className="flex gap-15" style={{ flexWrap: 'wrap' }}>
                        <div style={{ flex: 1 }}>
                            <label className="glass-label">Latitud</label>
                            <input
                                type="number"
                                step="any"
                                className="glass-input"
                                value={form.lat}
                                onChange={e => setForm({ ...form, lat: e.target.value })}
                                placeholder="-34.815"
                                required
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="glass-label">Longitud</label>
                            <input
                                type="number"
                                step="any"
                                className="glass-input"
                                value={form.lng}
                                onChange={e => setForm({ ...form, lng: e.target.value })}
                                placeholder="-58.535"
                                required
                            />
                        </div>
                    </div>
                    <div className="flex gap-10">
                        <button type="submit" className="glass-button" style={{ flex: 2 }} disabled={saving}>
                            {saving ? 'Guardando...' : (editingLocation ? 'Actualizar Ubicación' : 'Crear Ubicación')}
                        </button>
                        {editingLocation && (
                            <button
                                type="button"
                                className="glass-button"
                                style={{ flex: 1, background: 'var(--glass-bg-secondary)', color: 'var(--text-primary)' }}
                                onClick={() => {
                                    setEditingLocation(null);
                                    setForm({ name: '', lat: '', lng: '', icon: '📍' });
                                }}
                            >
                                Cancelar
                            </button>
                        )}
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                        💡 Tip: Puedes obtener la lat/long haciendo clic derecho en Google Maps sobre el punto deseado.
                    </p>
                </form>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>Cargando direcciones...</div>
            ) : (
                <div className="grid-cols-1 gap-15">
                    {locations.map((loc, i) => (
                        <div
                            key={loc.id}
                            className="glass-panel animate-fade-in flex justify-between items-center"
                            style={{ padding: '20px 30px', animationDelay: `${i * 100}ms` }}
                        >
                            <div className="flex items-center gap-20">
                                <div style={{
                                    fontSize: '1.5rem',
                                    background: 'rgba(255,255,255,0.03)',
                                    width: '60px',
                                    height: '60px',
                                    borderRadius: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '1px solid rgba(255,255,255,0.05)'
                                }}>
                                    {loc.icon || '📍'}
                                </div>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{loc.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                        {loc.lat.toFixed(4)}, {loc.lng.toFixed(4)}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-10">
                                <button className="filter-btn" onClick={() => startEdit(loc)}>✏️ Editar</button>
                                <button
                                    className="filter-btn"
                                    style={{ border: '1px solid rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                                    onClick={() => handleDelete(loc.id)}
                                >
                                    🗑️ Borrar
                                </button>
                            </div>
                        </div>
                    ))}
                    {locations.length === 0 && (
                        <div className="glass-panel" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                            No hay direcciones fijas configuradas. Las bases de Ezeiza y Ruta 8 son las predeterminadas si no agregas nada.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
