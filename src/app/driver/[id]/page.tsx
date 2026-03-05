"use client";

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface Order {
    id: string;
    customerName: string;
    origin?: string;
    destination: string;
    status: string;
    waitingMinutes: number;
}

export default function DriverPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const id = params.id;

    const [order, setOrder] = useState<Order | null>(null);
    const [status, setStatus] = useState<'idle' | 'tracking' | 'error'>('idle');
    const [tripStage, setTripStage] = useState<'START' | 'TO_ORIGIN' | 'WAITING' | 'TO_DEST' | 'ARRIVED_DEST' | 'FINISHED'>('START');

    // Timer for waiting
    const [waitMinutes, setWaitMinutes] = useState(0);
    const [timerActive, setTimerActive] = useState(false);
    const [gpsLogs, setGpsLogs] = useState<string[]>([]);
    const [lastUpdate, setLastUpdate] = useState<string | null>(null);
    const [gpsError, setGpsError] = useState<string | null>(null);

    const addLog = (msg: string) => {
        setGpsLogs(prev => [new Date().toLocaleTimeString() + ": " + msg, ...prev].slice(0, 5));
    };

    // Check permissions on mount
    useEffect(() => {
        if (typeof window !== 'undefined' && "permissions" in navigator) {
            navigator.permissions.query({ name: 'geolocation' as any }).then(res => {
                if (res.state === 'denied') {
                    setGpsError("🚫 GPS Bloqueado: Tocá el candado 🔒 arriba al lado del link de la web y activá 'Ubicación' para que funcione.");
                }
                res.onchange = () => {
                    if (res.state === 'granted') setGpsError(null);
                };
            });
        }
    }, []);

    // Fetch order on load
    useEffect(() => {
        const fetchOrder = async () => {
            try {
                const res = await fetch(`/api/orders/${id}`);
                const data = await res.json();
                setOrder(data);
                setOrder(data);
                // Sync stage based on DB status
                if (data.status === 'FINISHED') {
                    setTripStage('FINISHED');
                    setStatus('idle');
                } else if (data.status === 'ARRIVED_ORIGIN') {
                    setTripStage('WAITING');
                    setStatus('tracking');
                } else if (data.status === 'ARRIVED_DESTINATION') {
                    setTripStage('ARRIVED_DEST');
                    setStatus('tracking');
                } else if (data.status === 'STARTED') {
                    setTripStage('TO_ORIGIN');
                    setStatus('tracking');
                    addLog("Recuperando viaje en curso...");
                } else {
                    setTripStage('START');
                    setStatus('idle');
                }
                setWaitMinutes(data.waiting_minutes || 0);
            } catch (e) {
                console.error(e);
            }
        };
        fetchOrder();
    }, [id]);

    // Timer logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timerActive) {
            interval = setInterval(() => {
                setWaitMinutes(m => m + 1);
            }, 60000); // every minute
        }
        return () => clearInterval(interval);
    }, [timerActive]);

    // Update wait minutes in DB periodically or on stop
    const updateWaitInDB = async (mins: number) => {
        try {
            await fetch('/api/orders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, waitingMinutes: mins }),
            });
        } catch (e) { console.error(e); }
    };

    // GPS Tracking logic
    useEffect(() => {
        let watchId: number;
        let fallbackInterval: NodeJS.Timeout;
        let wakeLock: any = null;

        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLock = await (navigator as any).wakeLock.request('screen');
                }
            } catch (err) {
                console.warn("Wake Lock failed:", err);
            }
        };

        if (status === 'tracking') {
            requestWakeLock();

            const handleBeforeUnload = (e: BeforeUnloadEvent) => {
                e.preventDefault();
                e.returnValue = '';
            };
            window.addEventListener('beforeunload', handleBeforeUnload);

            let lastSendTime = 0;
            const sendUpdate = async (latitude: number, longitude: number) => {
                const now = Date.now();
                if (now - lastSendTime < 28000) return; // Allow 2s margin

                try {
                    lastSendTime = now;
                    const res = await fetch('/api/orders', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, lat: latitude, lng: longitude }),
                    });
                    if (res.ok) {
                        setLastUpdate(new Date().toLocaleTimeString());
                        setGpsError(null);
                        addLog("✓ Posición enviada");
                    } else {
                        addLog("✗ Error servidor");
                    }
                } catch (e) {
                    addLog("✗ Error de red");
                    console.error("Fetch error:", e);
                }
            };

            const startWatching = () => {
                if ("geolocation" in navigator) {
                    addLog("Iniciando seguimiento...");
                    // 1. Continuous Watch
                    watchId = navigator.geolocation.watchPosition(
                        (position) => {
                            sendUpdate(position.coords.latitude, position.coords.longitude);
                        },
                        (err) => {
                            addLog("! Watch error: " + err.code);
                            if (err.code === 1) setGpsError("❌ GPS Bloqueado");
                        },
                        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
                    );

                    // 2. Periodic Fallback
                    fallbackInterval = setInterval(() => {
                        navigator.geolocation.getCurrentPosition(
                            (pos) => sendUpdate(pos.coords.latitude, pos.coords.longitude),
                            (err) => {
                                addLog("! Fallback error: " + err.code);
                                // Retry with low accuracy if high fails
                                if (err.code === 3) {
                                    navigator.geolocation.getCurrentPosition(
                                        (pos) => sendUpdate(pos.coords.latitude, pos.coords.longitude),
                                        null,
                                        { enableHighAccuracy: false, timeout: 10000 }
                                    );
                                }
                            },
                            { enableHighAccuracy: true, timeout: 15000 }
                        );
                    }, 30000);
                } else {
                    setGpsError("⚠️ Tu navegador no soporta geolocalización.");
                    setStatus('error');
                }
            };
            startWatching();

            return () => {
                window.removeEventListener('beforeunload', handleBeforeUnload);
                if (watchId) navigator.geolocation.clearWatch(watchId);
                if (fallbackInterval) clearInterval(fallbackInterval);
                if (wakeLock) wakeLock.release().then(() => wakeLock = null);
            };
        }
    }, [status, id]);

    const forceGpsUpdate = () => {
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    await fetch('/api/orders', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ id, lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    });
                    setLastUpdate(new Date().toLocaleTimeString() + " (Manual)");
                    alert("✅ Ubicación enviada manualmente.");
                },
                (err) => alert(`❌ Error: ${err.message}`)
            );
        }
    };

    const handleStartTrip = async () => {
        setGpsError(null);
        if (!("geolocation" in navigator)) {
            setGpsError("❌ Tu dispositivo no soporta GPS.");
            return;
        }

        const startFlow = async (lat?: number, lng?: number) => {
            setStatus('tracking');
            setTripStage('TO_ORIGIN');
            await fetch('/api/orders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: 'STARTED', lat, lng }),
            });
        };

        // Try getting position with timeout and fallback
        navigator.geolocation.getCurrentPosition(
            (pos) => startFlow(pos.coords.latitude, pos.coords.longitude),
            (err) => {
                console.warn("GPS High Accuracy failed, trying fallback...", err);
                if (err.code === 1) {
                    setGpsError("❌ Permiso denegado. Tocá el candado 🔒 arriba y activá la Ubicación.");
                } else {
                    // Try without high accuracy
                    navigator.geolocation.getCurrentPosition(
                        (pos) => startFlow(pos.coords.latitude, pos.coords.longitude),
                        (err2) => {
                            setGpsError(`❌ Error de GPS: ${err2.message}. Por favor refresca la página e intenta de nuevo.`);
                        },
                        { enableHighAccuracy: false, timeout: 10000 }
                    );
                }
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    };

    const handleArrivedAtOrigin = async () => {
        setTripStage('WAITING');
        setTimerActive(true);
        try {
            await fetch('/api/orders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: 'ARRIVED_ORIGIN' }),
            });
        } catch (e) { console.error(e); }
    };

    const handleFinishWaiting = async () => {
        setTimerActive(false);
        setTripStage('TO_DEST');
        await updateWaitInDB(waitMinutes);
    };

    const handleArrivedAtDest = async () => {
        setTripStage('ARRIVED_DEST');
        try {
            await fetch('/api/orders', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status: 'ARRIVED_DESTINATION' }),
            });
        } catch (e) { console.error(e); }
    };

    const handleFinishTrip = async () => {
        setTripStage('FINISHED');
        setStatus('idle');
        await fetch('/api/orders', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status: 'FINISHED' }),
        });
    };

    if (!order) return <div className="page-container" style={{ textAlign: 'center', padding: '50px' }}>Cargando datos del viaje...</div>;

    return (
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '90vh', padding: '20px' }}>
            <div className="glass-panel" style={{ padding: '30px', textAlign: 'center', maxWidth: '500px', width: '100%' }}>
                <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🚛</div>
                <h1 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '5px' }}>EL CASAL</h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Hoja de Ruta Digital: <strong>{id}</strong></p>

                <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '15px', border: '1px solid var(--glass-border)', marginBottom: '30px' }}>
                    <div className="glass-label">CLIENTE</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '15px' }}>{order.customerName}</div>

                    <div className="glass-label">PUNTO DE CARGA</div>
                    <div style={{ fontSize: '0.9rem', marginBottom: '15px', color: 'var(--accent-color)' }}>{order.origin || 'No especificado'}</div>

                    <div className="glass-label">DESTINO</div>
                    <div style={{ fontSize: '0.9rem', color: 'var(--success-color)' }}>{order.destination}</div>
                </div>

                {/* STAGE ACTIONS */}
                {tripStage === 'START' && (
                    <button className="glass-button" style={{ width: '100%', padding: '18px', background: 'var(--accent-gradient)' }} onClick={handleStartTrip}>
                        🚀 INICIAR VIAJE Y GPS
                    </button>
                )}

                {tripStage === 'TO_ORIGIN' && (
                    <button className="glass-button" style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }} onClick={handleArrivedAtOrigin}>
                        🏁 LLEGUÉ AL ORIGEN
                    </button>
                )}

                {tripStage === 'WAITING' && (
                    <div style={{ padding: '20px', border: '2px solid #f59e0b', borderRadius: '15px', background: 'rgba(245, 158, 11, 0.1)' }}>
                        <div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '0.8rem', marginBottom: '10px' }}>TIEMPO DE ESPERA EN CLIENTE</div>
                        <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{waitMinutes} <small style={{ fontSize: '1rem' }}>min</small></div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '20px' }}>El tiempo se sumará automáticamente a la factura.</p>
                        <button className="glass-button" style={{ width: '100%', background: 'var(--accent-color)', color: 'white' }} onClick={handleFinishWaiting}>
                            CONTINUAR VIAJE (Cargado)
                        </button>
                    </div>
                )}

                {tripStage === 'TO_DEST' && (
                    <button className="glass-button" style={{ width: '100%', padding: '18px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }} onClick={handleArrivedAtDest}>
                        🏁 LLEGUÉ AL DESTINO
                    </button>
                )}

                {tripStage === 'ARRIVED_DEST' && (
                    <button className="glass-button" style={{ width: '100%', padding: '18px', background: 'var(--success-color)' }} onClick={handleFinishTrip}>
                        📦 ENTREGUÉ EL PEDIDO (Finalizar)
                    </button>
                )}

                {tripStage === 'FINISHED' && (
                    <div style={{ padding: '20px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '12px', border: '1px solid var(--success-color)' }}>
                        <div style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>✅ VIAJE FINALIZADO</div>
                        <div style={{ fontSize: '0.9rem', marginTop: '10px', color: 'var(--text-secondary)' }}>Total espera: {waitMinutes} min.</div>
                        <Link href="/admin">
                            <button className="glass-button" style={{ marginTop: '20px', width: '100%' }}>Volver al Panel</button>
                        </Link>
                    </div>
                )}

                {gpsError && (
                    <div className="glass-panel" style={{ marginTop: '20px', padding: '20px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--error-color)', color: 'var(--error-color)', fontSize: '0.9rem', textAlign: 'left' }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '10px', fontSize: '1rem' }}>🌐 Problema de Conexión GPS</div>
                        <p style={{ marginBottom: '15px', color: 'var(--text-primary)' }}>Los permisos se manejan desde el navegador (Chrome o Safari) dentro de tu celular:</p>
                        <div style={{ fontSize: '0.8rem', background: 'var(--glass-bg-secondary)', padding: '15px', borderRadius: '10px' }}>
                            <p><strong>En Android (Chrome):</strong><br />1. Toca los 3 puntos (⋮) o el Candado 🔒 arriba.<br />2. Toca <strong>Permisos</strong>.<br />3. Activa <strong>Ubicación</strong>.</p>
                            <p style={{ marginTop: '10px' }}><strong>En iPhone (Safari):</strong><br />1. Toca <strong>AA</strong> en la barra de direcciones.<br />2. Toca <strong>Configuración del sitio web</strong>.<br />3. Asegura que Ubicación diga <strong>Permitir</strong>.</p>
                        </div>
                    </div>
                )}

                {(tripStage === 'TO_ORIGIN' || tripStage === 'WAITING' || tripStage === 'TO_DEST') && (
                    <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px' }}>
                            <span style={{ width: '8px', height: '8px', background: 'var(--success-color)', borderRadius: '50%', display: 'inline-block', animation: 'pulse 1.5s infinite' }}></span>
                            GPS Transmitiendo - {lastUpdate || 'Conectando...'}
                        </div>

                        {/* Monitor de Actividad */}
                        <div style={{ background: 'var(--glass-bg-secondary)', padding: '10px', borderRadius: '8px', fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'left', fontFamily: 'monospace', border: '1px solid var(--glass-border)' }}>
                            <div style={{ borderBottom: '1px solid var(--glass-border)', marginBottom: '5px', paddingBottom: '3px', color: 'var(--accent-color)' }}>CONSOLA DE ACTIVIDAD:</div>
                            {gpsLogs.map((log, i) => (
                                <div key={i} style={{ opacity: 1 - (i * 0.15), color: log.includes('!') ? 'var(--error-color)' : 'var(--text-primary)' }}>{log}</div>
                            ))}
                            {gpsLogs.length === 0 && <div>Esperando señal...</div>}
                        </div>

                        <button
                            onClick={forceGpsUpdate}
                            style={{
                                background: 'var(--glass-bg-secondary)',
                                border: '1px solid var(--accent-color)',
                                color: 'var(--text-primary)',
                                padding: '15px',
                                borderRadius: '12px',
                                fontSize: '0.9rem',
                                cursor: 'pointer',
                                fontWeight: 'bold'
                            }}
                        >
                            📍 FORZAR ACTUALIZACIÓN GPS
                        </button>
                    </div>
                )}

                <Link href="/" style={{ display: 'block', marginTop: '30px', color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.8rem' }}>
                    ← Salir del Modo Chofer
                </Link>
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.5; transform: scale(1.2); }
                    100% { opacity: 1; transform: scale(1); }
                }
            `}</style>
        </div>
    );
}
