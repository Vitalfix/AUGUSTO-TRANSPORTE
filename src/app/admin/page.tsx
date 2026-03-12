"use client";

import { useState, useEffect, useCallback } from 'react';
import InstallPrompt from '@/components/InstallPrompt';
import AdminHeader from '@/components/AdminHeader';

import { Order, Driver, VehiclePricing, ActivityLog, PricingBreakdownItem } from '@/lib/types';

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

const renderInLines = (text: string | undefined, separator: string | RegExp = /[|,]/) => {
    if (!text) return null;
    return text.split(separator).filter(Boolean).map((t, i) => (
        <div key={i} className="block mb-4">{t.trim()}</div>
    ));
};


export default function AdminPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [loginLoading, setLoginLoading] = useState(false);
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [activeTab, setActiveTab] = useState<'ROUTE' | 'LOGISTICS' | 'ADJUST'>('ROUTE');
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
        waitingMinutes: 0,
        estadiaAmount: 0,
        estadiaQty: 0,
        estadiaPrice: 0,
        esperaAmount: 0,
        esperaQty: 0,
        esperaPrice: 0,
        ayudantesAmount: 0,
        ayudantesQty: 0,
        ayudantesPrice: 0,
        adjustComments: ''
    });
    const [vehiclesData, setVehiclesData] = useState<VehiclePricing[]>([]);
    const [saving, setSaving] = useState(false);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [expandedOrders, setExpandedOrders] = useState<string[]>([]);
    const [showExtraFields, setShowExtraFields] = useState(false);

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
    console.log("Stats Loaded:", stats); // Using it to avoid unused warning

    const filteredOrders = orders.filter(o => {
        const name = o.customer_name || o.customerName || '';
        const matchesSearch = o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            name.toLowerCase().includes(searchTerm.toLowerCase());
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

    const handleUpdateCustomerProfile = async (orderId: string, profileData: ActivityLog['newData']) => {
        if (!profileData || !profileData.customer_id) return;
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
                    id: profileData.customer_id,
                    phone: profileData.phone,
                    email: profileData.email,
                    cuit: profileData.cuit,
                    taxStatus: profileData.tax_status
                })
            });

            if (!resCust.ok) throw new Error("Error al actualizar cliente");

            // 2. Clean up activity log (remove the pending entry)
            const order = orders.find(o => o.id === orderId);
            if (order) {
                const log = order.activity_log || order.activityLog || [];
                const newLog = log.filter((l: ActivityLog) => l.type !== 'CUSTOMER_UPDATE_PENDING');
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
                const log = order.activity_log || order.activityLog || [];
                const newLog = log.filter((l: ActivityLog) => l.type !== 'CUSTOMER_UPDATE_PENDING');
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
        const name = order.customer_name || order.customerName || '';
        const phone = order.customer_phone || order.customerPhone || '';
        const message = `¡Hola ${name}! 🚚 Tu pedido de EL CASAL ha sido confirmado y programado. Podes ver los detalles y seguir el estado aquí: ${url}`;
        const encoded = encodeURIComponent(message);
        const win = window.open(`https://wa.me/${phone.replace(/\D/g, '')}?text=${encoded}`, '_blank');
        if (win) win.focus();
    };


    if (!isAuthenticated) {
        return (
            <div className="page-container">
                <div className="admin-login-container">
                    <div className="admin-login-panel glass-panel">
                        <div className="home-icon-lg">🚚</div>
                        <h2 className="text-gradient mb-20">Panel EL CASAL</h2>
                        <p className="text-secondary mb-30 text-sm">Ingresá la Contraseña Maestra (Admin).</p>
                        <form onSubmit={handleLogin} method="POST">
                            <input
                                type="password"
                                className="glass-input mb-20 text-center"
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button type="submit" className="glass-button w-full p-15" disabled={loginLoading}>
                                {loginLoading ? 'Validando...' : 'Ingresar'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    const handleEditClick = (order: Order) => {
        setEditingOrder(order);
        setShowExtraFields(false);
        setEditForm({
            price: order.price,
            driverName: order.driver_name || order.driverName || '',
            driverPhone: order.driver_phone || order.driverPhone || '',
            licensePlate: order.license_plate || order.licensePlate || '',
            customerName: order.customer_name || order.customerName || '',
            customerEmail: order.customer_email || order.customerEmail || '',
            customerPhone: order.customer_phone || order.customerPhone || '',
            cuit: order.cuit || '',
            taxStatus: order.tax_status || order.taxStatus || '',
            observations: order.observations || '',
            origin: order.origin || '',
            destination: order.destination || '',
            vehicle: order.vehicle || '',
            travelDate: order.travel_date || order.travelDate || '',
            travelTime: order.travel_time || order.travelTime || '',
            distanceKm: order.distance_km || order.distanceKm || 0,
            travelHours: order.travel_hours || order.travelHours || 0,
            waitingMinutes: order.waiting_minutes || order.waitingMinutes || 0,
            estadiaAmount: order.estadia_amount || order.estadiaAmount || 0,
            estadiaQty: order.estadia_qty || order.estadiaQty || 0,
            estadiaPrice: order.estadia_price || order.estadiaPrice || 0,
            esperaAmount: order.espera_amount || order.esperaAmount || 0,
            esperaQty: order.espera_qty || order.esperaQty || 0,
            esperaPrice: order.espera_price || order.esperaPrice || 0,
            ayudantesAmount: order.ayudantes_amount || order.ayudantesAmount || 0,
            ayudantesQty: order.ayudantes_qty || order.ayudantesQty || 0,
            ayudantesPrice: order.ayudantes_price || order.ayudantesPrice || 0,
            adjustComments: order.adjust_comments || order.adjustComments || ''
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
        <div className="page-container p-10">
            <AdminHeader title="Control de Viajes" showBack backHref="/" />

            {/* Search and Filters Elite */}
            <div className="glass-panel p-15 mb-20">
                <div className="search-bar mb-15">
                    <input
                        type="text"
                        placeholder="Buscar por ID o Cliente..."
                        className="glass-input flex-1"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="admin-tabs-container mt-10">
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
                                className={`filter-btn status-${s.id.toLowerCase()} ${filterStatus === s.id ? 'active' : ''}`}
                                onClick={() => setFilterStatus(s.id as Order['status'] | 'ALL')}
                            >
                                {s.label} <span className="opacity-60 ml-5">{count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {loading ? (
                <div className="text-center p-50 text-secondary">Cargando órdenes de compra...</div>
            ) : filteredOrders.length === 0 ? (
                <div className="glass-panel text-center p-60">
                    <div className="text-5xl mb-15">📭</div>
                    <h3 className="text-lg text-secondary">No hay viajes registrados aún</h3>
                    <p className="mt-10 text-secondary opacity-70">
                        Las órdenes creadas por los clientes aparecerán aquí automáticamente.
                    </p>
                </div>
            ) : (
                <div className="admin-orders-board">
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
                                <h2 className="status-section-header" style={{ color: group.color }}>
                                    {group.label}
                                    <span className="badge bg-white-05 text-secondary">{groupOrders.length}</span>
                                </h2>
                                <div className="status-orders-grid">
                                    {groupOrders.map(order => {
                                        const isExpanded = expandedOrders.includes(order.id);

                                        return (
                                            <div
                                                key={order.id}
                                                className="glass-panel animate-fade-in over-hidden mb-10 admin-order-card"
                                                style={{ borderLeftColor: group.color }}
                                            >
                                                <div
                                                    className="pointer"
                                                    onClick={() => toggleExpand(order.id)}
                                                >
                                                    <div className="flex justify-between items-start w-full p-15">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-10 mb-8 flex-wrap">
                                                                <span className="text-white text-lg font-extrabold">{order.customer_name || order.customerName}</span>
                                                                <div
                                                                    className="badge"
                                                                    style={{
                                                                        backgroundColor: `${group.color}22`,
                                                                        color: group.color,
                                                                        border: `1px solid ${group.color}44`
                                                                    }}
                                                                >
                                                                    {group.label.split(' ')[1] || group.label}
                                                                </div>
                                                            </div>
                                                            <div className="flex gap-15 flex-wrap">
                                                                <span className="text-secondary text-xs font-mono">#{order.id.substring(0, 8)}</span>
                                                                <span className="text-accent text-xs font-semibold">📅 {order.travel_date || order.travelDate || 'Pendiente'}</span>
                                                                <div className="text-secondary text-xs flex gap-5">
                                                                    <span>🚛</span>
                                                                    <div className="flex-col">
                                                                        {renderInLines(formatVehicle(order.vehicle))}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="text-right min-w-100">
                                                            <div className="text-xl font-black mb-4" style={{ color: group.color }}>
                                                                ${Math.round(order.price || 0).toLocaleString('es-AR')}
                                                            </div>
                                                            <div className="flex items-center justify-end gap-4 text-success text-xs">
                                                                {order.driver_name || order.driverName ? (
                                                                    <>🚚 <span className="font-semibold">{order.driver_name || order.driverName}</span></>
                                                                ) : (
                                                                    <>⏳ <span className="opacity-70">Sin chofer</span></>
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
                                                        {/* Status Timeline Elite */}
                                                        <div className="status-timeline-container">
                                                            {(() => {
                                                                const allS = ['PENDING', 'APPROVED', 'CONFIRMED', 'STARTED', 'FINISHED', 'INVOICED', 'PAID'];
                                                                const labels: Record<string, string> = { 'PENDING': 'NUEVO', 'APPROVED': 'APROBADO', 'CONFIRMED': 'PENDIENTE', 'STARTED': 'EN CURSO', 'FINISHED': 'FINALIZADO', 'INVOICED': 'FACTURADO', 'PAID': 'COBRADO' };
                                                                const currIdx = allS.indexOf(order.status);
                                                                const startIdx = Math.max(0, currIdx - 1);
                                                                const endIdx = Math.min(allS.length - 1, currIdx + 1);
                                                                
                                                                let displayIdxs = [];
                                                                if (currIdx === 0) displayIdxs = [0, 1, 2];
                                                                else if (currIdx === allS.length - 1) displayIdxs = [currIdx - 2, currIdx - 1, currIdx];
                                                                else displayIdxs = [startIdx, currIdx, endIdx];

                                                                return displayIdxs.map((idx, i) => {
                                                                    const s = allS[idx];
                                                                    const isCurrent = idx === currIdx;
                                                                    const isCompleted = idx <= currIdx;
                                                                    const isLast = i === displayIdxs.length - 1;

                                                                    return (
                                                                        <div key={s} className={`timeline-step ${isCurrent ? 'scale-110' : ''}`}>
                                                                            <div 
                                                                                className="timeline-dot" 
                                                                                style={{ 
                                                                                    backgroundColor: isCompleted ? group.color : 'rgba(255,255,255,0.2)',
                                                                                    boxShadow: isCurrent ? `0 0 15px ${group.color}` : 'none',
                                                                                    border: isCurrent ? '2px solid white' : 'none'
                                                                                }} 
                                                                            />
                                                                            <div className={`text-center mt-6 text-xs transition-opacity ${isCurrent ? 'font-bold opacity-100' : 'opacity-60'} ${isCompleted ? 'text-white' : 'text-secondary'}`}>
                                                                                {labels[s]}
                                                                            </div>
                                                                            {!isLast && (
                                                                                <div className="timeline-line" style={{ backgroundColor: idx < currIdx ? group.color : 'rgba(255,255,255,0.1)' }} />
                                                                            )}
                                                                        </div>
                                                                    );
                                                                });
                                                            })()}
                                                        </div>
                                                        {(() => {
                                                            const log = order.activity_log || order.activityLog || [];
                                                            const pendingUpdate = log.find((l: ActivityLog) => l.type === 'CUSTOMER_UPDATE_PENDING');
                                                            if (pendingUpdate) {
                                                                return (
                                                                    <div className="bg-error-10 border-error p-15 rounded-12 m-20">
                                                                        <div className="flex justify-between items-center flex-wrap gap-15">
                                                                            <div>
                                                                                <strong className="text-error">⚠️ Cambio en datos de facturación:</strong>
                                                                                <ul className="ml-20 mt-10 text-xs">
                                                                                    {pendingUpdate.newData?.phone && <li>Teléfono: {pendingUpdate.newData.phone}</li>}
                                                                                    {pendingUpdate.newData?.email && <li>Email: {pendingUpdate.newData.email}</li>}
                                                                                    {pendingUpdate.newData?.cuit && <li>CUIT: {pendingUpdate.newData.cuit}</li>}
                                                                                    {pendingUpdate.newData?.tax_status && <li>IVA: {pendingUpdate.newData.tax_status}</li>}
                                                                                </ul>
                                                                            </div>
                                                                            <div className="flex gap-10 flex-wrap">
                                                                                <button className="glass-button bg-success font-bold" onClick={() => handleUpdateCustomerProfile(order.id, pendingUpdate.newData)}>✅ Actualizar</button>
                                                                                <button className="glass-button bg-white-10" onClick={() => handleRejectCustomerUpdate(order.id)}>Ignorar</button>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            return null;
                                                        })()}

                                                        {/* Pricing Breakdown Elite */}
                                                        {(() => {
                                                            const breakdown = order.pricing_breakdown || order.pricingBreakdown || [];
                                                            if (breakdown.length === 0) return null;
                                                            return (
                                                                <div className="px-20 pb-15">
                                                                    <div className="glass-panel p-15 bg-blue-05 border-blue-20">
                                                                        <div className="glass-label text-xs text-blue-400 mb-10">📊 DETALLE DEL PRESUPUESTO</div>
                                                                        <table className="pricing-table">
                                                                            <thead>
                                                                                <tr className="text-secondary">
                                                                                    <th className="text-left py-5">Vehículo</th>
                                                                                    <th className="text-center py-5">Cant.</th>
                                                                                    <th className="text-right py-5">P.Unit</th>
                                                                                    <th className="text-right py-5">{breakdown[0]?.type === 'KM' ? 'Km' : 'Hs'}</th>
                                                                                    <th className="text-right py-5">Subtotal</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {breakdown.map((item: PricingBreakdownItem, idx: number) => (
                                                                                    <tr key={idx}>
                                                                                        <td className="py-8">
                                                                                            <div className="font-bold">{item.name}</div>
                                                                                            <div className="text-xs opacity-60">{item.type === 'KM' ? 'Tarifa por Km' : 'Tarifa por Hora'}</div>
                                                                                        </td>
                                                                                        <td className="text-center py-8">{item.qty}</td>
                                                                                        <td className="text-right py-8">${Math.round(item.unitPrice || 0).toLocaleString('es-AR')}</td>
                                                                                        <td className="text-right py-8">{Math.round(item.factor || 0)}</td>
                                                                                        <td className="text-right py-8 font-bold text-white">${Math.round(item.subtotal || 0).toLocaleString('es-AR')}</td>
                                                                                    </tr>
                                                                                ))}
                                                                                <tr className="bg-white-02">
                                                                                    <td colSpan={4} className="text-right p-12 text-secondary text-xs font-bold">TOTAL:</td>
                                                                                    <td className="text-right p-12 font-black text-blue-400 text-lg">${Math.round(order.price || 0).toLocaleString('es-AR')}</td>
                                                                                </tr>
                                                                            </tbody>
                                                                        </table>
                                                                        <div className="text-xs mt-5 opacity-50 italic text-right">
                                                                            * Presupuesto basado en {Math.round(order.distance_km || order.distanceKm || 0)} Km y {order.travel_hours || order.travelHours || 0} Hs.
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        <div className="p-20 admin-form-grid">
                                                            <div className="flex-col gap-15">
                                                                <div>
                                                                    <div className="glass-label text-xs">📟 INFORMACIÓN DE CARGA</div>
                                                                    <div className="text-sm mt-10 flex gap-5">
                                                                        <strong>Vehículo:</strong>
                                                                        <div className="flex-col">{renderInLines(formatVehicle(order.vehicle))}</div>
                                                                    </div>
                                                                    <div className="text-sm"><strong>Fecha:</strong> {order.travel_date || order.travelDate} ({order.travel_time || order.travelTime})</div>
                                                                    {order.observations && (
                                                                        <div className="text-xs mt-10 p-10 bg-black-20 rounded-8 border-l-3" style={{ borderLeftColor: group.color }}>
                                                                            <strong>Obs:</strong> {order.observations}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                <div className="border-t-glass pt-15">
                                                                    <div className="glass-label text-xs">👤 CONTACTO</div>
                                                                    <div className="text-sm">{order.customer_email || order.customerEmail}</div>
                                                                    <div className="text-sm">{order.customer_phone || order.customerPhone}</div>
                                                                    {order.cuit && <div className="text-sm mt-5"><strong>CUIT:</strong> {order.cuit}</div>}
                                                                    {order.tax_status && <div className="text-sm"><strong>Condición:</strong> {order.tax_status}</div>}
                                                                </div>
                                                            </div>

                                                            <div className="flex-col gap-15">
                                                                <div>
                                                                    <div className="glass-label text-xs">📍 RUTA</div>
                                                                    <div className="text-sm mt-5 flex gap-5">
                                                                        <strong>Origen:</strong>
                                                                        <div className="flex-col">{renderInLines(order.origin)}</div>
                                                                    </div>
                                                                    <div className="text-sm mt-5 flex gap-5">
                                                                        <strong>Destino:</strong>
                                                                        <div className="flex-col">{renderInLines(order.destination)}</div>
                                                                    </div>
                                                                    <div className="text-xs mt-5 text-secondary">
                                                                        {Math.round(order.distance_km || order.distanceKm || 0)} Km | {order.travel_hours || order.travelHours || 0} hs est.
                                                                    </div>
                                                                </div>

                                                                {(order.driver_name || order.driverName) && (
                                                                    <div className="border-t-glass pt-15">
                                                                        <div className="glass-label text-xs">🚚 CHOFER ASIGNADO</div>
                                                                        <div className="text-sm font-bold">{order.driver_name || order.driverName}</div>
                                                                        <div className="text-xs text-secondary">{order.license_plate || order.licensePlate} | {order.driver_phone || order.driverPhone}</div>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            <div className="flex-col gap-10">
                                                                <div className="glass-label text-xs">⚙️ OPERACIONES</div>
                                                                <div className="flex-col gap-8">
                                                                    {order.status === 'PENDING' && <button className="glass-button bg-blue font-bold text-xs" onClick={() => updateStatus(order.id, 'APPROVED')}>✅ APROBAR PRESUPUESTO</button>}
                                                                    {order.status === 'APPROVED' && <button className="glass-button bg-success font-bold text-xs" onClick={() => updateStatus(order.id, 'CONFIRMED')}>📅 PROGRAMAR (PENDIENTE)</button>}
                                                                    {order.status === 'CONFIRMED' && <button className="glass-button bg-accent-gradient font-bold text-xs" onClick={() => updateStatus(order.id, 'STARTED')}>🚀 INICIAR VIAJE</button>}
                                                                    {order.status === 'STARTED' && <button className="glass-button bg-purple font-bold text-xs" onClick={() => updateStatus(order.id, 'FINISHED')}>🏁 FINALIZAR VIAJE</button>}
                                                                    {order.status === 'FINISHED' && (
                                                                        <div className="flex-col gap-8">
                                                                            <button className="glass-button bg-accent-gradient font-bold text-xs" onClick={() => { handleEditClick(order); setActiveTab('ADJUST'); }}>💰 AJUSTAR PRECIO FINAL</button>
                                                                            <button className="glass-button bg-pink font-bold text-xs" onClick={() => updateStatus(order.id, 'INVOICED')}>📄 MARCAR FACTURADO</button>
                                                                        </div>
                                                                    )}
                                                                    {order.status === 'INVOICED' && <button className="glass-button bg-success-dark font-bold text-xs" onClick={() => updateStatus(order.id, 'PAID')}>💰 MARCAR COBRADO</button>}
                                                                    <button className="glass-button bg-success font-bold text-xs" onClick={() => sendWhatsApp(order)}>🟢 ENVIAR SEGUIMIENTO WA</button>
                                                                </div>

                                                                <div className="admin-form-grid mt-5" style={{ gap: '8px' }}>
                                                                    <button className="glass-button text-xs p-10" onClick={() => handleEditClick(order)}>✏️ Editar</button>
                                                                    <button className="glass-button text-xs p-10 bg-error-20 text-error" onClick={() => confirmDeleteOrder(order.id, order.customer_name || order.customerName || '')}>🗑️ Borrar</button>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Activity History Elite */}
                                                        {(() => {
                                                            const log = order.activity_log || order.activityLog || [];
                                                            if (log.length === 0) return null;
                                                            return (
                                                                <div className="px-20 pb-20">
                                                                    <div className="glass-label text-xs mb-15">📜 HISTORIAL DE ACTIVIDAD</div>
                                                                    <div className="flex-col gap-10">
                                                                        {log.slice().reverse().map((item: ActivityLog, idx: number) => (
                                                                            <div key={idx} className="flex gap-15 items-start p-10 rounded-12 bg-white-03 border-glass">
                                                                                <div className="w-32 h-32 rounded-full bg-white-05 flex items-center justify-center text-sm shrink-0">
                                                                                    {item.type === 'CREATED' ? '✨' :
                                                                                        item.type === 'APPROVED' ? '✅' :
                                                                                            item.type === 'CONFIRMED' ? '📅' :
                                                                                                item.type === 'STARTED' ? '🚀' :
                                                                                                    item.type === 'FINISHED' ? '🏁' :
                                                                                                        item.type === 'INVOICED' ? '📄' :
                                                                                                            item.type === 'PAID' ? '💰' : '📝'}
                                                                                </div>
                                                                                <div className="flex-col flex-1">
                                                                                    <div className="flex justify-between items-center">
                                                                                        <span className="text-white font-bold text-xs">{item.label}</span>
                                                                                        <span className="text-secondary text-xs">{new Date(item.time).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}hs</span>
                                                                                    </div>
                                                                                    {item.observations_fallback && <div className="text-secondary text-xs mt-4">Obs: {item.observations_fallback}</div>}
                                                                                    {item.user && <div className="text-accent text-xs mt-2 opacity-70">Acción por: {item.user}</div>}
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
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

            {/* Modal de Edición Elite */}
            {editingOrder && (
                <div className="admin-modal-overlay">
                    <div className="admin-modal-content">
                        <div className="admin-modal-header">
                            <h2 className="text-md">
                                Editar Pedido <span className="font-mono opacity-50">{editingOrder.id.substring(0, 8)}</span>
                            </h2>
                            <button className="filter-btn" onClick={() => setEditingOrder(null)}>✕</button>
                        </div>

                        <div className="admin-modal-body">
                            {/* Tab Navigation Elite */}
                            <div className="admin-tabs-container">
                                <button className={`filter-btn ${activeTab === 'ROUTE' ? 'active' : ''}`} onClick={() => setActiveTab('ROUTE')}>📍 Ruta y Precio</button>
                                <button className={`filter-btn ${activeTab === 'LOGISTICS' ? 'active' : ''}`} onClick={() => setActiveTab('LOGISTICS')}>🚚 Chofer y Logística</button>
                                {(editingOrder.status === 'FINISHED' || editingOrder.status === 'INVOICED' || editingOrder.status === 'PAID') && (
                                    <button className={`filter-btn ${activeTab === 'ADJUST' ? 'active' : ''}`} onClick={() => setActiveTab('ADJUST')} style={{ border: '1px solid var(--accent-color)' }}>💰 AJUSTE FINAL</button>
                                )}
                            </div>


                            {/* TAB: ROUTE */}
                            {activeTab === 'ROUTE' && (
                                <div className="flex-col gap-20 animate-fade-in">
                                    <div className="admin-form-group">
                                        <label className="glass-label">Origen (direcciones separadas por | )</label>
                                        <input type="text" className="glass-input" value={editForm.origin} onChange={e => setEditForm(p => ({ ...p, origin: e.target.value }))} />
                                    </div>
                                    <div className="admin-form-group">
                                        <label className="glass-label">Destino Final</label>
                                        <input type="text" className="glass-input" value={editForm.destination} onChange={e => setEditForm(p => ({ ...p, destination: e.target.value }))} />
                                    </div>

                                    <div className="admin-form-grid">
                                        <div className="admin-form-group">
                                            <label className="glass-label">Fecha</label>
                                            <input type="date" className="glass-input" value={editForm.travelDate} onChange={e => setEditForm(p => ({ ...p, travelDate: e.target.value }))} />
                                        </div>
                                        <div className="admin-form-group">
                                            <label className="glass-label">Franja Horaria</label>
                                            <select className="glass-select" value={editForm.travelTime} onChange={e => setEditForm(p => ({ ...p, travelTime: e.target.value }))}>
                                                <option value="manana">Mañana</option>
                                                <option value="mediodia">Medio día</option>
                                                <option value="tarde">Tarde</option>
                                            </select>
                                        </div>
                                        <div className="admin-form-group">
                                            <label className="glass-label">Vehículo(s)</label>
                                            <div className="flex flex-wrap gap-10 mt-5 p-10 bg-black-20 rounded-12 h-100 overflow-y-auto" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                                                {vehiclesData.map(v => {
                                                    const isSelected = editForm.vehicle.split(',').map(s => s.trim()).includes(v.name);
                                                    return (
                                                        <button
                                                            key={v.id}
                                                            type="button"
                                                            className={`filter-btn text-xs ${isSelected ? 'active' : ''}`}
                                                            style={{ padding: '4px 10px' }}
                                                            onClick={() => {
                                                                const selected = editForm.vehicle.split(',').map(s => s.trim()).filter(Boolean);
                                                                let newList;
                                                                if (isSelected) {
                                                                    newList = selected.filter(s => s !== v.name);
                                                                } else {
                                                                    newList = [...selected, v.name];
                                                                }
                                                                setEditForm(p => ({ ...p, vehicle: newList.join(', ') }));
                                                            }}
                                                        >
                                                            {v.name}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                            <input
                                                type="text"
                                                className="glass-input mt-8 opacity-60 text-xs"
                                                placeholder="Vehículos seleccionados..."
                                                value={editForm.vehicle}
                                                onChange={e => setEditForm(p => ({ ...p, vehicle: e.target.value }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="glass-panel p-20 bg-black-20">
                                        <div className="flex justify-between items-center mb-15">
                                            <h3 className="text-sm text-accent">💰 AJUSTE DE PRECIO</h3>
                                            <div className="text-lg font-bold">${editForm.price.toLocaleString('es-AR')}</div>
                                        </div>

                                        <div className="admin-form-grid">
                                            <div className="admin-form-group">
                                                <label className="glass-label">Distancia (Km)</label>
                                                <input 
                                                    type="number" 
                                                    className="glass-input" 
                                                    value={editForm.distanceKm} 
                                                    onFocus={e => e.target.select()}
                                                    onChange={e => {
                                                        const km = Number(e.target.value);
                                                        setEditForm(p => {
                                                            const newState = { ...p, distanceKm: km };
                                                            const mainVehicle = p.vehicle.split('x ').length > 1 ? p.vehicle.split('x ')[1].trim() : p.vehicle;
                                                            const vData = vehiclesData.find(v => v.name === mainVehicle || v.id === p.vehicle);
                                                            if (vData) {
                                                                const qty = parseInt(p.vehicle.split('x')[0]) || 1;
                                                                if (km <= 100) newState.price = vData.priceHour * p.travelHours * qty;
                                                                else newState.price = vData.priceKm * km * qty;
                                                            }
                                                            return newState;
                                                        });
                                                    }} 
                                                />
                                            </div>
                                            <div className="admin-form-group">
                                                <label className="glass-label">Horas Estimadas</label>
                                                <input 
                                                    type="number" 
                                                    className="glass-input" 
                                                    value={editForm.travelHours} 
                                                    onFocus={e => e.target.select()}
                                                    onChange={e => {
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
                                                    }} 
                                                />
                                            </div>
                                        </div>

                                        <div className="admin-form-group mt-15">
                                            <label className="glass-label">Precio Final Forzado ($)</label>
                                            <input 
                                                type="number" 
                                                className="glass-input" 
                                                value={editForm.price} 
                                                onFocus={e => e.target.select()}
                                                onChange={e => setEditForm(p => ({ ...p, price: Number(e.target.value) }))} 
                                            />
                                        </div>

                                        <div className="mt-20">
                                            <button 
                                                type="button" 
                                                className="glass-button w-full mb-15 flex justify-between items-center" 
                                                style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: 'var(--accent-color)' }}
                                                onClick={() => setShowExtraFields(!showExtraFields)}
                                            >
                                                <span>➕ CARGOS ADICIONALES (Estadía, Espera, Ayudantes)</span>
                                                <span>{showExtraFields ? '🔼' : '🔽'}</span>
                                            </button>

                                            {showExtraFields && (
                                                <div className="p-15 bg-blue-10 rounded-12 border-blue-20 animate-fade-in" style={{ border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                                    <div className="admin-form-grid mb-15">
                                                        <div className="admin-form-group">
                                                            <label className="glass-label text-xs">Estadía (Días)</label>
                                                            <input
                                                                type="number"
                                                                className="glass-input"
                                                                value={editForm.estadiaQty || 0}
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => {
                                                                    const qty = parseInt(e.target.value) || 0;
                                                                    const price = editForm.estadiaPrice || 0;
                                                                    const newAmount = qty * price;
                                                                    setEditForm(p => ({ ...p, estadiaQty: qty, estadiaAmount: newAmount, price: p.price - p.estadiaAmount + newAmount }));
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="admin-form-group">
                                                            <label className="glass-label text-xs">Precio Estadía ($)</label>
                                                            <input
                                                                type="number"
                                                                className="glass-input"
                                                                value={editForm.estadiaPrice || 0}
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => {
                                                                    const price = parseInt(e.target.value) || 0;
                                                                    const qty = editForm.estadiaQty || 0;
                                                                    const newAmount = qty * price;
                                                                    setEditForm(p => ({ ...p, estadiaPrice: price, estadiaAmount: newAmount, price: p.price - p.estadiaAmount + newAmount }));
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="admin-form-grid mb-15">
                                                        <div className="admin-form-group">
                                                            <label className="glass-label text-xs">Espera (Horas)</label>
                                                            <input
                                                                type="number"
                                                                className="glass-input"
                                                                value={editForm.esperaQty || 0}
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => {
                                                                    const qty = parseInt(e.target.value) || 0;
                                                                    const price = editForm.esperaPrice || 0;
                                                                    const newAmount = qty * price;
                                                                    setEditForm(p => ({ ...p, esperaQty: qty, esperaAmount: newAmount, price: p.price - p.esperaAmount + newAmount }));
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="admin-form-group">
                                                            <label className="glass-label text-xs">Precio Espera ($)</label>
                                                            <input
                                                                type="number"
                                                                className="glass-input"
                                                                value={editForm.esperaPrice || 0}
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => {
                                                                    const price = parseInt(e.target.value) || 0;
                                                                    const qty = editForm.esperaQty || 0;
                                                                    const newAmount = qty * price;
                                                                    setEditForm(p => ({ ...p, esperaPrice: price, esperaAmount: newAmount, price: p.price - p.esperaAmount + newAmount }));
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="admin-form-grid">
                                                        <div className="admin-form-group">
                                                            <label className="glass-label text-xs">Ayudantes (Cant)</label>
                                                            <input
                                                                type="number"
                                                                className="glass-input"
                                                                value={editForm.ayudantesQty || 0}
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => {
                                                                    const qty = parseInt(e.target.value) || 0;
                                                                    const price = editForm.ayudantesPrice || 0;
                                                                    const newAmount = qty * price;
                                                                    setEditForm(p => ({ ...p, ayudantesQty: qty, ayudantesAmount: newAmount, price: p.price - p.ayudantesAmount + newAmount }));
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="admin-form-group">
                                                            <label className="glass-label text-xs">Precio Ayudante ($)</label>
                                                            <input
                                                                type="number"
                                                                className="glass-input"
                                                                value={editForm.ayudantesPrice || 0}
                                                                onFocus={e => e.target.select()}
                                                                onChange={e => {
                                                                    const price = parseInt(e.target.value) || 0;
                                                                    const qty = editForm.ayudantesQty || 0;
                                                                    const newAmount = qty * price;
                                                                    setEditForm(p => ({ ...p, ayudantesPrice: price, ayudantesAmount: newAmount, price: p.price - p.ayudantesAmount + newAmount }));
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: LOGISTICS */}
                            {activeTab === 'LOGISTICS' && (
                                <div className="flex-col gap-20 animate-fade-in">
                                    <h3 className="text-success text-sm">🚚 ASIGNACIÓN DE CHOFER</h3>
                                    <div className="toggle-group p-5 h-180 overflow-y-auto">
                                        <button
                                            type="button"
                                            className={`toggle-btn ${!editForm.driverName ? 'active' : ''}`}
                                            onClick={() => setEditForm(p => ({ ...p, driverName: '', driverPhone: '', licensePlate: '' }))}
                                        >
                                            ❌ Sin Chofer
                                        </button>
                                        {drivers.map(d => (
                                            <button
                                                key={d.id}
                                                type="button"
                                                className={`toggle-btn ${editForm.driverName === d.name ? 'active' : ''}`}
                                                onClick={() => setEditForm(p => ({ ...p, driverName: d.name, driverPhone: d.phone, licensePlate: d.license_plate }))}
                                            >
                                                {d.name}
                                            </button>
                                        ))}
                                    </div>

                                    <div className="admin-form-grid">
                                        <div className="admin-form-group">
                                            <label className="glass-label">Chofer</label>
                                            <input
                                                type="text"
                                                className={`glass-input ${editForm.driverName ? 'opacity-70 bg-black-20' : ''}`}
                                                value={editForm.driverName}
                                                onChange={e => setEditForm(p => ({ ...p, driverName: e.target.value }))}
                                                readOnly={!!editForm.driverName}
                                                style={{ cursor: editForm.driverName ? 'not-allowed' : 'text' }}
                                            />
                                            {editForm.driverName && (
                                                <button
                                                    type="button"
                                                    className="text-xs text-secondary mt-5 underline"
                                                    onClick={() => setEditForm(p => ({ ...p, driverName: '', driverPhone: '', licensePlate: '' }))}
                                                >
                                                    ↩️ Cambiar chofer
                                                </button>
                                            )}
                                        </div>
                                        <div className="admin-form-group">
                                            <label className="glass-label">Patente</label>
                                            <input type="text" className="glass-input" value={editForm.licensePlate} onChange={e => setEditForm(p => ({ ...p, licensePlate: e.target.value }))} />
                                        </div>
                                        <div className="admin-form-group">
                                            <label className="glass-label">Teléfono Chofer</label>
                                            <input type="tel" className="glass-input" value={editForm.driverPhone} onChange={e => setEditForm(p => ({ ...p, driverPhone: e.target.value }))} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB: ADJUST */}
                            {activeTab === 'ADJUST' && editingOrder && (
                                <div className="flex-col gap-20 animate-fade-in">
                                    <h3 className="text-accent text-sm">💰 AJUSTE DE CUENTAS FINAL</h3>

                                    <div className="glass-panel p-20 bg-black-30">
                                        <div className="flex justify-between items-center mb-10 pb-10 border-b-glass">
                                            <span className="text-secondary">Precio Base Pactado:</span>
                                            <span className="font-bold">${Math.round(editingOrder.price || 0).toLocaleString('es-AR')}</span>
                                        </div>

                                        <div className="mb-20 p-15 bg-white-03 rounded-12">
                                            <div className="glass-label mb-10 text-accent">➕ SUMAR CARGOS ADICIONALES</div>

                                            <div className="admin-form-grid mb-15">
                                                <div className="admin-form-group">
                                                    <label className="glass-label">Horas de Demora (minutos)</label>
                                                    <input
                                                        type="number"
                                                        className="glass-input"
                                                        value={editForm.waitingMinutes}
                                                        onChange={e => setEditForm(p => ({ ...p, waitingMinutes: parseInt(e.target.value) || 0 }))}
                                                    />
                                                </div>
                                                <div className="flex items-end pb-10 font-bold text-warning">
                                                    + ${Math.round((editForm.waitingMinutes / 60) * (vehiclesData.find(v => v.name.toLowerCase() === editingOrder.vehicle.toLowerCase() || v.id === editingOrder.vehicle)?.priceWaitHour || 0)).toLocaleString('es-AR')}
                                                </div>
                                            </div>

                                            <div className="admin-form-group mt-15 p-10 bg-black-20 rounded-8">
                                                <div className="text-xs text-secondary mb-5">Resumen de Extras (Editables en solapa Ruta):</div>
                                                <div className="flex justify-between text-sm">
                                                    <span>Estadía ({editForm.estadiaQty}):</span>
                                                    <span>${editForm.estadiaAmount?.toLocaleString('es-AR')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span>Espera ({editForm.esperaQty}):</span>
                                                    <span>${editForm.esperaAmount?.toLocaleString('es-AR')}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span>Ayudantes ({editForm.ayudantesQty}):</span>
                                                    <span>${editForm.ayudantesAmount?.toLocaleString('es-AR')}</span>
                                                </div>
                                            </div>

                                            <div className="admin-form-grid">
                                                <div className="admin-form-group">
                                                    <label className="glass-label">Otros conceptos (Peajes, Estacionamiento, etc)</label>
                                                    <input type="text" className="glass-input" placeholder="Concepto..." id="extra-concept" />
                                                </div>
                                                <div className="admin-form-group">
                                                    <label className="glass-label">Monto ($)</label>
                                                    <input type="number" className="glass-input" placeholder="0" id="extra-amount" />
                                                </div>
                                            </div>

                                            <button
                                                className="glass-button mt-10 p-8 text-xs w-auto"
                                                onClick={() => {
                                                    const conceptInput = document.getElementById('extra-concept') as HTMLInputElement;
                                                    const amountInput = document.getElementById('extra-amount') as HTMLInputElement;
                                                    const amount = parseInt(amountInput.value) || 0;
                                                    if (amount > 0) {
                                                        const lines = editForm.observations ? editForm.observations.split('\n') : [];
                                                        const newObs = [...lines, `+ ${conceptInput.value || 'Extra'}: $${amount}`].join('\n');
                                                        setEditForm(p => ({ ...p, observations: newObs, price: p.price + amount }));
                                                        conceptInput.value = ''; amountInput.value = '';
                                                    }
                                                }}
                                            >
                                                ➕ Agregar al Total
                                            </button>
                                        </div>

                                        <div className="admin-form-group mt-15">
                                            <label className="glass-label">Comentarios para el Cliente (llegará por Email)</label>
                                            <textarea
                                                className="glass-input h-100"
                                                placeholder="Ej: Se agregó estadía por lluvia, etc."
                                                value={editForm.adjustComments}
                                                onChange={e => setEditForm(p => ({ ...p, adjustComments: e.target.value }))}
                                            />
                                        </div>

                                        <div className="admin-form-group mt-15">
                                            <label className="glass-label">Notas Internas / Historial Extras</label>
                                            <textarea
                                                className="glass-input h-80"
                                                placeholder="Notas solo para administración..."
                                                value={editForm.observations}
                                                onChange={e => setEditForm(p => ({ ...p, observations: e.target.value }))}
                                            />
                                        </div>

                                        <div className="admin-form-group mt-15">
                                            <label className="glass-label font-bold">PRECIO FINAL A FACTURAR ($)</label>
                                            <div className="relative">
                                                <span className="absolute left-15 top-half transform-y-half font-bold text-lg">$</span>
                                                <input
                                                    type="number"
                                                    className="glass-input text-xl font-black text-success border-2-success pl-40"
                                                    value={editForm.price}
                                                    onChange={e => setEditForm(p => ({ ...p, price: parseInt(e.target.value) || 0 }))}
                                                />
                                            </div>
                                            <button
                                                className="filter-btn self-end text-xs"
                                                onClick={() => {
                                                    const base = editingOrder.price;
                                                    const v = vehiclesData.find(v => v.name.toLowerCase() === editingOrder.vehicle.toLowerCase() || v.id === editingOrder.vehicle);
                                                    const waitExtraFromMinutes = Math.round((editForm.waitingMinutes / 60) * (v?.priceWaitHour || 0));
                                                    setEditForm(p => ({ 
                                                        ...p, 
                                                        price: base + waitExtraFromMinutes + p.estadiaAmount + p.esperaAmount + p.ayudantesAmount,
                                                        // Note: We don't reset the amounts themselves here, just recalculate the total based on current amounts + base
                                                    }));
                                                }}
                                            >
                                                ↩️ Recalcular Total (Base + Extras)
                                            </button>
                                        </div>

                                        <div className="mt-20 p-15 bg-success-10 border-success-20 rounded-12 text-center text-sm font-bold">
                                            PRECIO FINAL: $ {Math.round(editForm.price || 0).toLocaleString('es-AR')}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="admin-modal-footer">
                            <button className="glass-button flex-1 bg-white-05" onClick={() => setEditingOrder(null)}>Cancelar</button>
                            <button className="glass-button flex-2 font-bold" onClick={handleSaveEdit} disabled={saving}>
                                {saving ? 'Guardando...' : '💾 GUARDAR CAMBIOS'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <InstallPrompt />
        </div>
    );
}
