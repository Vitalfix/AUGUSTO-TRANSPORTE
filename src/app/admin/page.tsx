"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

export interface Order {
    id: string;
    vehicle: string;
    origin?: string;
    destination: string;
    price: number;
    status: 'PENDING' | 'APPROVED' | 'CONFIRMED' | 'STARTED' | 'FINISHED' | 'INVOICED' | 'PAID';
    customerName: string;
    observations?: string;
    createdAt: string;
    customerEmail?: string;
    driverName?: string;
    driverPhone?: string;
    licensePlate?: string;
    customerPhone?: string;
    driverId?: string;
    cuit?: string;
    travelDate?: string;
    travelTime?: string;
    distanceKm?: number;
    travelHours?: number;
    activityLog?: any[];
}

const formatVehicle = (v: string) => {
    const vehicles: Record<string, string> = {
        'util_chico': 'Utilitario chico',
        'cam_mediana': 'Camioneta Mediana',
        'cam_grande': 'Camioneta Grande',
        'camion_chico': 'Camion Chico',
        'camion_grande': 'Camion Grande',
        'balancin': 'Balancin',
        'semi': 'Semi'
    };
    return vehicles[v] || v;
};


export default function AdminPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [copiedLink, setCopiedLink] = useState<string | null>(null);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<Order['status'] | 'ALL'>('ALL');
    const [editForm, setEditForm] = useState({
        price: 0,
        driverName: '',
        driverPhone: '',
        licensePlate: '',
        customerName: '',
        customerEmail: '',
        customerPhone: '',
        observations: '',
        origin: '',
        destination: '',
        vehicle: '',
        travelDate: '',
        travelTime: '',
        distanceKm: 0,
        travelHours: 0
    });
    const [vehiclesData, setVehiclesData] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [drivers, setDrivers] = useState<any[]>([]);
    const [expandedOrders, setExpandedOrders] = useState<string[]>([]);

    const toggleExpand = (id: string) => {
        setExpandedOrders(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const urlPass = urlParams.get('pw');
        // Clean URL if password is there, though we removed it from page.tsx it's good to clear it if manually typed
        if (urlPass) {
            sessionStorage.setItem('admin_password', urlPass);
            window.history.replaceState({}, document.title, "/admin");
        }

        const savedPass = sessionStorage.getItem('admin_password') || urlPass;
        if (savedPass) {
            setPassword(savedPass);
            setIsAuthenticated(true);
        }

        fetch('/api/drivers')
            .then(res => res.json())
            .then(data => setDrivers(data))
            .catch(err => console.error(err));

        fetch('/api/pricing')
            .then(res => res.json())
            .then(data => setVehiclesData(data))
            .catch(err => console.error(err));
    }, []);

    // Stats calculations
    const stats = {
        totalRevenue: orders.filter(o => o.status === 'FINISHED').reduce((acc, o) => acc + o.price, 0),
        activeTrips: orders.filter(o => o.status === 'STARTED').length,
        pendingTrips: orders.filter(o => o.status === 'PENDING').length,
        completedTrips: orders.filter(o => o.status === 'FINISHED').length
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.customerName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const getStatusGroup = (status: string) => {
        return filteredOrders.filter(o => o.status === status);
    };

    const fetchOrders = async () => {
        const currentPass = password || sessionStorage.getItem('admin_password');
        if (!isAuthenticated && !currentPass) {
            setLoading(false);
            return;
        }
        try {
            const res = await fetch('/api/orders', {
                headers: { 'x-admin-password': currentPass || '' }
            });
            const data = await res.json();
            if (res.ok) {
                setOrders(data);
                if (!isAuthenticated) setIsAuthenticated(true);
            } else if (res.status === 401) {
                setIsAuthenticated(false);
                sessionStorage.removeItem('admin_password');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/orders', {
                headers: { 'x-admin-password': password }
            });
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
                setIsAuthenticated(true);
                sessionStorage.setItem('admin_password', password);
            } else {
                alert('Contraseña Incorrecta');
            }
        } catch (e) {
            console.error(e);
            alert('Error al validar');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
        const interval = setInterval(fetchOrders, 3000); // Polling every 3s
        return () => clearInterval(interval);
    }, []);

    const updateStatus = async (id: string, newStatus: string) => {
        try {
            await fetch('/api/orders', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password || sessionStorage.getItem('admin_password') || ''
                },
                body: JSON.stringify({ id, status: newStatus }),
            });
            fetchOrders();
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpdateCustomerProfile = async (orderId: string, newData: any) => {
        try {
            const res = await fetch('/api/customers', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password || sessionStorage.getItem('admin_password') || ''
                },
                body: JSON.stringify({
                    id: newData.id,
                    phone: newData.phone,
                    email: newData.email,
                    cuit: newData.cuit,
                    taxStatus: newData.tax_status
                }),
            });
            if (res.ok) {
                await handleRejectCustomerUpdate(orderId);
                alert("Perfil de cliente actualizado correctamente en la base de datos.");
            } else {
                alert("Error actualizando perfil del cliente.");
            }
        } catch (e) { console.error(e); }
    };

    const handleRejectCustomerUpdate = async (orderId: string) => {
        try {
            const order = orders.find(o => o.id === orderId);
            if (order) {
                const newLog = (order.activityLog || []).filter((l: any) => l.type !== 'CUSTOMER_UPDATE_PENDING');
                await fetch('/api/orders', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'x-admin-password': password || sessionStorage.getItem('admin_password') || '' },
                    body: JSON.stringify({ id: orderId, activityLog: newLog }),
                });
                fetchOrders();
            }
        } catch (e) { console.error(e); }
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

    const copyToClipboard = (id: string) => {
        const url = `${window.location.origin}/tracking/${id}`;
        navigator.clipboard.writeText(`¡Hola! Tu viaje ha iniciado. Puedes seguirlo en vivo aquí: ${url}`);
        setCopiedLink(id);
        setTimeout(() => setCopiedLink(null), 3000);
    };

    const sendWhatsApp = (order: Order) => {
        const url = `${window.location.origin}/tracking/${order.id}`;
        const message = `¡Hola ${order.customerName}! 🚚 Tu pedido de EL CASAL ha sido confirmado y programado. Podes ver los detalles y seguir el estado aquí: ${url}`;
        const encoded = encodeURIComponent(message);
        const win = window.open(`https://wa.me/${order.customerPhone?.replace(/\D/g, '')}?text=${encoded}`, '_blank');
        if (win) win.focus();
    };

    const submitEditOrder = async (e?: React.FormEvent) => {
        e?.preventDefault(); // Prevent default if event is provided
        if (!editingOrder) return;
        setSaving(true);
        try {
            const currentPass = password || sessionStorage.getItem('admin_password');
            // Find selected driver info if any (case insensitive)
            const selectedD = drivers.find(d => d.name.toLowerCase() === editForm.driverName.toLowerCase());

            const res = await fetch('/api/orders', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': currentPass || ''
                },
                body: JSON.stringify({
                    id: editingOrder.id,
                    ...editForm,
                    driverId: selectedD ? selectedD.id : null
                })
            });
            if (res.ok) {
                fetchOrders();
                setEditingOrder(null);
            } else {
                const err = await res.json();
                alert('Error: ' + err.error);
            }
        } catch (e) {
            console.error(e);
            alert('Error al guardar cambios');
        } finally {
            setSaving(false);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="page-container" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto' }}>
                <div className="glass-panel" style={{ padding: '40px 20px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🚚</div>
                    <h2 style={{ marginBottom: '20px' }} className="text-gradient">Panel EL CASAL</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '30px', fontSize: '0.9rem' }}>Ingresá la Contraseña Maestra (Admin).</p>
                    <form onSubmit={handleLogin} method="POST">
                        <input
                            type="password"
                            className="glass-input"
                            placeholder="Contraseña"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{ marginBottom: '20px', textAlign: 'center' }}
                            required
                        />
                        <button type="submit" className="glass-button" style={{ width: '100%', padding: '15px' }} disabled={loading}>
                            {loading ? 'Validando...' : 'Ingresar'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    const handleEditClick = (order: Order) => {
        setEditingOrder(order);
        setEditForm({
            price: order.price,
            driverName: order.driverName || '',
            driverPhone: order.driverPhone || '',
            licensePlate: order.licensePlate || '',
            customerName: order.customerName || '',
            customerEmail: order.customerEmail || '',
            customerPhone: order.customerPhone || '',
            observations: order.observations || '',
            origin: order.origin || '',
            destination: order.destination || '',
            vehicle: order.vehicle || '',
            travelDate: order.travelDate || '',
            travelTime: order.travelTime || '',
            distanceKm: order.distanceKm || 0,
            travelHours: order.travelHours || 0
        });
    };

    const handleSaveEdit = async () => {
        if (!editingOrder) return;
        setSaving(true);
        try {
            const currentPass = password || sessionStorage.getItem('admin_password');
            // Find selected driver info if any (case insensitive)
            const selectedD = drivers.find(d => d.name.toLowerCase() === editForm.driverName.toLowerCase());

            const res = await fetch('/api/orders', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': currentPass || ''
                },
                body: JSON.stringify({
                    id: editingOrder.id,
                    ...editForm,
                    driverId: selectedD ? selectedD.id : null
                })
            });
            if (res.ok) {
                fetchOrders();
                setEditingOrder(null);
            } else {
                const err = await res.json();
                alert('Error: ' + err.error);
            }
        } catch (e) {
            console.error(e);
            alert('Error al guardar cambios');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem('admin_password');
        setIsAuthenticated(false);
        setPassword('');
    };

    return (
        <div className="page-container" style={{ padding: '15px' }}>
            <div className="flex justify-between items-center mb-20" style={{ flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ minWidth: '200px' }}>
                    <h1 className="text-gradient" style={{ fontSize: '1.8rem', marginBottom: '5px' }}>Panel de Despachos V-TIMELINE</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>EL CASAL</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', width: '100%' }}>
                    <button onClick={handleBackup} className="glass-button" style={{ padding: '10px', fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#3b82f6', width: '100%', height: '100%' }}>
                        📥 Backup
                    </button>
                    <label style={{ cursor: 'pointer', display: 'flex' }}>
                        <div className="glass-button" style={{ padding: '10px', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            📤 Restaurar
                        </div>
                        <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleRestore} />
                    </label>
                    <Link href="/admin/customers" style={{ display: 'flex' }}>
                        <button className="glass-button" style={{ padding: '10px', fontSize: '0.85rem', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3b82f6', color: '#3b82f6', width: '100%' }}>
                            👥 Clientes
                        </button>
                    </Link>
                    <Link href="/admin/drivers" style={{ display: 'flex' }}>
                        <button className="glass-button" style={{ padding: '10px', fontSize: '0.85rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid var(--success-color)', color: 'var(--success-color)', width: '100%' }}>
                            👷 Choferes
                        </button>
                    </Link>
                    <Link href="/admin/config" style={{ display: 'flex' }}>
                        <button className="glass-button" style={{ padding: '10px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--accent-light)', width: '100%' }}>
                            ⚙️ Tarifas
                        </button>
                    </Link>
                    <Link href="/admin/vehicles" style={{ display: 'flex' }}>
                        <button className="glass-button" style={{ padding: '10px', fontSize: '0.85rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--accent-light)', width: '100%' }}>
                            🚘 Vehículos
                        </button>
                    </Link>
                    <button onClick={handleLogout} className="glass-button" style={{ padding: '10px', fontSize: '0.85rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', color: '#ef4444', width: '100%', height: '100%' }}>
                        🚪 Salir
                    </button>
                    <Link href="/" style={{ display: 'flex' }}>
                        <button className="glass-button" style={{ padding: '10px', fontSize: '0.85rem', width: '100%' }}>
                            ← Inicio
                        </button>
                    </Link>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="flex gap-20 mb-20" style={{ flexWrap: 'wrap' }}>
                <div className="glass-panel stat-card">
                    <div className="glass-label">Facturación (Terminados)</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--success-color)' }}>${stats.totalRevenue.toLocaleString('es-AR')}</div>
                </div>
                <div className="glass-panel stat-card">
                    <div className="glass-label">Viajes en Curso</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>{stats.activeTrips}</div>
                </div>
                <div className="glass-panel stat-card">
                    <div className="glass-label">Pendientes</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fcd34d' }}>{stats.pendingTrips}</div>
                </div>
                <div className="glass-panel stat-card">
                    <div className="glass-label">Completados</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold' }}>{stats.completedTrips}</div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="glass-panel mb-20" style={{ padding: '20px' }}>
                <div className="search-bar">
                    <input
                        type="text"
                        placeholder="Buscar por ID o Cliente..."
                        className="glass-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ flex: 1 }}
                    />
                </div>
                <div className="filter-group">
                    {[
                        { id: 'ALL', label: 'Todos' },
                        { id: 'PENDING', label: 'NUEVO' },
                        { id: 'APPROVED', label: 'APROBADO' },
                        { id: 'CONFIRMED', label: 'PENDIENTE' },
                        { id: 'STARTED', label: 'EN CURSO' },
                        { id: 'FINISHED', label: 'FINALIZADO' },
                        { id: 'INVOICED', label: 'FACTURADO' },
                        { id: 'PAID', label: 'COBRADO' }
                    ].map(s => (
                        <button
                            key={s.id}
                            className={`filter-btn ${filterStatus === s.id ? 'active' : ''}`}
                            onClick={() => setFilterStatus(s.id as any)}
                            style={{ fontSize: '0.75rem', padding: '8px 15px' }}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '50px', color: 'var(--text-secondary)' }}>Cargando órdenes de compra...</div>
            ) : filteredOrders.length === 0 ? (
                <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📭</div>
                    <h3 style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>No hay viajes registrados aún</h3>
                    <p style={{ marginTop: '10px', color: 'var(--text-secondary)', opacity: 0.7 }}>
                        Las órdenes creadas por los clientes aparecerán aquí automáticamente.
                    </p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: '30px' }}>
                    {[
                        { id: 'PENDING', label: '🆕 NUEVO A REVISAR', color: '#f59e0b' },
                        { id: 'APPROVED', label: '✅ APROBADO', color: '#3b82f6' },
                        { id: 'CONFIRMED', label: '📅 PENDIENTE (PROGRAMADO)', color: '#10b981' },
                        { id: 'STARTED', label: '🚀 EN CURSO', color: 'var(--accent-color)' },
                        { id: 'FINISHED', label: '🏁 FINALIZADO', color: '#8b5cf6' },
                        { id: 'INVOICED', label: '📄 FACTURADO', color: '#ec4899' },
                        { id: 'PAID', label: '💰 COBRADO', color: '#059669' }
                    ].filter(group => filterStatus === 'ALL' || filterStatus === group.id).map(group => {
                        const groupOrders = getStatusGroup(group.id);
                        if (groupOrders.length === 0) return null;

                        return (
                            <div key={group.id} className="status-section">
                                <h2 style={{ fontSize: '1rem', color: group.color, marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {group.label}
                                    <span style={{ fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px', color: 'var(--text-secondary)' }}>{groupOrders.length}</span>
                                </h2>
                                <div style={{ display: 'grid', gap: '15px' }}>
                                    {groupOrders.map(order => {
                                        const isExpanded = expandedOrders.includes(order.id);

                                        return (
                                            <div key={order.id} className="glass-panel" style={{ padding: '0', overflow: 'hidden', border: '1px solid var(--glass-border)', transition: 'all 0.3s ease' }}>
                                                {/* Status Timeline - Focused View */}
                                                <div style={{
                                                    padding: '18px 20px',
                                                    background: 'rgba(0,0,0,0.25)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '10px',
                                                    borderBottom: '1px solid rgba(255,255,255,0.05)'
                                                }}>
                                                    {(() => {
                                                        const allS = ['PENDING', 'APPROVED', 'CONFIRMED', 'STARTED', 'FINISHED', 'INVOICED', 'PAID'];
                                                        const labels: Record<string, string> = { 'PENDING': 'NUEVO', 'APPROVED': 'APROBADO', 'CONFIRMED': 'PENDIENTE', 'STARTED': 'EN CURSO', 'FINISHED': 'FINALIZADO', 'INVOICED': 'FACTURADO', 'PAID': 'COBRADO' };
                                                        const currIdx = allS.indexOf(order.status);

                                                        // Get window of 3 statuses
                                                        const start = Math.max(0, currIdx - 1);
                                                        const end = Math.min(allS.length - 1, currIdx + 1);
                                                        const displayIdxs = [];
                                                        if (start > 0 && currIdx === allS.length - 1) displayIdxs.push(currIdx - 2); // Show 3 even at the end
                                                        if (currIdx === 0 && allS.length > 2) displayIdxs.push(0, 1, 2);
                                                        else {
                                                            for (let i = start; i <= end; i++) displayIdxs.push(i);
                                                        }
                                                        // Filter and deduplicate
                                                        const finalIdxs = Array.from(new Set(displayIdxs)).filter(i => i >= 0 && i < allS.length).sort((a, b) => a - b);

                                                        return finalIdxs.map((idx, i) => {
                                                            const s = allS[idx];
                                                            const isCurrent = idx === currIdx;
                                                            const isCompleted = idx <= currIdx;
                                                            const isFirstInWindow = i === 0;
                                                            const isLastInWindow = i === finalIdxs.length - 1;

                                                            return (
                                                                <div key={s} style={{
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    alignItems: 'center',
                                                                    flex: 1,
                                                                    position: 'relative',
                                                                    transform: isCurrent ? 'scale(1.1)' : 'scale(1)',
                                                                    transition: 'transform 0.3s ease'
                                                                }}>
                                                                    <div style={{
                                                                        width: isCurrent ? '16px' : '10px',
                                                                        height: isCurrent ? '16px' : '10px',
                                                                        borderRadius: '50%',
                                                                        background: isCurrent ? group.color : (isCompleted ? group.color : 'rgba(255,255,255,0.2)'),
                                                                        boxShadow: isCurrent ? `0 0 15px ${group.color}` : 'none',
                                                                        zIndex: 2,
                                                                        border: isCurrent ? '2px solid white' : 'none',
                                                                        transition: 'all 0.3s ease'
                                                                    }} />
                                                                    <div style={{
                                                                        fontSize: isCurrent ? '0.75rem' : '0.65rem',
                                                                        marginTop: '8px',
                                                                        color: isCompleted ? 'white' : 'var(--text-secondary)',
                                                                        fontWeight: isCurrent ? 'bold' : 'normal',
                                                                        textAlign: 'center',
                                                                        opacity: isCurrent ? 1 : 0.6,
                                                                        transition: 'all 0.3s ease'
                                                                    }}>
                                                                        {labels[s as keyof typeof labels]}
                                                                    </div>

                                                                    {!isLastInWindow && (
                                                                        <div style={{
                                                                            position: 'absolute',
                                                                            top: isCurrent ? '8px' : '5px',
                                                                            left: '50%',
                                                                            width: '100%',
                                                                            height: '2px',
                                                                            background: idx < currIdx ? group.color : 'rgba(255,255,255,0.1)',
                                                                            zIndex: 1
                                                                        }} />
                                                                    )}
                                                                </div>
                                                            );
                                                        });
                                                    })()}
                                                </div>

                                                {/* Header */}
                                                <div
                                                    onClick={() => toggleExpand(order.id)}
                                                    style={{
                                                        padding: '12px 20px',
                                                        background: isExpanded ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
                                                        borderBottom: isExpanded ? '1px solid var(--glass-border)' : '1px solid transparent',
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <span style={{ fontSize: '1rem', transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.3s ease' }}>⌄</span>
                                                        <div>
                                                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{order.customerName}</div>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>ID: {order.id}</div>
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        <div style={{ color: group.color, fontWeight: 'bold' }}>${order.price.toLocaleString('es-AR')}</div>
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{order.travelDate || 'A coordinar'}</div>
                                                    </div>
                                                </div>

                                                {/* Expanded Content */}
                                                {isExpanded && (
                                                    <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                                                        {(() => {
                                                            const pendingUpdate = order.activityLog?.find((l: any) => l.type === 'CUSTOMER_UPDATE_PENDING');
                                                            if (pendingUpdate) {
                                                                return (
                                                                    <div style={{ gridColumn: '1 / -1', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '15px', borderRadius: '10px' }}>
                                                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                                                                            <div>
                                                                                <strong style={{ color: '#ef4444' }}>⚠️ El cliente ha modificado sus datos de facturación/contacto en este pedido:</strong>
                                                                                <ul style={{ margin: '10px 0 0 20px', fontSize: '0.85rem' }}>
                                                                                    {pendingUpdate.newData.phone && <li>Teléfono: {pendingUpdate.newData.phone}</li>}
                                                                                    {pendingUpdate.newData.email && <li>Email: {pendingUpdate.newData.email}</li>}
                                                                                    {pendingUpdate.newData.cuit && <li>CUIT: {pendingUpdate.newData.cuit}</li>}
                                                                                    {pendingUpdate.newData.tax_status && <li>IVA: {pendingUpdate.newData.tax_status}</li>}
                                                                                </ul>
                                                                                <p style={{ fontSize: '0.75rem', marginTop: '10px', opacity: 0.8 }}>Si aceptás, estos datos quedarán guardados en su perfil de cliente para futuros viajes.</p>
                                                                            </div>
                                                                            <div className="flex gap-10" style={{ flexWrap: 'wrap' }}>
                                                                                <button
                                                                                    className="glass-button"
                                                                                    style={{ background: '#10b981', color: '#fff', fontWeight: 'bold' }}
                                                                                    onClick={() => handleUpdateCustomerProfile(order.id, pendingUpdate.newData)}
                                                                                >
                                                                                    ✅ Actualizar Perfil
                                                                                </button>
                                                                                <button
                                                                                    className="glass-button"
                                                                                    style={{ background: 'rgba(255,255,255,0.1)' }}
                                                                                    onClick={() => handleRejectCustomerUpdate(order.id)}
                                                                                >
                                                                                    Ignorar
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                        <div className="flex-col gap-15">
                                                            <div>
                                                                <div className="glass-label" style={{ fontSize: '0.65rem' }}>DETALLE DE CARGA</div>
                                                                <div style={{ fontSize: '0.85rem' }}><strong>Vehículo:</strong> {formatVehicle(order.vehicle)}</div>
                                                                <div style={{ fontSize: '0.85rem' }}><strong>Fecha:</strong> {order.travelDate} ({order.travelTime})</div>
                                                                {order.observations && <div style={{ fontSize: '0.75rem', marginTop: '5px', padding: '8px', background: 'rgba(0,0,0,0.2)', borderLeft: `2px solid ${group.color}` }}>{order.observations}</div>}
                                                            </div>
                                                            <div>
                                                                <div className="glass-label" style={{ fontSize: '0.65rem' }}>ORIGEN</div>
                                                                <div style={{ fontSize: '0.8rem' }}>{order.origin}</div>
                                                                <div className="glass-label" style={{ fontSize: '0.65rem', marginTop: '10px' }}>DESTINO</div>
                                                                <div style={{ fontSize: '0.8rem' }}>{order.destination}</div>
                                                            </div>
                                                        </div>

                                                        <div className="flex-col gap-15">
                                                            <div>
                                                                <div className="glass-label" style={{ fontSize: '0.65rem' }}>CONTACTO</div>
                                                                <div style={{ fontSize: '0.85rem' }}>📞 {order.customerPhone}</div>
                                                                <div style={{ fontSize: '0.85rem' }}>✉️ {order.customerEmail}</div>
                                                                {order.cuit && <div style={{ fontSize: '0.85rem' }}>📄 CUIT: {order.cuit}</div>}
                                                            </div>
                                                            {order.driverName && (
                                                                <div style={{ padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                                                                    <div className="glass-label" style={{ fontSize: '0.65rem' }}>CHOFER</div>
                                                                    <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{order.driverName}</div>
                                                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{order.licensePlate} | {order.driverPhone}</div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        <div className="flex-col gap-10">
                                                            <div className="glass-label" style={{ fontSize: '0.65rem' }}>ACCIONES DE ESTADO</div>
                                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                                                {order.status === 'PENDING' && <button className="glass-button" onClick={() => updateStatus(order.id, 'APPROVED')} style={{ background: '#3b82f6', fontWeight: 'bold' }}>✅ APROBAR PRESUPUESTO</button>}
                                                                {order.status === 'APPROVED' && <button className="glass-button" onClick={() => updateStatus(order.id, 'CONFIRMED')} style={{ background: '#10b981', fontWeight: 'bold' }}>📅 PROGRAMAR (PENDIENTE)</button>}
                                                                {order.status === 'CONFIRMED' && <button className="glass-button" onClick={() => updateStatus(order.id, 'STARTED')} style={{ background: 'var(--accent-gradient)', fontWeight: 'bold' }}>🚀 INICIAR VIAJE</button>}
                                                                {order.status === 'STARTED' && <button className="glass-button" onClick={() => updateStatus(order.id, 'FINISHED')} style={{ background: '#8b5cf6', fontWeight: 'bold' }}>🏁 FINALIZAR VIAJE</button>}
                                                                {order.status === 'FINISHED' && <button className="glass-button" onClick={() => updateStatus(order.id, 'INVOICED')} style={{ background: '#ec4899', fontWeight: 'bold' }}>📄 MARCAR FACTURADO</button>}
                                                                {order.status === 'INVOICED' && <button className="glass-button" onClick={() => updateStatus(order.id, 'PAID')} style={{ background: '#059669', fontWeight: 'bold' }}>💰 MARCAR COBRADO</button>}
                                                            </div>

                                                            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '10px', marginTop: '5px' }}>
                                                                <button className="glass-button" onClick={() => handleEditClick(order)} style={{ width: '100%', fontSize: '0.8rem', padding: '10px', marginBottom: '8px' }}>✏️ Editar Datos</button>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                                                    <button className="glass-button" onClick={() => copyToClipboard(order.id)} style={{ fontSize: '0.7rem' }}>{copiedLink === order.id ? '✅ Link' : '🔗 Link'}</button>
                                                                    <button className="glass-button" onClick={() => sendWhatsApp(order)} style={{ fontSize: '0.7rem', background: '#25d366', border: 'none' }}>🟢 WhatsApp</button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de Edición */}
            {editingOrder && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(15px)' }}>
                    <div className="glass-panel" style={{ width: '95%', maxWidth: '800px', padding: '25px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="flex justify-between items-center mb-20">
                            <h2 style={{ fontSize: '1.5rem' }}>Editar Pedido <span style={{ fontFamily: 'monospace', opacity: 0.6 }}>{editingOrder.id}</span></h2>
                            <button className="filter-btn" onClick={() => setEditingOrder(null)}>✕</button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px' }}>
                            {/* Columna 1: Cliente y Viaje */}
                            <div className="flex-col gap-15">
                                <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-color)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>DATOS DEL CLIENTE</h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label className="glass-label">Nombre Cliente</label>
                                        <input type="text" className="glass-input" value={editForm.customerName} onChange={e => setEditForm(p => ({ ...p, customerName: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="glass-label">Precio Final ($)</label>
                                        <input type="number" className="glass-input" value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: Number(e.target.value) }))} />
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px', marginTop: '10px' }}>
                                    <h3 style={{ fontSize: '0.8rem', color: 'var(--accent-color)', marginBottom: '10px' }}>📟 CALCULADORA DE PRECIO</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label className="glass-label">Distancia (Km)</label>
                                            <input type="number" className="glass-input" value={editForm.distanceKm} onChange={e => {
                                                const km = Number(e.target.value);
                                                setEditForm(p => {
                                                    const newState = { ...p, distanceKm: km };
                                                    // Recalculate if we have vehicle data
                                                    // In quote page it uses 100km threshold
                                                    // We need to parse vehicle since it's "1x Utilitario..."
                                                    const mainVehicle = p.vehicle.split('x ').length > 1 ? p.vehicle.split('x ')[1].trim() : p.vehicle;
                                                    const vData = vehiclesData.find(v => v.name === mainVehicle || v.id === p.vehicle);
                                                    if (vData) {
                                                        const qty = parseInt(p.vehicle.split('x')[0]) || 1;
                                                        if (km <= 100) newState.price = vData.priceHour * p.travelHours * qty;
                                                        else newState.price = vData.priceKm * km * qty;
                                                    }
                                                    return newState;
                                                });
                                            }} />
                                        </div>
                                        <div>
                                            <label className="glass-label">Horas Est. (Si Km &lt; 100)</label>
                                            <input type="number" className="glass-input" value={editForm.travelHours} onChange={e => {
                                                const h = Number(e.target.value);
                                                setEditForm(p => {
                                                    const newState = { ...p, travelHours: h };
                                                    const mainVehicle = p.vehicle.split('x ').length > 1 ? p.vehicle.split('x ')[1].trim() : p.vehicle;
                                                    const vData = vehiclesData.find(v => v.name === mainVehicle || v.id === p.vehicle);
                                                    if (vData && p.distanceKm <= 100) {
                                                        const qty = parseInt(p.vehicle.split('x')[0]) || 1;
                                                        newState.price = vData.priceHour * h * qty;
                                                    }
                                                    return newState;
                                                });
                                            }} />
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '8px' }}>
                                        * Al modificar estos valores, el Precio Final se recalcula según las tarifas configuradas.
                                    </p>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label className="glass-label">Email</label>
                                        <input type="email" className="glass-input" value={editForm.customerEmail} onChange={e => setEditForm(p => ({ ...p, customerEmail: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="glass-label">Teléfono</label>
                                        <input type="tel" className="glass-input" value={editForm.customerPhone} onChange={e => setEditForm(p => ({ ...p, customerPhone: e.target.value }))} />
                                    </div>
                                </div>
                                <div>
                                    <label className="glass-label">Observaciones</label>
                                    <textarea className="glass-input" style={{ minHeight: '60px', paddingTop: '10px' }} value={editForm.observations} onChange={e => setEditForm(p => ({ ...p, observations: e.target.value }))} />
                                </div>

                                <h3 style={{ fontSize: '0.9rem', color: 'var(--accent-color)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px', marginTop: '10px' }}>RUTA Y FECHA</h3>
                                <div>
                                    <label className="glass-label">Origen (direcciones separadas por | )</label>
                                    <input type="text" className="glass-input" value={editForm.origin} onChange={e => setEditForm(p => ({ ...p, origin: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="glass-label">Destino Final</label>
                                    <input type="text" className="glass-input" value={editForm.destination} onChange={e => setEditForm(p => ({ ...p, destination: e.target.value }))} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div>
                                        <label className="glass-label">Fecha</label>
                                        <input type="date" className="glass-input" value={editForm.travelDate} onChange={e => setEditForm(p => ({ ...p, travelDate: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="glass-label">Turno (manana/mediodia/tarde)</label>
                                        <select className="glass-input" value={editForm.travelTime} onChange={e => setEditForm(p => ({ ...p, travelTime: e.target.value }))} style={{ background: 'var(--body-bg)' }}>
                                            <option value="manana">Mañana</option>
                                            <option value="mediodia">Medio día</option>
                                            <option value="tarde">Tarde</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="glass-label">Vehículo(s)</label>
                                    <input type="text" className="glass-input" value={editForm.vehicle} onChange={e => setEditForm(p => ({ ...p, vehicle: e.target.value }))} placeholder="Ej: 1x Camioneta Mediana" />
                                </div>
                            </div>

                            {/* Columna 2: Chofer */}
                            <div className="flex-col gap-15">
                                <h3 style={{ fontSize: '0.9rem', color: 'var(--success-color)', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '5px' }}>ASIGNACIÓN DE CHOFER</h3>
                                <div className="toggle-group" style={{ maxHeight: '200px', overflowY: 'auto', padding: '5px' }}>
                                    <button
                                        type="button"
                                        className={`toggle-btn ${!editForm.driverName ? 'active' : ''}`}
                                        onClick={() => setEditForm({ ...editForm, driverName: '', driverPhone: '', licensePlate: '' })}
                                        style={{ minWidth: '80px', padding: '10px', fontSize: '0.8rem' }}
                                    >
                                        ❌ Sin Chofer
                                    </button>
                                    {drivers.map(d => (
                                        <button
                                            key={d.id}
                                            type="button"
                                            className={`toggle-btn ${editForm.driverName === d.name ? 'active' : ''}`}
                                            onClick={() => setEditForm({ ...editForm, driverName: d.name, driverPhone: d.phone, licensePlate: d.license_plate })}
                                            style={{ minWidth: '80px', padding: '10px', fontSize: '0.8rem' }}
                                        >
                                            {d.name}
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '10px' }}>
                                    <div>
                                        <label className="glass-label">Nombre Chofer</label>
                                        <input type="text" className="glass-input" value={editForm.driverName} onChange={e => setEditForm(p => ({ ...p, driverName: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="glass-label">Patente</label>
                                        <input type="text" className="glass-input" value={editForm.licensePlate} onChange={e => setEditForm(p => ({ ...p, licensePlate: e.target.value }))} />
                                    </div>
                                </div>
                                <div>
                                    <label className="glass-label">Teléfono Chofer</label>
                                    <input type="tel" className="glass-input" value={editForm.driverPhone} onChange={e => setEditForm(p => ({ ...p, driverPhone: e.target.value }))} />
                                </div>

                                <div className="glass-panel" style={{ marginTop: '20px', padding: '15px', background: 'rgba(255,255,255,0.02)' }}>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '15px' }}>
                                        Al guardar, los cambios se reflejarán inmediatamente en la base de datos y en el seguimiento del cliente.
                                    </p>
                                    <div className="flex gap-10">
                                        <button className="glass-button" style={{ flex: 1, background: 'rgba(255,255,255,0.05)' }} onClick={() => setEditingOrder(null)}>Cancelar</button>
                                        <button className="glass-button" style={{ flex: 2, background: 'var(--accent-gradient)' }} onClick={handleSaveEdit} disabled={saving}>
                                            {saving ? 'Guardando...' : '💾 GUARDAR TODOS LOS CAMBIOS'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
