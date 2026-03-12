"use client";

import { useState, useEffect } from 'react';
import AdminHeader from '@/components/AdminHeader';

export default function GeneralSettingsPage() {
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    // Notification Emails Settings
    const [notificationEmails, setNotificationEmails] = useState('');
    const [savingEmails, setSavingEmails] = useState(false);

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
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            const data = await res.json();
            setNotificationEmails(data.emails || '');
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

    const handleSaveEmails = async () => {
        setSavingEmails(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password
                },
                body: JSON.stringify({ action: 'update_emails', value: notificationEmails })
            });
            if (res.ok) {
                alert('Correos actualizados');
            } else {
                alert('Error al guardar');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        } finally {
            setSavingEmails(false);
        }
    };

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 4) {
            alert('La contraseña debe tener al menos 4 caracteres');
            return;
        }
        setChangingPassword(true);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password
                },
                body: JSON.stringify({ action: 'update_password', value: newPassword })
            });
            if (res.ok) {
                alert('Contraseña maestra actualizada');
                setPassword(newPassword);
                sessionStorage.setItem('admin_password', newPassword);
                setNewPassword('');
            } else {
                alert('Error al actualizar contraseña');
            }
        } catch (e) {
            console.error(e);
            alert('Error de conexión');
        } finally {
            setChangingPassword(false);
        }
    };

    if (loading) return <div className="page-container" style={{ textAlign: 'center', padding: '50px' }}>Cargando Configuración...</div>;

    if (!isAuthenticated) {
        return (
            <div className="page-container" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
                <div className="glass-panel" style={{ padding: '40px 20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🔒</div>
                    <h2 style={{ marginBottom: '20px' }} className="text-gradient">Acceso Restringido</h2>
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
            <AdminHeader title="Configuración del Sistema" showBack backHref="/admin" />

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>

                {/* Emails de Alerta */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <h2 style={{ marginBottom: '15px', color: 'var(--accent-color)' }}>📧 Alertas por Email</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                        Correos adicionales que recibirán notificaciones (separados por coma).
                    </p>
                    <textarea
                        className="glass-input"
                        style={{ minHeight: '100px', marginBottom: '15px' }}
                        placeholder="ejemplo@gmail.com, otro@empresa.com"
                        value={notificationEmails}
                        onChange={(e) => setNotificationEmails(e.target.value)}
                    />
                    <button
                        className="glass-button"
                        style={{ width: '100%', background: 'var(--accent-gradient)' }}
                        onClick={handleSaveEmails}
                        disabled={savingEmails}
                    >
                        {savingEmails ? 'Guardando...' : '💾 GUARDAR EMAILS'}
                    </button>
                </div>

                {/* Seguridad */}
                <div className="glass-panel" style={{ padding: '20px' }}>
                    <h2 style={{ marginBottom: '15px', color: 'var(--accent-color)' }}>🔐 Seguridad</h2>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                        Cambia la contraseña maestra para el acceso de administración.
                    </p>
                    <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <input
                            type="text"
                            className="glass-input"
                            placeholder="Nueva Contraseña"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                        />
                        <button
                            type="submit"
                            className="glass-button"
                            style={{ width: '100%' }}
                            disabled={changingPassword}
                        >
                            {changingPassword ? 'Cambiando...' : '🔑 ACTUALIZAR PIN'}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
}
