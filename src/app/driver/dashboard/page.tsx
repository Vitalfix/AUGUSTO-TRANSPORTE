"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Order {
    id: string;
    customerName: string;
    origin?: string;
    destination: string;
    status: 'PENDING' | 'CONFIRMED' | 'STARTED' | 'FINISHED';
    vehicle: string;
    travelDate?: string;
    travelTime?: string;
}

export default function DriverDashboardPage() {
    const [driver, setDriver] = useState<any>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [gpsStatus, setGpsStatus] = useState<'prompt' | 'granted' | 'denied'>('prompt');
    const [gpsError, setGpsError] = useState<string | null>(null);
    const router = useRouter();

    // Request permissions on mount
    useEffect(() => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                () => {
                    setGpsStatus('granted');
                    setGpsError(null);
                },
                (err) => {
                    if (err.code === 1) {
                        setGpsStatus('denied');
                        setGpsError("⚠️ UBICACION DESACTIVADA");
                    }
                }
            );
        }
    }, []);

    useEffect(() => {
        const session = localStorage.getItem('driver_session');
        if (!session) {
            router.push('/driver/login');
            return;
        }
        const driverData = JSON.parse(session);
        setDriver(driverData);

        const fetchMyOrders = async () => {
            try {
                const res = await fetch(`/api/orders?driverId=${driverData.id}&driverName=${encodeURIComponent(driverData.name)}`);
                if (res.ok) {
                    const allOrders: Order[] = await res.json();
                    // Filter again locally just in case, or trust the backend
                    const myOrders = allOrders.filter((o: any) =>
                        o.driverId === driverData.id ||
                        (o.driverName === driverData.name && !o.driverId)
                    );
                    setOrders(myOrders);
                } else {
                    console.error("No se pudieron cargar los viajes. Status:", res.status);
                }
            } catch (e) {
                console.error("Error fetching driver orders:", e);
            } finally {
                setLoading(false);
            }
        };

        fetchMyOrders();
        const interval = setInterval(fetchMyOrders, 5000);
        return () => clearInterval(interval);
    }, [router]);

    const logout = () => {
        localStorage.removeItem('driver_session');
        router.push('/');
    };

    if (!driver) return null;

    return (
        <div className="page-container" style={{ padding: '20px' }}>
            <header className="flex justify-between items-center mb-30" style={{ flexWrap: 'wrap', gap: '15px' }}>
                <div>
                    <h1 className="text-gradient" style={{ fontSize: '1.8rem' }}>Hola, {driver.name} 👋</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Panel de Chofer - EL CASAL</p>
                </div>
                <button className="glass-button" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClick={logout}>
                    Cerrar Sesión
                </button>
            </header>

            {gpsError && (
                <div className="glass-panel" style={{ padding: '20px', marginBottom: '30px', border: '1px solid #ef4444', background: 'rgba(239, 68, 68, 0.1)' }}>
                    <h3 style={{ color: '#ef4444', marginBottom: '10px' }}>🌐 El GPS está bloqueado</h3>
                    <p style={{ fontSize: '0.85rem', marginBottom: '15px' }}>Como instalaste la aplicación, los permisos se manejan desde el navegador:</p>
                    <div style={{ textAlign: 'left', fontSize: '0.8rem', background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px' }}>
                        <p><strong>En Android (Chrome):</strong><br />1. Toca los 3 puntos (⋮) arriba a la derecha.<br />2. Toca el icono de ℹ️ o el Candado.<br />3. Ve a <strong>Permisos</strong> y activa la <strong>Ubicación</strong>.</p>
                        <p style={{ marginTop: '10px' }}><strong>En iPhone (Safari):</strong><br />1. Toca las letras <strong>AA</strong> en la barra de direcciones.<br />2. Toca <strong>Configuración del sitio web</strong>.<br />3. Cambia Ubicación a <strong>Permitir</strong>.</p>
                    </div>
                </div>
            )}

            <div className="glass-panel" style={{ padding: '20px', marginBottom: '30px', borderLeft: '4px solid var(--accent-color)' }}>
                <h2 style={{ fontSize: '1.2rem', marginBottom: '5px' }}>Tus Viajes Asignados</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Selecciona un viaje para iniciar o gestionar el GPS.</p>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>Buscando tus asignaciones...</div>
            ) : orders.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '50px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📅</div>
                    <h3>No tienes viajes asignados</h3>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '10px' }}>Cuando el administrador te asigne una hoja de ruta, aparecerá aquí automáticamente.</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '15px' }}>
                    {orders.map(order => (
                        <div key={order.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', border: order.status === 'STARTED' ? '1px solid var(--accent-color)' : '1px solid var(--glass-border)' }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="glass-label">ID VIAJE</div>
                                    <div style={{ fontWeight: 'bold', fontFamily: 'monospace', fontSize: '1.1rem' }}>{order.id}</div>
                                </div>
                                <div className={`badge ${order.status === 'PENDING' ? 'badge-pending' : (order.status === 'CONFIRMED' || order.status === 'STARTED') ? 'badge-active' : 'badge-completed'}`}>
                                    {order.status === 'PENDING' ? 'Sin Confirmar' : order.status === 'CONFIRMED' ? 'Programado' : order.status === 'STARTED' ? 'En Curso' : 'Completado'}
                                </div>
                            </div>

                            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '12px' }}>
                                <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>👤 <strong>{order.customerName}</strong></div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>📍 De: {order.origin || 'Base'}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>🎯 A: {order.destination}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--accent-color)', marginTop: '5px' }}>📅 {order.travelDate ? `${order.travelDate} - ${order.travelTime}` : 'Hoy'}</div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <Link href={`/driver/${order.id}`} style={{ flex: 2 }}>
                                    <button
                                        className="glass-button"
                                        style={{
                                            width: '100%',
                                            background: order.status === 'STARTED' ? 'var(--accent-gradient)' : 'var(--text-primary)',
                                            color: order.status === 'STARTED' ? 'white' : 'var(--bg-color)'
                                        }}
                                    >
                                        {order.status === 'STARTED' ? '📡 PANEL DE VIAJE' : '🚀 GESTIONAR VIAJE'}
                                    </button>
                                </Link>
                                {order.status === 'STARTED' && (
                                    <button
                                        className="glass-button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if ("geolocation" in navigator) {
                                                navigator.geolocation.getCurrentPosition(async (pos) => {
                                                    await fetch('/api/orders', {
                                                        method: 'PATCH',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({ id: order.id, lat: pos.coords.latitude, lng: pos.coords.longitude }),
                                                    });
                                                    alert("✅ Ubicación enviada para el viaje " + order.id);
                                                });
                                            }
                                        }}
                                        style={{ flex: 1, background: 'var(--glass-bg-secondary)', fontSize: '0.7rem', border: '1px solid var(--accent-color)', color: 'var(--text-primary)' }}
                                    >
                                        📍 FORZAR GPS
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
