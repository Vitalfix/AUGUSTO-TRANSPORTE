"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export interface PricingConfig {
    id: string;
    name: string;
    description: string;
    priceKm: number;
    priceHour: number;
    priceWaitHour: number;
    priceStay: number;
}

export default function PricingConfigPage() {
    const [prices, setPrices] = useState<PricingConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    const [editValues, setEditValues] = useState<{ [key: string]: Partial<PricingConfig> }>({});
    const [expandedVehicles, setExpandedVehicles] = useState<string[]>([]);

    const toggleVehicle = (id: string) => {
        setExpandedVehicles(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

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
        fetchPrices();
    }, []);

    const fetchPrices = async () => {
        try {
            const res = await fetch('/api/pricing');
            const data = await res.json();
            setPrices(data);

            // Inicializar estados de edicion separados
            const initialEdits: any = {};
            data.forEach((p: PricingConfig) => {
                initialEdits[p.id] = { ...p };
            });
            setEditValues(initialEdits);
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
            } else {
                alert('Contraseña Incorrecta');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión al validar contraseña');
        }
    };

    const handleValueChange = (id: string, field: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setEditValues(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: numValue
            }
        }));
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setChangingPassword(true);
        try {
            const res = await fetch('/api/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'change_password', password, newPassword })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Contraseña actualizada correctamente');
                setPassword(newPassword);
                setNewPassword('');
            } else {
                alert(data.error || 'Error al cambiar contraseña');
            }
        } catch (e) {
            console.error(e);
            alert('Error al cambiar contraseña');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleSave = async (id: string) => {
        if (!password) {
            alert("Vuelve a ingresar la contraseña");
            return;
        }

        setSavingId(id);
        const dataToSave = editValues[id];
        try {
            const res = await fetch('/api/pricing', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password
                },
                body: JSON.stringify({
                    id,
                    priceKm: dataToSave.priceKm,
                    priceHour: dataToSave.priceHour,
                    priceWaitHour: dataToSave.priceWaitHour,
                    priceStay: dataToSave.priceStay
                }),
            });

            if (res.ok) {
                // blink success
                setSavingId(`success-${id}`);
                setTimeout(() => setSavingId(null), 2000);
            } else {
                const errData = await res.json();
                alert(`Error al guardar: ${errData.error || 'Desconocido'}`);
                setSavingId(null);
            }
        } catch (e) {
            console.error(e);
            alert("Error de conexión");
            setSavingId(null);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('admin_password');
        setIsAuthenticated(false);
        setPassword('');
    };

    if (loading) {
        return <div className="page-container" style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>Cargando Panel de Precios...</div>;
    }

    if (!isAuthenticated) {
        return (
            <div className="page-container" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
                <div className="glass-panel" style={{ padding: '40px 20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🔒</div>
                    <h2 style={{ marginBottom: '20px' }} className="text-gradient">Acceso Restringido</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '0.9rem' }}>Ingresá el PIN de 4 dígitos para editar las tarifas.</p>
                    <form onSubmit={handleLogin} method="POST">
                        <input
                            type="password"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9]*"
                            maxLength={4}
                            className="glass-input"
                            placeholder="PIN de 4 dígitos"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ marginBottom: '20px', textAlign: 'center', fontSize: '1.5rem', letterSpacing: '10px' }}
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
                    <h1 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '5px' }}>Panel de Tarifas</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Ajuste de valores para cálculo automático</p>
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
                    <button onClick={handleLogout} className="glass-button" style={{ padding: '8px', fontSize: '0.7rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444' }}>
                        🚪 Salir
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gap: '20px' }}>
                {prices.length === 0 && (
                    <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        ⚠️ La tabla &quot;pricing_config&quot; no existe o no tiene datos cargados en la base de datos.<br />
                        Asegúrate de ejecutar el comando SQL de actualización en Supabase.
                    </div>
                )}
                {prices.map(vehicle => {
                    const currentEdits = editValues[vehicle.id];
                    if (!currentEdits) return null;
                    const isExpanded = expandedVehicles.includes(vehicle.id);

                    return (
                        <div key={vehicle.id} className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--glass-border)', transition: 'all 0.3s ease' }}>
                            <div
                                onClick={() => toggleVehicle(vehicle.id)}
                                style={{ padding: '20px 30px', background: isExpanded ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', borderBottom: isExpanded ? '1px solid var(--glass-border)' : '1px solid transparent' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                    <span style={{ fontSize: '1.2rem', transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.3s ease' }}>⌄</span>
                                    <div>
                                        <h2 style={{ fontSize: '1.3rem', margin: 0 }}>{vehicle.name}</h2>
                                        {!isExpanded && <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>KM: ${currentEdits.priceKm} | Hora: ${currentEdits.priceHour}</div>}
                                    </div>
                                </div>
                                <button
                                    className="glass-button"
                                    onClick={(e) => { e.stopPropagation(); handleSave(vehicle.id); }}
                                    disabled={savingId === vehicle.id}
                                    style={{
                                        background: savingId === `success-${vehicle.id}` ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'var(--accent-gradient)',
                                        padding: '8px 20px',
                                        fontSize: '0.85rem'
                                    }}
                                >
                                    {savingId === vehicle.id ? '...' : savingId === `success-${vehicle.id}` ? '✅' : 'Guardar'}
                                </button>
                            </div>

                            {isExpanded && (
                                <div style={{ padding: '25px' }}>
                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px' }}>{vehicle.description}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                                        <div>
                                            <label className="glass-label" style={{ fontSize: '0.85rem' }}>Valor por KM (&gt; 100km)</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '15px', top: '12px', color: 'var(--text-secondary)' }}>$</span>
                                                <input
                                                    type="number"
                                                    className="glass-input"
                                                    value={currentEdits.priceKm || ''}
                                                    onChange={(e) => handleValueChange(vehicle.id, 'priceKm', e.target.value)}
                                                    style={{ paddingLeft: '35px' }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="glass-label" style={{ fontSize: '0.85rem' }}>Valor por Hora (&lt; 100km)</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '15px', top: '12px', color: 'var(--text-secondary)' }}>$</span>
                                                <input
                                                    type="number"
                                                    className="glass-input"
                                                    value={currentEdits.priceHour || ''}
                                                    onChange={(e) => handleValueChange(vehicle.id, 'priceHour', e.target.value)}
                                                    style={{ paddingLeft: '35px' }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="glass-label" style={{ fontSize: '0.85rem' }}>Espera (X Hora extra)</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '15px', top: '12px', color: 'var(--text-secondary)' }}>$</span>
                                                <input
                                                    type="number"
                                                    className="glass-input"
                                                    value={currentEdits.priceWaitHour || ''}
                                                    onChange={(e) => handleValueChange(vehicle.id, 'priceWaitHour', e.target.value)}
                                                    style={{ paddingLeft: '35px' }}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="glass-label" style={{ fontSize: '0.85rem' }}>Estadía Nocturna</label>
                                            <div style={{ position: 'relative' }}>
                                                <span style={{ position: 'absolute', left: '15px', top: '12px', color: 'var(--text-secondary)' }}>$</span>
                                                <input
                                                    type="number"
                                                    className="glass-input"
                                                    value={currentEdits.priceStay || ''}
                                                    onChange={(e) => handleValueChange(vehicle.id, 'priceStay', e.target.value)}
                                                    style={{ paddingLeft: '35px' }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="glass-panel" style={{ padding: '30px', marginTop: '40px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '15px', color: 'var(--text-primary)' }}>Seguridad de Acceso</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Modifica la contraseña maestra de acceso a este panel y guardado de tarifas.</p>
                <form onSubmit={handleChangePassword} style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }} method="POST">
                    <input
                        type="password"
                        className="glass-input"
                        placeholder="Nueva Contraseña (min. 4)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        minLength={4}
                        style={{ maxWidth: '300px' }}
                    />
                    <button type="submit" className="glass-button" disabled={changingPassword} style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid rgba(239, 68, 68, 0.5)' }}>
                        {changingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
}
