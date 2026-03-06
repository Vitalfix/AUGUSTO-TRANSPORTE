"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import InstallPrompt from '@/components/InstallPrompt';

export default function DriverLoginPage() {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [selectedDriver, setSelectedDriver] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        fetch('/api/drivers')
            .then(res => res.json())
            .then(data => setDrivers(data))
            .catch(err => console.error(err));
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const res = await fetch('/api/drivers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: selectedDriver, pin })
            });

            if (res.ok) {
                const driver = await res.json();
                localStorage.setItem('driver_session', JSON.stringify(driver));
                router.push('/chofer/dashboard');
            } else {
                setError('PIN incorrecto o chofer no encontrado');
            }
        } catch (err) {
            setError('Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-container flex justify-center items-center" style={{ minHeight: '80vh' }}>
            <div className="glass-panel" style={{ padding: '40px', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
                <div style={{ fontSize: '3rem', marginBottom: '20px' }}>🚛</div>
                <h1 className="text-gradient mb-20">Acceso Choferes</h1>

                <form onSubmit={handleLogin} className="flex-col gap-20">
                    <div>
                        <label className="glass-label">Tu Nombre</label>
                        <div className="toggle-group" style={{ maxHeight: '200px', overflowY: 'auto', padding: '5px' }}>
                            {drivers.map(d => (
                                <button
                                    key={d.id}
                                    type="button"
                                    className={`toggle-btn ${selectedDriver === d.name ? 'active' : ''}`}
                                    onClick={() => setSelectedDriver(d.name)}
                                    style={{ fontSize: '0.9rem', padding: '12px' }}
                                >
                                    {d.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedDriver && (
                        <>
                            <div>
                                <label className="glass-label">Ingresá tu PIN para {selectedDriver}</label>
                                <input
                                    type="password"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    pattern="[0-9]*"
                                    className="glass-input"
                                    placeholder="PIN de 4 dígitos"
                                    maxLength={4}
                                    value={pin}
                                    onChange={e => setPin(e.target.value)}
                                    style={{ textAlign: 'center', fontSize: '1.2rem' }}
                                    required
                                />
                            </div>

                            {error && <p style={{ color: '#ef4444', fontSize: '0.9rem', background: 'rgba(239, 68, 68, 0.1)', padding: '10px', borderRadius: '8px' }}>{error}</p>}

                            <button type="submit" className="glass-button w-full" disabled={loading}>
                                {loading ? 'Verificando...' : 'Ingresar'}
                            </button>
                        </>
                    )}

                    <Link href="/" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '20px', display: 'block', textAlign: 'center' }}>
                        ← Volver al inicio
                    </Link>
                </form>
            </div>
            <InstallPrompt />
        </div>
    );
}
