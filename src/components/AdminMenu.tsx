"use client";

import { useState } from 'react';
import Link from 'next/link';

interface AdminMenuProps {
    password?: string;
    onLogout?: () => void;
    onBackup?: () => void;
    onRestore?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function AdminMenu({ password, onLogout, onBackup, onRestore }: AdminMenuProps) {
    const [menuOpen, setMenuOpen] = useState(false);

    const defaultLogout = () => {
        sessionStorage.removeItem('admin_password');
        window.location.href = '/';
    };

    const handleBackup = async () => {
        if (onBackup) {
            onBackup();
            return;
        }
        try {
            const pass = password || sessionStorage.getItem('admin_password');
            const res = await fetch('/api/orders', {
                headers: { 'x-admin-password': pass || '' }
            });
            const data = await res.json();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_pedidos_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
        } catch (e) {
            console.error(e);
            alert("Error al generar backup");
        }
    };

    const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (onRestore) {
            onRestore(e);
            return;
        }
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                if (!Array.isArray(data)) throw new Error("Formato inválido");

                if (!confirm(`¿Restaurar ${data.length} pedidos? Esto no borrará los actuales pero puede duplicar si ya existen.`)) return;

                const pass = password || sessionStorage.getItem('admin_password');
                let successCount = 0;
                for (const order of data) {
                    const res = await fetch('/api/orders', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'x-admin-password': pass || ''
                        },
                        body: JSON.stringify(order)
                    });
                    if (res.ok) successCount++;
                }
                alert(`Restauración completada: ${successCount} pedidos.`);
                window.location.reload();
            } catch (err) {
                console.error(err);
                alert("Error al restaurar: " + (err instanceof Error ? err.message : "Desconocido"));
            }
        };
        reader.readAsText(file);
    };

    return (
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
                    minWidth: 'auto',
                    zIndex: 1001
                }}
            >
                <div style={{ width: '18px', height: '2px', background: 'white' }}></div>
                <div style={{ width: '18px', height: '2px', background: 'white' }}></div>
                <div style={{ width: '18px', height: '2px', background: 'white' }}></div>
            </button>

            {menuOpen && (
                <>
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
                            { label: '📦 Pedidos', href: '/admin' },
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

                        <button onClick={onLogout || defaultLogout} style={{
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
    );
}
