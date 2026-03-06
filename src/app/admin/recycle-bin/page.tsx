"use client";

import { useState, useEffect } from 'react';
import AdminHeader from '@/components/AdminHeader';

interface BinItem {
    id: string;
    original_id: string;
    table_name: string;
    data: any;
    deleted_at: string;
}

export default function RecycleBinPage() {
    const [items, setItems] = useState<BinItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [restoring, setRestoring] = useState<string | null>(null);

    useEffect(() => {
        const savedPass = sessionStorage.getItem('admin_password');
        if (savedPass) {
            setPassword(savedPass);
            setIsAuthenticated(true);
            fetchItems(savedPass);
        } else {
            setLoading(false);
        }
    }, []);

    const fetchItems = async (passOverride?: string) => {
        const currentPass = passOverride || password;
        if (!currentPass) return;
        setLoading(true);
        try {
            const res = await fetch('/api/admin/recycle-bin', {
                headers: { 'x-admin-password': currentPass }
            });
            if (res.ok) {
                const data = await res.json();
                setItems(data);
                setIsAuthenticated(true);
            } else if (res.status === 401) {
                setIsAuthenticated(false);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        fetchItems();
    };

    const handleRestore = async (id: string, tableName: string) => {
        if (!confirm(`¿Restaurar este elemento de la tabla ${tableName}?`)) return;
        setRestoring(id);
        try {
            const res = await fetch('/api/admin/recycle-bin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password
                },
                body: JSON.stringify({ action: 'restore', id })
            });
            if (res.ok) {
                fetchItems();
            } else {
                const err = await res.json();
                alert('Error: ' + err.error);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setRestoring(null);
        }
    };

    const handleDeletePermanently = async (id: string) => {
        if (!confirm('¿Eliminar permanentemente? Esta acción no se puede deshacer.')) return;
        try {
            const res = await fetch('/api/admin/recycle-bin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password
                },
                body: JSON.stringify({ action: 'delete_permanently', id })
            });
            if (res.ok) fetchItems();
        } catch (e) { console.error(e); }
    };

    const formatTableName = (name: string) => {
        const names: any = {
            'drivers': 'Chofer',
            'pricing_config': 'Vehículo/Precio',
            'customers': 'Cliente',
            'orders': 'Pedido'
        };
        return names[name] || name;
    };

    const getItemLabel = (item: BinItem) => {
        const d = item.data;
        if (item.table_name === 'drivers' || item.table_name === 'customers' || item.table_name === 'pricing_config') return d.name;
        if (item.table_name === 'orders') return `${d.customer_name} (${d.id})`;
        return item.original_id;
    };

    if (loading && !items.length) return <div className="page-container" style={{ textAlign: 'center', padding: '50px' }}>Cargando Papelera...</div>;

    if (!isAuthenticated) {
        return (
            <div className="page-container" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
                <div className="glass-panel" style={{ padding: '40px 20px' }}>
                    <h2>🔒 Acceso a Papelera</h2>
                    <form onSubmit={handleLogin} style={{ marginTop: '20px' }}>
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
        <div className="page-container">
            <AdminHeader title="Papelera de Reciclaje" />

            <div className="glass-panel" style={{ padding: '20px', marginBottom: '20px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <p style={{ fontSize: '0.85rem', color: '#ef4444', textAlign: 'center' }}>
                    ⚠️ Los elementos se eliminan automáticamente después de 48 horas.
                </p>
            </div>

            {items.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '100px 20px' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '20px', opacity: 0.2 }}>🗑️</div>
                    <p style={{ opacity: 0.5 }}>La papelera está vacía</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '15px' }}>
                    {items.map(item => (
                        <div key={item.id} className="glass-panel" style={{ padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{
                                        fontSize: '0.6rem',
                                        padding: '2px 8px',
                                        borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.1)',
                                        color: 'var(--accent-color)'
                                    }}>
                                        {formatTableName(item.table_name)}
                                    </span>
                                    <span style={{ fontWeight: 'bold' }}>{getItemLabel(item)}</span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '5px' }}>
                                    Eliminado el: {new Date(item.deleted_at).toLocaleString('es-AR')}
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button
                                    className="glass-button"
                                    onClick={() => handleRestore(item.id, item.table_name)}
                                    disabled={restoring === item.id}
                                    style={{ fontSize: '0.75rem', padding: '8px 15px', background: 'var(--accent-gradient)' }}
                                >
                                    {restoring === item.id ? 'Restaurando...' : '🔄 Restaurar'}
                                </button>
                                <button
                                    className="filter-btn"
                                    onClick={() => handleDeletePermanently(item.id)}
                                    style={{ color: '#ef4444' }}
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
