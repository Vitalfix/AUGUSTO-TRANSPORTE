"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import InstallPrompt from '@/components/InstallPrompt';
import AdminHeader from '@/components/AdminHeader';

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
    taxStatus?: string;
    distanceKm?: number;
    travelHours?: number;
    waitingMinutes?: number;
    activityLog?: { type: string; timestamp: string;[key: string]: any }[];
    pricingBreakdown?: { name: string, qty: number, unitPrice: number, subtotal: number, type: 'KM' | 'HOUR' }[];
}

interface Driver {
    id: string;
    name: string;
    phone: string;
    license_plate: string;
}

interface VehiclePricing {
    id: string;
    name: string;
    priceKm: number;
    priceHour: number;
    priceWaitHour?: number;
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
    const [loginLoading, setLoginLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [copiedLink, setCopiedLink] = useState<string | null>(null);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [activeTab, setActiveTab] = useState<'CLIENT' | 'ROUTE' | 'LOGISTICS' | 'ADJUST'>('CLIENT');
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
        cuit: '',
        taxStatus: '',
        observations: '',
        origin: '',
        destination: '',
        vehicle: '',
        travelDate: '',
        travelTime: '',
        distanceKm: 0,
        travelHours: 0,
        waitingMinutes: 0
    });
    const [vehiclesData, setVehiclesData] = useState<VehiclePricing[]>([]);
    const [saving, setSaving] = useState(false);
    const [drivers, setDrivers] = useState<Driver[]>([]);
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
        totalRevenue: orders.filter(o => o.status === 'FINISHED' || o.status === 'INVOICED' || o.status === 'PAID').reduce((acc, o) => acc + (o.price || 0), 0),
        activeTrips: orders.filter(o => o.status === 'STARTED').length,
        pendingTrips: orders.filter(o => o.status === 'PENDING').length,
        completedTrips: orders.filter(o => o.status === 'FINISHED' || o.status === 'INVOICED' || o.status === 'PAID').length
    };

    const filteredOrders = orders.filter(o => {
        const matchesSearch = o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            o.customerName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesSearch;
    });

    const getStatusGroup = (status: string) => {
        return filteredOrders.filter(o => o.status === status);
    };

    const fetchOrders = useCallback(async () => {
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
    }, [password, isAuthenticated]);

    const handleUpdateCustomerProfile = async (orderId: string, newData: { id: string, phone: string, email: string, cuit: string, tax_status: string }) => {
        if (!window.confirm("¿Seguro que quieres actualizar los datos permanentes de este cliente con esta nueva información?")) return;

        try {
            // 1. Update customer record
            const resCust = await fetch('/api/customers', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-password': password
                },
                body: JSON.stringify({
                    id: newData.id,
                    phone: newData.phone,
                    email: newData.email,
                    cuit: newData.cuit,
                    taxStatus: newData.tax_status
                })
            });

            if (!resCust.ok) throw new Error("Error al actualizar cliente");

            // 2. Clean up activity log (remove the pending entry)
            const order = orders.find(o => o.id === orderId);
            if (order) {
                const newLog = order.activityLog?.filter((l: any) => l.type !== 'CUSTOMER_UPDATE_PENDING');
                await fetch(`/api/orders/${orderId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activity_log: newLog })
                });
                alert("✅ Cliente actualizado con éxito.");
                fetchOrders();
            }
        } catch (e) {
            console.error(e);
            alert("Error al procesar la actualización del cliente");
        }
    };

    const handleRejectCustomerUpdate = async (orderId: string) => {
        try {
            const order = orders.find(o => o.id === orderId);
            if (order) {
                const newLog = order.activityLog?.filter((l: any) => l.type !== 'CUSTOMER_UPDATE_PENDING');
                await fetch(`/api/orders/${orderId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ activity_log: newLog })
                });
                fetchOrders();
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginLoading(true);
        console.log("Iniciando validación de admin...");
        try {
            const res = await fetch('/api/orders', {
                headers: { 'x-admin-password': password }
            });
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
                setIsAuthenticated(true);
                sessionStorage.setItem('admin_password', password);
                console.log("Login exitoso");
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error("Error de login:", res.status, errorData);
                alert('Contraseña Incorrecta');
            }
        } catch (e) {
            console.error("Error en validación:", e);
            alert('Error al validar conexión');
        } finally {
            setLoginLoading(false);
        }
    };

    useEffect(() => {
        if (!isAuthenticated) return;

        fetchOrders();

        // Polling only if no modal is open and tab is active
        const interval = setInterval(() => {
            if (!editingOrder && document.visibilityState === 'visible') {
                fetchOrders();
            }
        }, 3000);

        return () => clearInterval(interval);
    }, [fetchOrders, isAuthenticated, editingOrder]);

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



    const sendWhatsApp = (order: Order) => {
        const url = `${window.location.origin}/tracking/${order.id}`;
        const message = `¡Hola ${order.customerName}! 🚚 Tu pedido de EL CASAL ha sido confirmado y programado. Podes ver los detalles y seguir el estado aquí: ${url}`;
        const encoded = encodeURIComponent(message);
        const win = window.open(`https://wa.me/${order.customerPhone?.replace(/\D/g, '')}?text=${encoded}`, '_blank');
        if (win) win.focus();
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
                        <button type="submit" className="glass-button" style={{ width: '100%', padding: '15px' }} disabled={loginLoading}>
                            {loginLoading ? 'Validando...' : 'Ingresar'}
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
            cuit: order.cuit || '',
            taxStatus: order.taxStatus || '',
            observations: order.observations || '',
            origin: order.origin || '',
            destination: order.destination || '',
            vehicle: order.vehicle || '',
            travelDate: order.travelDate || '',
            travelTime: order.travelTime || '',
            distanceKm: order.distanceKm || 0,
            travelHours: order.travelHours || 0,
            waitingMinutes: order.waitingMinutes || 0
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

    const confirmDeleteOrder = async (id: string, name: string) => {
        if (!confirm(`¿Seguro que quieres eliminar el pedido de ${name}? Se guardará en la papelera por 48hs.`)) return;
        try {
            const res = await fetch(`/api/orders?id=${id}`, {
                method: 'DELETE',
                headers: { 'x-admin-password': (password || sessionStorage.getItem('admin_password') || '') }
            });
            if (res.ok) {
                fetchOrders();
            } else {
                const err = await res.json();
                alert('Error al eliminar: ' + (err.error || 'Desconocido'));
            }
        } catch (e) { console.error(e); }
    };

    return (
        <div className="page-container" style={{ padding: '10px' }}>
            <AdminHeader title="Control de Viajes" />

            {/* Search and Filters */}
            <div className="glass-panel mb-20" style={{ padding: '15px' }}>
                <div className="search-bar mb-15">
                    <input
                        type="text"
                        placeholder="Buscar por ID o Cliente..."
                        className="glass-input flex-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group mt-10">
                    {[
                        { id: 'ALL', label: 'Todos', color: 'var(--text-secondary)' },
                        { id: 'PENDING', label: 'NUEVO', color: '#f59e0b' },
                        { id: 'APPROVED', label: 'APROBADO', color: '#3b82f6' },
                        { id: 'CONFIRMED', label: 'PENDIENTE', color: '#10b981' },
                        { id: 'STARTED', label: 'EN CURSO', color: 'var(--accent-color)' },
                        { id: 'FINISHED', label: 'FINALIZADO', color: '#8b5cf6' },
                        { id: 'INVOICED', label: 'FACTURADO', color: '#ec4899' },
                        { id: 'PAID', label: 'COBRADO', color: '#059669' }
                    ].map(s => {
                        const count = s.id === 'ALL' ? orders.length : orders.filter(o => o.status === s.id).length;
                        return (
                            <button
                                key={s.id}
                                className={`filter-btn ${filterStatus === s.id ? 'active' : ''}`}
                                onClick={() => setFilterStatus(s.id as any)}
                                style={{
                                    border: `1px solid ${filterStatus === s.id ? s.color : 'rgba(255,255,255,0.05)'}`,
                                    background: filterStatus === s.id ? `${s.color}15` : 'rgba(255,255,255,0.02)',
                                    color: filterStatus === s.id ? s.color : 'var(--text-secondary)'
                                }}
                            >
                                {s.label} <span style={{ opacity: 0.6, marginLeft: '5px' }}>{count}</span>
                            </button>
                        );
                    })}
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
                            <div key={group.id} className="status-section animate-fade-in">
                                <h2 className="text-sm text-secondary mb-15 flex items-center gap-10" style={{ color: group.color }}>
                                    {group.label}
                                    <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>{groupOrders.length}</span>
                                </h2>
                                <div style={{ display: 'grid', gap: '15px' }}>
                                    {groupOrders.map(order => {
                                        const isExpanded = expandedOrders.includes(order.id);

                                        return (
                                            <div
                                                key={order.id}
                                                className="glass-panel animate-fade-in over-hidden mb-10"
                                                style={{ borderLeft: `5px solid ${group.color}` }}
                                            >
                                                <div
                                                    className="pointer"
                                                    onClick={() => toggleExpand(order.id)}
                                                >
                                                    <div className="flex justify-between items-start w-full p-15">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-10 mb-8 flex-wrap">
                                                                <span className="text-white" style={{ fontSize: '1.1rem', fontWeight: '800' }}>{order.customerName}</span>
                                                                <div
                                                                    className="badge"
                                                                    style={{
                                                                        background: `${group.color}22`,
                                                                        color: group.color,
                                                                        border: `1px solid ${group.color}44`
                                                                    }}
                                                                >
                                                                    {group.label.split(' ')[1] || group.label}
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-15 flex-wrap">
                                                                <span className="text-secondary" style={{ fontSize: '0.75rem', fontFamily: 'monospace' }}>#{order.id.substring(0, 8)}</span>
                                                                <span className="text-accent" style={{ fontSize: '0.75rem', fontWeight: '600' }}>📅 {order.travelDate || 'Pendiente'}</span>
                                                                <span className="text-secondary" style={{ fontSize: '0.75rem' }}>🚛 {formatVehicle(order.vehicle)}</span>
                                                            </div>
                                                        </div>
                                                        <div className="text-right" style={{ minWidth: '100px' }}>
                                                            <div style={{ fontSize: '1.2rem', fontWeight: '900', color: group.color, marginBottom: '4px' }}>
                                                                ${order.price.toLocaleString('es-AR')}
                                                            </div>
                                                            <div className="flex items-center justify-end gap-4 text-success" style={{ fontSize: '0.7rem' }}>
                                                                {order.driverName ? (
                                                                    <>🚚 <span style={{ fontWeight: '600' }}>{order.driverName}</span></>
                                                                ) : (
                                                                    <>⏳ <span style={{ opacity: 0.7 }}>Sin chofer</span></>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span
                                                            className="pr-10 self-center"
                                                            style={{
                                                                fontSize: '1.2rem',
                                                                transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                                                transition: 'transform 0.3s ease',
                                                                opacity: 0.3
                                                            }}
                                                        >⌄</span>
                                                    </div>
                                                </div>

                                                {/* Expanded Content */}
                                                {isExpanded && (
                                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                                                        {/* Status Timeline - Moved here */}
                                                        <div
                                                            className="flex items-center justify-center gap-10 p-20"
                                                            style={{
                                                                background: 'rgba(0,0,0,0.15)',
                                                                borderBottom: '1px solid rgba(255,255,255,0.05)'
                                                            }}
                                                        >
                                                            {(() => {
                                                                const allS = ['PENDING', 'APPROVED', 'CONFIRMED', 'STARTED', 'FINISHED', 'INVOICED', 'PAID'];
                                                                const labels: Record<string, string> = { 'PENDING': 'NUEVO', 'APPROVED': 'APROBADO', 'CONFIRMED': 'PENDIENTE', 'STARTED': 'EN CURSO', 'FINISHED': 'FINALIZADO', 'INVOICED': 'FACTURADO', 'PAID': 'COBRADO' };
                                                                const currIdx = allS.indexOf(order.status);
                                                                const start = Math.max(0, currIdx - 1);
                                                                const end = Math.min(allS.length - 1, currIdx + 1);
                                                                const displayIdxs = [];
                                                                if (start > 0 && currIdx === allS.length - 1) displayIdxs.push(currIdx - 2);
                                                                if (currIdx === 0 && allS.length > 2) displayIdxs.push(0, 1, 2);
                                                                else {
                                                                    for (let i = start; i <= end; i++) displayIdxs.push(i);
                                                                }
                                                                const finalIdxs = Array.from(new Set(displayIdxs)).filter(i => i >= 0 && i < allS.length).sort((a, b) => a - b);

                                                                return finalIdxs.map((idx, i) => {
                                                                    const s = allS[idx];
                                                                    const isCurrent = idx === currIdx;
                                                                    const isCompleted = idx <= currIdx;
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
                                                                                fontSize: isCurrent ? '0.7rem' : '0.6rem',
                                                                                marginTop: '6px',
                                                                                color: isCompleted ? 'white' : 'var(--text-secondary)',
                                                                                fontWeight: isCurrent ? 'bold' : 'normal',
                                                                                textAlign: 'center',
                                                                                opacity: isCurrent ? 1 : 0.6
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

                                                        {/* Pricing Breakdown Detail */}
                                                        {order.pricingBreakdown && order.pricingBreakdown.length > 0 && (
                                                            <div style={{ padding: '0 20px 15px' }}>
                                                                <div className="glass-panel" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', padding: '15px' }}>
                                                                    <div className="glass-label" style={{ fontSize: '0.65rem', color: '#60a5fa', marginBottom: '10px' }}>📊 DETALLE DEL CÁLCULO (PRESUPUESTO INICIAL)</div>
                                                                    <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
                                                                        <thead>
                                                                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                                                                                <th style={{ textAlign: 'left', padding: '5px' }}>Concepto</th>
                                                                                <th style={{ textAlign: 'center', padding: '5px' }}>Cant.</th>
                                                                                <th style={{ textAlign: 'right', padding: '5px' }}>P.Unit</th>
                                                                                <th style={{ textAlign: 'right', padding: '5px' }}>Subtotal</th>
                                                                            </tr>
                                                                        </thead>
                                                                        <tbody>
                                                                            {order.pricingBreakdown.map((item, idx) => (
                                                                                <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                                                                    <td style={{ padding: '8px 5px' }}>
                                                                                        <div>{item.name}</div>
                                                                                        <div style={{ fontSize: '0.65rem', opacity: 0.6 }}>{item.type === 'KM' ? `Cobro por Km (>100Km)` : `Cobro por Hora (≤100Km)`}</div>
                                                                                    </td>
                                                                                    <td style={{ textAlign: 'center', padding: '8px 5px' }}>{item.qty}</td>
                                                                                    <td style={{ textAlign: 'right', padding: '8px 5px' }}>${item.unitPrice.toLocaleString('es-AR')}</td>
                                                                                    <td style={{ textAlign: 'right', padding: '8px 5px', fontWeight: 'bold' }}>${item.subtotal.toLocaleString('es-AR')}</td>
                                                                                </tr>
                                                                            ))}
                                                                            <tr>
                                                                                <td colSpan={3} style={{ textAlign: 'right', padding: '10px 5px', color: 'var(--text-secondary)' }}>TOTAL ESTIMADO:</td>
                                                                                <td style={{ textAlign: 'right', padding: '10px 5px', fontWeight: '900', color: '#60a5fa', fontSize: '1rem' }}>${order.price.toLocaleString('es-AR')}</td>
                                                                            </tr>
                                                                        </tbody>
                                                                    </table>
                                                                    <div style={{ fontSize: '0.65rem', marginTop: '5px', opacity: 0.5, fontStyle: 'italic', textAlign: 'right' }}>
                                                                        * El cálculo utiliza {Math.round(order.distanceKm || 0)} Km y {order.travelHours} Hs de base.
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                        <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '25px' }}>
                                                            <div className="flex-col gap-15">
                                                                <div>
                                                                    <div className="glass-label" style={{ fontSize: '0.6rem' }}>📟 INFORMACIÓN DE CARGA</div>
                                                                    <div style={{ fontSize: '0.85rem', marginTop: '10px' }}><strong>Vehículo:</strong> {formatVehicle(order.vehicle)}</div>
                                                                    <div style={{ fontSize: '0.85rem' }}><strong>Fecha y Hora:</strong> {order.travelDate} ({order.travelTime})</div>
                                                                    {order.observations && (
                                                                        <div style={{
                                                                            fontSize: '0.75rem',
                                                                            marginTop: '10px',
                                                                            padding: '10px',
                                                                            background: 'rgba(0,0,0,0.2)',
                                                                            borderRadius: '8px',
                                                                            borderLeft: `3px solid ${group.color}`
                                                                        }}>
                                                                            <strong>Obs:</strong> {order.observations}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                                                                    <div className="glass-label" style={{ fontSize: '0.6rem' }}>👤 CONTACTO</div>
                                                                    <div style={{ fontSize: '0.8rem' }}>{order.customerEmail}</div>
                                                                    <div style={{ fontSize: '0.8rem' }}>{order.customerPhone}</div>
                                                                </div>
                                                            </div>

                                                            <div className="flex-col gap-15">
                                                                <div>
                                                                    <div className="glass-label" style={{ fontSize: '0.6rem' }}>📍 RUTA</div>
                                                                    <div style={{ fontSize: '0.8rem', marginTop: '5px' }}><strong>Origen:</strong> {order.origin}</div>
                                                                    <div style={{ fontSize: '0.8rem', marginTop: '5px' }}><strong>Destino:</strong> {order.destination}</div>
                                                                    <div style={{ fontSize: '0.8rem', marginTop: '5px', color: 'var(--text-secondary)' }}>
                                                                        {Math.round(order.distanceKm || 0)} Km | {order.travelHours} hs est.
                                                                    </div>
                                                                </div>

                                                                {order.driverName && (
                                                                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '15px' }}>
                                                                        <div className="glass-label" style={{ fontSize: '0.6rem' }}>🚚 CHOFER ASIGNADO</div>
                                                                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{order.driverName}</div>
                                                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{order.licensePlate} | {order.driverPhone}</div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex-col gap-10">
                                                                <div className="glass-label" style={{ fontSize: '0.6rem' }}>⚙️ OPERACIONES</div>
                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px' }}>
                                                                    {order.status === 'PENDING' && <button className="glass-button" onClick={() => updateStatus(order.id, 'APPROVED')} style={{ background: '#3b82f6', fontWeight: '800', fontSize: '0.75rem' }}>✅ APROBAR PRESUPUESTO</button>}
                                                                    {order.status === 'APPROVED' && <button className="glass-button" onClick={() => updateStatus(order.id, 'CONFIRMED')} style={{ background: '#10b981', fontWeight: '800', fontSize: '0.75rem' }}>📅 PROGRAMAR (PENDIENTE)</button>}
                                                                    {order.status === 'CONFIRMED' && <button className="glass-button" onClick={() => updateStatus(order.id, 'STARTED')} style={{ background: 'var(--accent-gradient)', fontWeight: '800', fontSize: '0.75rem' }}>🚀 INICIAR VIAJE</button>}
                                                                    {order.status === 'STARTED' && <button className="glass-button" onClick={() => updateStatus(order.id, 'FINISHED')} style={{ background: '#8b5cf6', fontWeight: '800', fontSize: '0.75rem' }}>🏁 FINALIZAR VIAJE</button>}
                                                                    {order.status === 'FINISHED' && (
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                                            <button className="glass-button" onClick={() => { handleEditClick(order); setActiveTab('ADJUST'); }} style={{ background: 'var(--accent-gradient)', fontWeight: '800', fontSize: '0.75rem' }}>💰 AJUSTAR PRECIO FINAL</button>
                                                                            <button className="glass-button" onClick={() => updateStatus(order.id, 'INVOICED')} style={{ background: '#ec4899', fontWeight: '800', fontSize: '0.75rem' }}>📄 MARCAR FACTURADO</button>
                                                                        </div>
                                                                    )}
                                                                    {order.status === 'INVOICED' && <button className="glass-button" onClick={() => updateStatus(order.id, 'PAID')} style={{ background: '#059669', fontWeight: '800', fontSize: '0.75rem' }}>💰 MARCAR COBRADO</button>}
                                                                </div>

                                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '5px' }}>
                                                                    <button className="glass-button" onClick={() => handleEditClick(order)} style={{ fontSize: '0.75rem', padding: '10px' }}>✏️ Editar</button>
                                                                    <button className="glass-button" onClick={() => confirmDeleteOrder(order.id, order.customerName)} style={{ fontSize: '0.75rem', padding: '10px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>🗑️ Borrar</button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Activity History Section */}
                                                        {order.activityLog && order.activityLog.length > 0 && (
                                                            <div style={{ padding: '0 20px 20px' }}>
                                                                <div className="glass-label" style={{ fontSize: '0.6rem', marginBottom: '15px' }}>📜 HISTORIAL DE ACTIVIDAD</div>
                                                                <div className="flex-col gap-10">
                                                                    {order.activityLog.slice().reverse().map((log: any, idx: number) => (
                                                                        <div key={idx} className="flex gap-15 items-start p-10 rounded-12" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                                            <div style={{
                                                                                width: '32px',
                                                                                height: '32px',
                                                                                borderRadius: '50%',
                                                                                background: 'rgba(255,255,255,0.05)',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                fontSize: '0.9rem',
                                                                                flexShrink: 0
                                                                            }}>
                                                                                {log.type === 'CREATED' ? '✨' :
                                                                                    log.type === 'APPROVED' ? '✅' :
                                                                                        log.type === 'CONFIRMED' ? '📅' :
                                                                                            log.type === 'STARTED' ? '🚀' :
                                                                                                log.type === 'FINISHED' ? '🏁' :
                                                                                                    log.type === 'INVOICED' ? '📄' :
                                                                                                        log.type === 'PAID' ? '💰' : '📝'}
                                                                            </div>
                                                                            <div className="flex-col" style={{ flex: 1 }}>
                                                                                <div className="flex justify-between items-center">
                                                                                    <span className="text-white text-bold" style={{ fontSize: '0.8rem' }}>{log.label}</span>
                                                                                    <span className="text-secondary text-xs">{new Date(log.time).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}hs</span>
                                                                                </div>
                                                                                {log.observations_fallback && (
                                                                                    <div className="text-secondary text-xs mt-4">Obs: {log.observations_fallback}</div>
                                                                                )}
                                                                                {log.user && (
                                                                                    <div className="text-accent text-xs mt-2" style={{ opacity: 0.7 }}>Acción por: {log.user}</div>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
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
            {editingOrder ? (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(15px)' }}>
                    <div className="glass-panel" style={{ width: '95%', maxWidth: '800px', padding: '25px', maxHeight: '95vh', overflowY: 'auto' }}>
                        <div className="flex justify-between items-center mb-20">
                            <h2 style={{ fontSize: '1.2rem' }}>Editar Pedido <span style={{ fontFamily: 'monospace', opacity: 0.5 }}>{editingOrder.id.substring(0, 8)}</span></h2>
                            <button className="filter-btn" onClick={() => setEditingOrder(null)}>✕</button>
                        </div>

                        {/* Tab Navigation */}
                        <div className="filter-group" style={{ marginBottom: '25px', display: 'flex', overflowX: 'auto', gap: '5px', paddingBottom: '10px' }}>
                            <button className={`filter-btn ${activeTab === 'CLIENT' ? 'active' : ''}`} onClick={() => setActiveTab('CLIENT')} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>👤 Cliente e IVA</button>
                            <button className={`filter-btn ${activeTab === 'ROUTE' ? 'active' : ''}`} onClick={() => setActiveTab('ROUTE')} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>📍 Ruta y Precio</button>
                            <button className={`filter-btn ${activeTab === 'LOGISTICS' ? 'active' : ''}`} onClick={() => setActiveTab('LOGISTICS')} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}>🚚 Chofer y Logística</button>
                            {(editingOrder.status === 'FINISHED' || editingOrder.status === 'INVOICED' || editingOrder.status === 'PAID') && (
                                <button className={`filter-btn ${activeTab === 'ADJUST' ? 'active' : ''}`} onClick={() => setActiveTab('ADJUST')} style={{ fontSize: '0.75rem', whiteSpace: 'nowrap', border: '1px solid var(--accent-color)' }}>💰 ADJUSTE FINAL</button>
                            )}
                        </div>

                        {/* TAB: CLIENT */}
                        {activeTab === 'CLIENT' && (
                            <div className="flex-col gap-20">
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                                    <div>
                                        <label className="glass-label">Nombre Cliente</label>
                                        <input type="text" className="glass-input" value={editForm.customerName} onChange={e => setEditForm(p => ({ ...p, customerName: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="glass-label">Email</label>
                                        <input type="email" className="glass-input" value={editForm.customerEmail} onChange={e => setEditForm(p => ({ ...p, customerEmail: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="glass-label">Teléfono</label>
                                        <input type="tel" className="glass-input" value={editForm.customerPhone} onChange={e => setEditForm(p => ({ ...p, customerPhone: e.target.value }))} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
                                    <div>
                                        <label className="glass-label">CUIT</label>
                                        <input type="text" className="glass-input" value={editForm.cuit} onChange={e => setEditForm(p => ({ ...p, cuit: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="glass-label">Condición IVA</label>
                                        <select
                                            className="glass-input"
                                            value={editForm.taxStatus}
                                            onChange={e => setEditForm(p => ({ ...p, taxStatus: e.target.value }))}
                                            style={{ color: 'white' }}
                                        >
                                            <option value="">Seleccionar...</option>
                                            <option value="responsable_inscripto">Responsable Inscripto</option>
                                            <option value="monotributo">Monotributo</option>
                                            <option value="exento">Exento</option>
                                            <option value="consumidor_final">Consumidor Final</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="glass-label">Observaciones Internas</label>
                                    <textarea className="glass-input" style={{ minHeight: '80px', paddingTop: '10px' }} value={editForm.observations} onChange={e => setEditForm(p => ({ ...p, observations: e.target.value }))} />
                                </div>
                            </div>
                        )}

                        {/* TAB: ROUTE */}
                        {activeTab === 'ROUTE' && (
                            <div className="flex-col gap-20">
                                <div style={{ display: 'grid', gap: '15px' }}>
                                    <div>
                                        <label className="glass-label">Origen (direcciones separadas por | )</label>
                                        <input type="text" className="glass-input" value={editForm.origin} onChange={e => setEditForm(p => ({ ...p, origin: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="glass-label">Destino Final</label>
                                        <input type="text" className="glass-input" value={editForm.destination} onChange={e => setEditForm(p => ({ ...p, destination: e.target.value }))} />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px' }}>
                                    <div>
                                        <label className="glass-label">Fecha</label>
                                        <input type="date" className="glass-input" value={editForm.travelDate} onChange={e => setEditForm(p => ({ ...p, travelDate: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="glass-label">Franja Horaria</label>
                                        <select className="glass-input" value={editForm.travelTime} onChange={e => setEditForm(p => ({ ...p, travelTime: e.target.value }))} style={{ background: 'var(--body-bg)', color: 'white' }}>
                                            <option value="manana">Mañana</option>
                                            <option value="mediodia">Medio día</option>
                                            <option value="tarde">Tarde</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="glass-label">Vehículo(s)</label>
                                        <input type="text" className="glass-input" value={editForm.vehicle} onChange={e => setEditForm(p => ({ ...p, vehicle: e.target.value }))} />
                                    </div>
                                </div>

                                <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.2)', padding: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <h3 style={{ fontSize: '0.8rem', color: 'var(--accent-color)' }}>💰 AJUSTE DE PRECIO</h3>
                                        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>${editForm.price.toLocaleString('es-AR')}</div>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                        <div>
                                            <label className="glass-label">Distancia (Km)</label>
                                            <input type="number" className="glass-input" value={editForm.distanceKm} onChange={e => {
                                                const km = Number(e.target.value);
                                                setEditForm(p => {
                                                    const newState = { ...p, distanceKm: km };
                                                    const mainVehicle = p.vehicle.split('x ').length > 1 ? p.vehicle.split('x ')[1].trim() : p.vehicle;
                                                    const vData = (vehiclesData as any[]).find(v => v.name === mainVehicle || v.id === p.vehicle);
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
                                            <label className="glass-label">Horas Estimadas</label>
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

                                    <div style={{ marginTop: '15px' }}>
                                        <label className="glass-label">Precio Final Forzado ($)</label>
                                        <input type="number" className="glass-input" value={editForm.price} onChange={e => setEditForm(p => ({ ...p, price: Number(e.target.value) }))} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: LOGISTICS */}
                        {activeTab === 'LOGISTICS' && (
                            <div className="flex-col gap-20">
                                <h3 className="text-success" style={{ fontSize: '0.85rem' }}>🚚 ASIGNACIÓN DE CHOFER</h3>
                                <div className="toggle-group p-5" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                                    <button
                                        type="button"
                                        className={`toggle-btn ${!editForm.driverName ? 'active' : ''}`}
                                        onClick={() => setEditForm(p => ({ ...p, driverName: '', driverPhone: '', licensePlate: '' }))}
                                        style={{ minWidth: '80px', padding: '10px', fontSize: '0.75rem' }}
                                    >
                                        ❌ Sin Chofer
                                    </button>
                                    {drivers.map(d => (
                                        <button
                                            key={d.id}
                                            type="button"
                                            className={`toggle-btn ${editForm.driverName === d.name ? 'active' : ''}`}
                                            onClick={() => setEditForm(p => ({ ...p, driverName: d.name, driverPhone: d.phone, licensePlate: d.license_plate }))}
                                            style={{ minWidth: '80px', padding: '10px', fontSize: '0.75rem' }}
                                        >
                                            {d.name}
                                        </button>
                                    ))}
                                </div>

                                <div className="grid-cols-auto">
                                    <div>
                                        <label className="glass-label">Chofer</label>
                                        <input type="text" className="glass-input" value={editForm.driverName} onChange={e => setEditForm(p => ({ ...p, driverName: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="glass-label">Patente</label>
                                        <input type="text" className="glass-input" value={editForm.licensePlate} onChange={e => setEditForm(p => ({ ...p, licensePlate: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="glass-label">Teléfono Chofer</label>
                                        <input type="tel" className="glass-input" value={editForm.driverPhone} onChange={e => setEditForm(p => ({ ...p, driverPhone: e.target.value }))} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* TAB: ADJUST */}
                        {activeTab === 'ADJUST' && editingOrder && (
                            <div className="flex-col gap-20">
                                <h3 className="text-accent" style={{ fontSize: '0.85rem' }}>💰 AJUSTE DE CUENTAS FINAL</h3>

                                <div className="glass-panel" style={{ background: 'rgba(0,0,0,0.3)', padding: '20px' }}>
                                    <div className="flex justify-between items-center mb-10 pb-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span className="text-secondary">Precio Base Pactado:</span>
                                        <span style={{ fontWeight: 'bold' }}>${editingOrder.price.toLocaleString('es-AR')}</span>
                                    </div>

                                    <div className="flex justify-between items-center mb-20 pb-10" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <span className="text-secondary">Tiempo de Espera ({editForm.waitingMinutes} min):</span>
                                        <span className="text-warning">
                                            + ${Math.round((editForm.waitingMinutes / 60) * (vehiclesData.find(v => v.name.toLowerCase() === editingOrder.vehicle.toLowerCase() || v.id === editingOrder.vehicle)?.priceWaitHour || 0)).toLocaleString('es-AR')}
                                        </span>
                                    </div>

                                    <div className="flex-col gap-10">
                                        <label className="glass-label">Horas de Espera / Demoas (minutos)</label>
                                        <input
                                            type="number"
                                            className="glass-input"
                                            value={editForm.waitingMinutes}
                                            onChange={e => setEditForm(p => ({ ...p, waitingMinutes: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>

                                    <div className="flex-col gap-10 mt-15">
                                        <label className="glass-label">Observaciones de cobro / Extras</label>
                                        <textarea
                                            className="glass-input"
                                            placeholder="Ej: Peajes, carga extra, etc."
                                            value={editForm.observations}
                                            onChange={e => setEditForm(p => ({ ...p, observations: e.target.value }))}
                                            style={{ minHeight: '60px' }}
                                        />
                                    </div>

                                    <div className="flex-col gap-10 mt-15">
                                        <label className="glass-label">Precio Final a Cobrar ($)</label>
                                        <input
                                            type="number"
                                            className="glass-input"
                                            value={editForm.price}
                                            onChange={e => setEditForm(p => ({ ...p, price: parseInt(e.target.value) || 0 }))}
                                            style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--success-color)', border: '1px solid var(--success-color)' }}
                                        />
                                    </div>

                                    <div className="mt-20 p-15 rounded-12" style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                                        <p style={{ fontSize: '0.8rem', textAlign: 'center', margin: 0 }}>
                                            Este precio es el que figurará en el resumen del cliente.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-20 p-20" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                            <div className="flex gap-10">
                                <button className="glass-button flex-1" style={{ background: 'rgba(255,255,255,0.05)' }} onClick={() => setEditingOrder(null)}>Cancelar</button>
                                <button className="glass-button flex-2" style={{ fontWeight: 'bold' }} onClick={handleSaveEdit} disabled={saving}>
                                    {saving ? 'Guardando...' : '💾 GUARDAR CAMBIOS'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
            <InstallPrompt />
        </div>
    );
}
