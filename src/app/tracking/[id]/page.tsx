"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Script from 'next/script';

export interface Order {
    id: string;
    vehicle: string;
    origin?: string;
    destination: string;
    price: number;
    status: 'PENDING' | 'STARTED' | 'FINISHED';
    customerName: string;
    lat?: number;
    lng?: number;
    driverName?: string;
    driverPhone?: string;
    licensePlate?: string;
    originLat?: number;
    originLng?: number;
    destLat?: number;
    destLng?: number;
    origin2Lat?: number;
    origin2Lng?: number;
    startedAt?: string;
    finishedAt?: string;
    activityLog?: { type: string, label: string, time: string }[];
}

const formatDestination = (d: string) => {
    if (d === 'san_justo') return 'San San Justo';
    if (d === 'capital') return 'Capital Federal';
    if (d === 'zona_norte') return 'Zona Norte';
    if (d === 'zona_sur') return 'Zona Sur';
    return d;
};

export default function TrackingPage() {
    const params = useParams();
    const id = params?.id as string;
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [tripDistance, setTripDistance] = useState<number | null>(null);

    // Map related refs
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const routeLayerRef = useRef<any>(null);

    const fetchOrder = async () => {
        try {
            const res = await fetch(`/api/orders/${id}`);
            if (!res.ok) {
                setError(true);
                setLoading(false);
                return;
            }
            const data = await res.json();
            setOrder(data);
            setError(false);
        } catch (e) {
            console.error(e);
            setError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!id) return;
        fetchOrder();
        const interval = setInterval(() => {
            fetchOrder();
        }, 15000); // 15 seconds for more fluid tracking
        return () => clearInterval(interval);
    }, [id]);

    const [leafletReady, setLeafletReady] = useState(false);

    // Initial Map Setup
    useEffect(() => {
        const checkL = () => {
            const L = (window as any).L;
            if (L && mapContainerRef.current && !mapRef.current) {
                mapRef.current = L.map(mapContainerRef.current).setView([-34.6037, -58.3816], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(mapRef.current);

                // Theme-based filter
                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                mapContainerRef.current.style.filter = isLight ? 'none' : 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)';
                setLeafletReady(true);

                // If we already have order data, trigger update
                if (order) updateMapMarkers(order);
            }
        };

        const timer = setInterval(checkL, 500);
        return () => clearInterval(timer);
    }, [loading]);

    // React to theme changes (MutationObserver)
    useEffect(() => {
        if (!mapContainerRef.current) return;

        const updateMapFilter = () => {
            if (!mapContainerRef.current) return;
            const isLight = document.documentElement.getAttribute('data-theme') === 'light';
            mapContainerRef.current.style.filter = isLight ? 'none' : 'invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%)';
        };

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.attributeName === 'data-theme') {
                    updateMapFilter();
                }
            });
        });

        observer.observe(document.documentElement, { attributes: true });
        updateMapFilter(); // Initial check

        return () => observer.disconnect();
    }, [leafletReady]);

    // Elapsed Time Logic
    const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

    useEffect(() => {
        if (!order?.startedAt || order.status === 'PENDING') return;

        const updateClock = () => {
            const start = new Date(order.startedAt!).getTime();
            const end = order.finishedAt ? new Date(order.finishedAt).getTime() : new Date().getTime();
            const diff = Math.max(0, end - start);

            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);

            setElapsedTime(
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        };

        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, [order?.startedAt, order?.finishedAt, order?.status]);

    const updateMapMarkers = async (currentOrder: Order) => {
        const L = (window as any).L;
        if (!L || !mapRef.current) return;

        // Origin Marker (🟢)
        if (currentOrder.originLat && currentOrder.originLng) {
            const startPos: [number, number] = [Number(currentOrder.originLat), Number(currentOrder.originLng)];
            L.marker(startPos, {
                icon: L.divIcon({ html: '🟢', className: '', iconSize: [20, 20], iconAnchor: [10, 10] })
            }).addTo(mapRef.current).bindPopup('Origen');
        }

        // Destination Marker (🏁)
        if (currentOrder.destLat && currentOrder.destLng) {
            const endPos: [number, number] = [Number(currentOrder.destLat), Number(currentOrder.destLng)];
            L.marker(endPos, {
                icon: L.divIcon({ html: '🏁', className: '', iconSize: [20, 20], iconAnchor: [10, 10] })
            }).addTo(mapRef.current).bindPopup('Destino');
        }

        // Driver/Truck Marker (🚚)
        if (currentOrder.lat && currentOrder.lng) {
            const pos: [number, number] = [Number(currentOrder.lat), Number(currentOrder.lng)];
            if (!markerRef.current) {
                const icon = L.divIcon({
                    html: `<div style="font-size: 30px; filter: none !important; text-shadow: 0 2px 5px rgba(0,0,0,0.5);">🚚</div>`,
                    className: 'custom-div-icon',
                    iconSize: [40, 40],
                    iconAnchor: [20, 20]
                });
                markerRef.current = L.marker(pos, { icon }).addTo(mapRef.current);
                mapRef.current.setView(pos, 15);
            } else {
                markerRef.current.setLatLng(pos);
            }
        }

        // Draw Route Tracing (Actual streets)
        if (currentOrder.originLat && currentOrder.destLat && !routeLayerRef.current) {
            try {
                const points = [
                    { lat: currentOrder.originLat, lng: currentOrder.originLng }
                ];

                // Add middle point if exists (Origin 2)
                if (currentOrder.origin2Lat && currentOrder.origin2Lng) {
                    points.push({ lat: currentOrder.origin2Lat, lng: currentOrder.origin2Lng });

                    // Add a marker for Origin 2
                    L.marker([currentOrder.origin2Lat, currentOrder.origin2Lng], {
                        icon: L.divIcon({ html: '📍', className: '', iconSize: [20, 20], iconAnchor: [10, 10] })
                    }).addTo(mapRef.current).bindPopup('Origen 2');
                }

                points.push({ lat: currentOrder.destLat, lng: currentOrder.destLng });

                const res = await fetch('/api/route', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ points })
                });

                if (res.ok) {
                    const routeData = await res.json();
                    if (routeData.geometry) {
                        // Drawing real road route (Bright vibrant blue and dashed)
                        const route = L.geoJSON(routeData.geometry, {
                            style: {
                                color: '#00e5ff', // Bright Cyan/Blue
                                weight: 6,
                                opacity: 0.9,
                                dashArray: '10, 15',
                                lineCap: 'round'
                            }
                        }).addTo(mapRef.current);
                        routeLayerRef.current = route;
                        if (routeData.distance) setTripDistance(routeData.distance);

                        // Fit bounds to show the whole route
                        const bounds = route.getBounds();
                        if (currentOrder.lat) bounds.extend([currentOrder.lat, currentOrder.lng]);
                        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
                    }
                }
            } catch (e) {
                console.error("Error drawing route:", e);
            }
        }
    };

    // Update Markers when order changes
    useEffect(() => {
        if (order && leafletReady) {
            updateMapMarkers(order);
        }
    }, [order?.lat, order?.lng, order?.originLat, order?.origin2Lat, order?.destLat, leafletReady]);

    if (loading) {
        return <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>Cargando información del viaje...</div>;
    }

    if (error || !order) {
        return (
            <div className="page-container" style={{ textAlign: 'center', paddingTop: '100px' }}>
                <div className="glass-panel" style={{ padding: '40px', maxWidth: '500px', margin: '0 auto' }}>
                    <h2 style={{ color: '#ef4444', marginBottom: '15px' }}>❌ Viaje No Encontrado</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>El código de seguimiento ingresado no es válido o ha expirado.</p>
                    <Link href="/">
                        <button className="glass-button">Volver al Inicio</button>
                    </Link>
                </div>
            </div>
        );
    }

    let progressWidth = '0%';
    if (order.status === 'PENDING') progressWidth = '10%';
    if (order.status === 'STARTED') progressWidth = '50%';
    if (order.status === 'FINISHED') progressWidth = '100%';

    return (
        <div className="page-container" style={{ maxWidth: '800px', padding: '20px', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: '20px', margin: '0 auto' }}>

            {/* Header / Nav */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 className="text-gradient" style={{ fontSize: '1.5rem' }}>EL CASAL</h2>
                <Link href="/" style={{ textDecoration: 'none', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>← Volver</Link>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Status Panel */}
                <div className="glass-panel" style={{ padding: '30px 20px', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: 'rgba(255,255,255,0.05)' }}>
                        <div style={{ height: '100%', width: progressWidth, background: 'var(--accent-gradient)', transition: 'width 1s ease' }}></div>
                    </div>

                    <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '2px', marginBottom: '5px' }}>ESTADO DEL ENVÍO</div>
                        <h3 style={{ fontSize: '1.6rem' }} className="text-gradient">
                            {order.status === 'PENDING' ? 'Recibido' : order.status === 'STARTED' ? 'En Tránsito 🚚' : 'Finalizado ✅'}
                        </h3>
                        {order.status !== 'PENDING' && (
                            <div style={{ marginTop: '10px', fontSize: '1.2rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                                ⏱️ {elapsedTime}
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px', margin: '0 auto' }}>
                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                            <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: 'var(--accent-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>📋</div>
                            <div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>Orden Recibida</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Estamos preparando el despacho.</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', opacity: order.status !== 'PENDING' ? 1 : 0.3 }}>
                            <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: order.status !== 'PENDING' ? 'var(--accent-color)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🚚</div>
                            <div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>En Ruta</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>El vehículo está viajando a {formatDestination(order.destination)}.</div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', opacity: order.status === 'FINISHED' ? 1 : 0.3 }}>
                            <div style={{ width: '35px', height: '35px', borderRadius: '50%', background: order.status === 'FINISHED' ? 'var(--success-color)' : 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>🏁</div>
                            <div>
                                <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>Entregado</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Viaje completado exitosamente.</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Map Panel */}
                <div className="glass-panel" style={{ padding: '0', overflow: 'hidden', height: '450px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '15px 20px', background: 'rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>MAPA EN VIVO</span>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => window.location.reload()}
                                style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontSize: '0.7rem' }}
                            >
                                🔄 Recargar
                            </button>
                            {order.lat !== undefined && order.lat !== null ? (
                                <span style={{ color: 'var(--success-color)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 'bold' }}>
                                    <span style={{ width: '8px', height: '8px', background: 'var(--success-color)', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span> VIVO
                                </span>
                            ) : (
                                <span style={{ color: '#f59e0b', fontSize: '0.75rem', fontWeight: 'bold' }}>SIN SEÑAL GPS</span>
                            )}
                        </div>
                        {tripDistance !== null && (
                            <div style={{ position: 'absolute', top: '55px', right: '15px', background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', border: '1px solid var(--glass-border)', padding: '8px 15px', borderRadius: '15px', zIndex: 1000, boxShadow: '0 4px 15px rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontSize: '1rem' }}>📏</span>
                                <span style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>{tripDistance.toFixed(1)} km</span>
                            </div>
                        )}
                    </div>
                    <div style={{ flexGrow: 1, width: '100%', height: '100%', position: 'relative' }}>
                        <div
                            ref={mapContainerRef}
                            style={{ width: '100%', height: '100%', background: '#111', visibility: (leafletReady) ? 'visible' : 'hidden' }}
                        />
                        {(!leafletReady) && (
                            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', padding: '40px', textAlign: 'center', zIndex: 5 }}>
                                <div style={{ fontSize: '3rem', marginBottom: '15px', animation: 'pulse 2s infinite' }}>🛰️</div>
                                <h4 style={{ color: 'white', marginBottom: '10px' }}>Cargando Mapa...</h4>
                                <p style={{ fontSize: '0.9rem', maxWidth: '300px' }}>El mapa se activará automáticamente cuando el chofer inicie el viaje desde su panel.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Tracking Console & History */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>

                    {/* Console */}
                    <div style={{ padding: '15px', background: 'var(--glass-bg)', borderRadius: '12px', fontSize: '0.75rem', fontFamily: 'monospace', border: '1px solid var(--glass-border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success-color)' }}>
                            <span style={{ width: '8px', height: '8px', background: 'var(--success-color)', borderRadius: '50%', animation: 'pulse 1.5s infinite' }}></span>
                            <strong>GPS TRANSMITIENDO EN VIVO</strong>
                        </div>
                        <div style={{ color: 'var(--text-secondary)' }}>
                            <div style={{ marginBottom: '5px', paddingBottom: '5px', borderBottom: '1px solid var(--glass-border)' }}>ÚLTIMA ACTIVIDAD:</div>
                            {order.lat ? (
                                <div style={{ color: 'var(--text-primary)' }}>
                                    📍 Posición: {order.lat.toFixed(4)}, {order.lng?.toFixed(4)}
                                    <br />
                                    📡 Actualizado: {new Date().toLocaleTimeString()}
                                    <br />
                                    ⏱️ Duración: {elapsedTime}
                                </div>
                            ) : (
                                <div style={{ color: '#f59e0b' }}>Esperando señal del vehículo...</div>
                            )}
                        </div>
                    </div>

                    {/* History Log */}
                    <div className="glass-panel" style={{ padding: '15px', fontSize: '0.8rem' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '0.7rem', color: 'var(--text-secondary)' }}>HISTORIAL DE ACTIVIDAD</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {order.activityLog && order.activityLog.length > 0 ? (
                                order.activityLog.map((log, i) => (
                                    <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                                        <div style={{ minWidth: '60px', color: 'var(--text-secondary)', fontSize: '0.7rem' }}>
                                            {new Date(log.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </div>
                                        <div style={{ width: '2px', height: '20px', background: 'var(--glass-border)', marginTop: '4px' }}></div>
                                        <div>
                                            <div style={{ fontWeight: i === order.activityLog!.length - 1 ? 'bold' : 'normal' }}>{log.label}</div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div style={{ color: 'var(--text-secondary)' }}>No hay actividad registrada aún.</div>
                            )}
                        </div>
                    </div>
                </div>

            </div>

            {/* Driver & Order Info Card */}
            <div className="glass-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                    <div style={{ padding: '20px', borderRight: '1px solid var(--glass-border)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '10px' }}>PERSONAL ASIGNADO</div>
                        {order.driverName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ fontSize: '2rem' }}>👨🏻‍✈️</div>
                                <div>
                                    <div style={{ fontWeight: 'bold' }}>{order.driverName}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Patente: {order.licensePlate}</div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Esperando asignación...</div>
                        )}
                    </div>
                    <div style={{ padding: '20px', borderRight: '1px solid var(--glass-border)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '10px' }}>DETALLES DEL VIAJE</div>
                        <div style={{ fontSize: '0.9rem' }}>
                            <div style={{ marginBottom: '5px' }}>📍 <span style={{ color: 'var(--text-secondary)' }}>Desde:</span> {order.origin || 'Base'}</div>
                            <div>🎯 <span style={{ color: 'var(--text-secondary)' }}>Hasta:</span> {formatDestination(order.destination)}</div>
                        </div>
                    </div>
                    <div style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', letterSpacing: '1px', marginBottom: '10px' }}>VEHÍCULO Y CÓDIGO</div>
                        <div style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{order.vehicle}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--accent-color)', fontFamily: 'monospace', marginTop: '5px' }}>#{order.id}</div>
                    </div>
                </div>
            </div>

            {order.driverPhone && order.status === 'STARTED' && (
                <a href={`tel:${order.driverPhone}`} style={{ textDecoration: 'none' }}>
                    <button className="glass-button" style={{ width: '100%', background: 'var(--success-color)', padding: '15px', color: 'white' }}>
                        📞 LLAMAR AL CHOFER
                    </button>
                </a>
            )}

            <style jsx global>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                    100% { opacity: 1; transform: scale(1); }
                }
                .leaflet-container {
                    background: #1a1a1a !important;
                }
                .leaflet-control-attribution {
                    display: none !important;
                }
            `}</style>

            {/* Load Leaflet CSS and JS via next/script */}
            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
            <Script
                src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
                strategy="afterInteractive"
                onLoad={() => {
                    fetchOrder();
                }}
            />
        </div>
    );
}
