"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface AdminHeaderProps {
    title: string;
}

export default function AdminHeader({ title }: AdminHeaderProps) {
    const [menuOpen, setMenuOpen] = useState(false);
    const router = useRouter();

    const handleLogout = () => {
        sessionStorage.removeItem('admin_password');
        window.location.href = '/';
    };

    const handleBackup = async () => {
        try {
            const res = await fetch('/api/admin/backup');
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `el-casal-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error(e);
            alert('Error al generar backup');
        }
    };

    const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const pass = prompt('Por favor, ingresá la Contraseña Maestra para restaurar la base de datos. ¡ESTO BORRARÁ LOS DATOS ACTUALES!');
        if (!pass) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                const res = await fetch('/api/admin/restore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ data, masterPassword: pass })
                });
                const result = await res.json();
                if (res.ok) {
                    alert('Base de datos restaurada con éxito');
                    window.location.reload();
                } else {
                    alert('Error: ' + result.error);
                }
            } catch (err) {
                console.error(err);
                alert('Archivo de backup inválido');
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="flex justify-between items-center mb-20">
            <h1 className="text-gradient" style={{ fontSize: '1.4rem', margin: 0 }}>{title}</h1>

            <div style={{ position: 'relative' }}>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="glass-button"
                    style={{
                        padding: '10px 12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                        background: menuOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                        border: '1px solid var(--glass-border)',
                        boxShadow: 'none',
                        minWidth: 'auto'
                    }}
                >
                    <div style={{ width: '18px', height: '2px', background: 'white' }}></div>
                    <div style={{ width: '18px', height: '2px', background: 'white' }}></div>
                    <div style={{ width: '18px', height: '2px', background: 'white' }}></div>
                </button>

                {menuOpen && (
                    <>
                        {/* Overlay to close menu when clicking outside */}
                        <div
                            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                            onClick={() => setMenuOpen(false)}
                        />
                        <div style={{
                            position: 'absolute',
                            top: 'calc(100% + 10px)',
                            right: '0',
                            background: '#0a0a14',
                            backdropFilter: 'blur(25px)',
                            borderRadius: '16px',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                            zIndex: 1000,
                            width: '240px',
                            maxWidth: '85vw',
                            boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
                            animation: 'fadeIn 0.2s ease-out'
                        }}>
                            {[
                                { label: '📊 Dashboard', href: '/admin' },
                                { label: '👥 Clientes', href: '/admin/customers' },
                                { label: '👷 Choferes', href: '/admin/drivers' },
                                { label: '🚘 Vehículos', href: '/admin/vehicles' },
                                { label: '📍 Direcciones', href: '/admin/locations' },
                                { label: '⚙️ Configuración', href: '/admin/config' },
                                { label: '📥 Backup', action: handleBackup },
                                { label: '🗑️ Papelera', href: '/admin/recycle-bin' }
                            ].map((item, idx) => (
                                item.href ? (
                                    <Link key={idx} href={item.href}>
                                        <button style={{
                                            padding: '12px 15px',
                                            fontSize: '0.9rem',
                                            width: '100%',
                                            textAlign: 'left',
                                            background: 'rgba(255,255,255,0.05)',
                                            color: 'white',
                                            border: 'none',
                                            borderRadius: '10px',
                                            cursor: 'pointer'
                                        }}>
                                            {item.label}
                                        </button>
                                    </Link>
                                ) : (
                                    <button key={idx} onClick={item.action} style={{
                                        padding: '12px 15px',
                                        fontSize: '0.9rem',
                                        width: '100%',
                                        textAlign: 'left',
                                        background: 'rgba(255,255,255,0.05)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '10px',
                                        cursor: 'pointer'
                                    }}>
                                        {item.label}
                                    </button>
                                )
                            ))}

                            <label style={{ cursor: 'pointer', display: 'block' }}>
                                <div style={{
                                    padding: '12px 15px', fontSize: '0.9rem', width: '100%', textAlign: 'left',
                                    background: 'rgba(255,255,255,0.05)', color: 'white',
                                    borderRadius: '10px'
                                }}>
                                    📤 Restaurar
                                </div>
                                <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleRestore} />
                            </label>

                            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '5px 0' }}></div>

                            <button onClick={handleLogout} style={{
                                padding: '12px 15px', fontSize: '0.9rem', width: '100%', textAlign: 'left',
                                background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                border: 'none',
                                borderRadius: '10px', cursor: 'pointer'
                            }}>
                                🚪 Salir
                            </button>
                        </div>
                    </>
                )}
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
