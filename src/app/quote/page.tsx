"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Data types
interface Vehicle {
    id: string;
    name: string;
    description?: string;
    priceKm: number;
    priceHour: number;
    priceWaitHour: number;
    priceStay: number;
}

interface SelectedVehicle {
    id: string;
    qty: number;
}

interface NominatimSuggestion {
    display_name: string;
    lat: string;
    lon: string;
}

interface SavedLocation {
    id: string;
    name: string;
    icon?: string;
    lat: number;
    lng: number;
}

function AddressAutocomplete({ value, onChange, placeholder, onSelect, savedLocations = [] }: { value: string, onChange: (val: string) => void, placeholder: string, onSelect: (lat: number, lng: number) => void, savedLocations?: SavedLocation[] }) {
    const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (!isTyping || value.length < 4) {
                setSuggestions([]);
                return;
            }
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&addressdetails=1&limit=5&countrycodes=ar`);
                const data = await res.json();
                setSuggestions(data);
            } catch (e) {
                console.error(e);
            }
        };

        const timeoutId = setTimeout(fetchSuggestions, 500);
        return () => clearTimeout(timeoutId);
    }, [value, isTyping]);

    const filteredSaved = savedLocations.filter(loc =>
        loc.name.toLowerCase().includes(value.toLowerCase())
    );

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <input
                className="glass-input"
                placeholder={placeholder}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setIsTyping(true);
                    setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && (
                <div className="glass-panel" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    marginTop: '5px',
                    padding: '5px',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--glass-shadow)'
                }}>
                    {!isTyping && (
                        <div style={{ padding: '8px 12px', fontSize: '0.75rem', color: 'var(--text-secondary)', opacity: 0.7, borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            SUGERENCIAS Y GUARDADOS
                        </div>
                    )}

                    {!isTyping && (
                        <div
                            style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid var(--glass-border)', fontSize: '0.85rem' }}
                            onClick={() => {
                                setIsTyping(true);
                                onChange('');
                            }}
                        >
                            🆕 Nueva Dirección / Buscar...
                        </div>
                    )}

                    {!isTyping && filteredSaved.map((loc, idx) => (
                        <div
                            key={`saved-${idx}`}
                            style={{
                                padding: '10px',
                                cursor: 'pointer',
                                borderBottom: '1px solid var(--glass-border)',
                                fontSize: '0.85rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px'
                            }}
                            onClick={() => {
                                onChange(loc.name);
                                onSelect(loc.lat, loc.lng);
                                setIsTyping(false);
                                setShowSuggestions(false);
                            }}
                        >
                            {loc.name}
                        </div>
                    ))}

                    {isTyping && suggestions.map((s, idx) => (
                        <div
                            key={`sug-${idx}`}
                            style={{
                                padding: '10px',
                                cursor: 'pointer',
                                borderBottom: idx === suggestions.length - 1 ? 'none' : '1px solid var(--glass-border)',
                                fontSize: '0.85rem'
                            }}
                            onClick={() => {
                                let finalName = s.display_name;
                                const houseNumberMatch = value.match(/\d+/);
                                if (houseNumberMatch && !s.display_name.match(new RegExp(`\\b${houseNumberMatch[0]}\\b`))) {
                                    const parts = s.display_name.split(',');
                                    parts[0] = `${parts[0].trim()} ${houseNumberMatch[0]}`;
                                    finalName = parts.join(',');
                                }
                                onChange(finalName);
                                onSelect(parseFloat(s.lat), parseFloat(s.lon));
                                setIsTyping(false);
                                setShowSuggestions(false);
                            }}
                        >
                            {s.display_name}
                        </div>
                    ))}

                    {isTyping && value.length >= 4 && suggestions.length === 0 && (
                        <div style={{ padding: '10px', fontSize: '0.8rem', opacity: 0.5, textAlign: 'center' }}>
                            Buscando direcciones...
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default function QuotePageV2() {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [calculatingRoute, setCalculatingRoute] = useState(false);
    const [orderSuccess, setOrderSuccess] = useState<string | null>(null);
    const [vehiclesData, setVehiclesData] = useState<Vehicle[]>([]);

    // Step 1 Data
    const [customOrigins, setCustomOrigins] = useState<string[]>(['']);
    const [originCoordsList, setOriginCoordsList] = useState<({ lat: number, lng: number } | null)[]>([null]);
    const [customDestinations, setCustomDestinations] = useState<string[]>(['']);
    const [destCoordsList, setDestCoordsList] = useState<({ lat: number, lng: number } | null)[]>([null]);
    const [customerName, setCustomerName] = useState('');
    const [travelDate, setTravelDate] = useState('');
    const [travelTime, setTravelTime] = useState('manana');

    // Step 2 Data
    const [cargoKilos, setCargoKilos] = useState('');
    const [cargoVolume, setCargoVolume] = useState('');
    const [selectedVehicles, setSelectedVehicles] = useState<SelectedVehicle[]>([]);
    const [dbLocations, setDbLocations] = useState<any[]>([]);
    const [corporateClient, setCorporateClient] = useState<any>(null);

    // Customers Data
    const [customers, setCustomers] = useState<any[]>([]);
    const [customerError, setCustomerError] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>('new');
    const [cuit, setCuit] = useState('');
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [customerPhone2, setCustomerPhone2] = useState('');
    const [taxStatus, setTaxStatus] = useState('responsable_inscripto');
    const [observations, setObservations] = useState('');
    const [purchaseOrder, setPurchaseOrder] = useState('');

    // Real distance and route logic
    const [distanceKm, setDistanceKm] = useState(0);
    const [travelHours, setTravelHours] = useState(0);

    // Fetch Prices and Customers from DB on load
    useEffect(() => {
        const fetchData = async () => {
            try {
                const pricesRes = await fetch('/api/pricing');
                if (pricesRes.ok) {
                    const pricesData = await pricesRes.json();
                    setVehiclesData(pricesData);
                }

                const custRes = await fetch('/api/customers/public');
                if (custRes.ok) {
                    const custData = await custRes.json();
                    // Detectar acceso corporativo desde URL
                    const urlParams = new URLSearchParams(window.location.search);
                    const clientSlugFromUrl = urlParams.get('client');

                    // Si es acceso normal (sin ?client=), ocultar clientes corporativos
                    // Si es acceso corporativo (con ?client=siemens), mostrar solo ese cliente corporativo
                    const filtered = clientSlugFromUrl
                        ? custData.filter((c: any) => c.client_slug === clientSlugFromUrl)
                        : custData.filter((c: any) => !c.is_corporate);

                    const sorted = [...filtered].sort((a: any, b: any) =>
                        (a.name || '').localeCompare(b.name || '')
                    );
                    setCustomers(sorted);
                } else {
                    setCustomerError(true);
                }
            } catch (e) {
                setCustomerError(true);
            }
        };
        const fetchLocations = async () => {
            try {
                const res = await fetch('/api/locations');
                if (res.ok) {
                    const data = await res.json();
                    setDbLocations(data);
                }
            } catch (e) {
                console.error("Error fetching locations", e);
            }
        };

        fetchData();
        fetchLocations();

        // Detectar si venimos por acceso corporativo
        const urlParams = new URLSearchParams(window.location.search);
        const clientSlug = urlParams.get('client');
        if (clientSlug) {
            // Guardamos el slug para filtrar luego de que carguen los clientes
            setStep(1); // Asegurar que empezamos en paso 1
        }
    }, []);

    // Efecto para vincular el cliente corporativo una vez que cargan la lista de clientes
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const clientSlug = urlParams.get('client');
        if (clientSlug && customers.length > 0) {
            const found = customers.find(c => c.client_slug === clientSlug);
            if (found) {
                setCorporateClient(found);
                handleCustomerChange(found.id.toString());
            }
        }
    }, [customers]);

    const calculateRealDistance = async () => {
        setCalculatingRoute(true);
        try {
            const points: { lat: number, lng: number }[] = [];
            originCoordsList.forEach(c => { if (c) points.push(c); });
            destCoordsList.forEach(c => { if (c) points.push(c); });

            if (points.length < 2) {
                setDistanceKm(0);
                return;
            }

            const res = await fetch('/api/route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points })
            });
            const data = await res.json();
            if (data.distance) {
                // Redondeo de a 5km hacia arriba
                const roundedDist = Math.ceil(data.distance / 5) * 5;
                setDistanceKm(roundedDist);
                const dh = roundedDist <= 10 ? 2 : roundedDist <= 20 ? 3 : roundedDist <= 50 ? 4 : roundedDist <= 70 ? 5 : 7;
                setTravelHours(dh);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setCalculatingRoute(false);
        }
    };

    const handleNext = async () => {
        if (step === 1) {
            if (!customerName) {
                alert("Por favor ingresá tu nombre o empresa");
                return;
            }
            const hasOrigins = originCoordsList.some((_, i) => customOrigins[i]?.trim() && originCoordsList[i]);
            const hasDests = destCoordsList.some((_, i) => customDestinations[i]?.trim() && destCoordsList[i]);
            if (!hasOrigins || !hasDests) {
                alert("Por favor completá al menos un origen y un destino válidos seleccionando la dirección de la lista desplegable.");
                return;
            }
            await calculateRealDistance();
        }
        setStep(s => s + 1);
    };

    const handlePrev = () => setStep(s => s - 1);

    const toggleVehicle = (id: string, qty: number) => {
        setSelectedVehicles(prev => {
            const existing = prev.find(v => v.id === id);
            if (qty === 0) return prev.filter(v => v.id !== id);
            if (existing) return prev.map(v => v.id === id ? { ...v, qty } : v);
            return [...prev, { id, qty }];
        });
    };

    const moveItem = (arr: any[], setArr: (a: any[]) => void, coords: any[], setCoords: (c: any[]) => void, index: number, direction: 'up' | 'down') => {
        const newArr = [...arr];
        const newCoords = [...coords];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newArr.length) return;

        const temp = newArr[index];
        newArr[index] = newArr[targetIndex];
        newArr[targetIndex] = temp;

        const tempC = newCoords[index];
        newCoords[index] = newCoords[targetIndex];
        newCoords[targetIndex] = tempC;

        setArr(newArr);
        setCoords(newCoords);
    };

    const calculateTotalDetails = () => {
        let total = 0;
        const items: { name: string, qty: number, unitPrice: number, subtotal: number, type: 'KM' | 'HOUR', factor: number }[] = [];
        const selectedCustomer = customers.find(c => String(c.id) === selectedCustomerId);
        const hasSpecial = selectedCustomer?.has_special_pricing && selectedCustomer?.special_prices;

        selectedVehicles.forEach(sv => {
            const vData = vehiclesData.find(v => v.id === sv.id);
            if (vData) {
                let pKm = vData.priceKm;
                let pHour = vData.priceHour;

                if (hasSpecial && selectedCustomer.special_prices[sv.id]) {
                    const sp = selectedCustomer.special_prices[sv.id];
                    if (sp.priceKm > 0) pKm = sp.priceKm;
                    if (sp.priceHour > 0) pHour = sp.priceHour;
                }

                let subtotal = 0;
                let type: 'KM' | 'HOUR' = 'HOUR';
                let unitPrice = Math.round(pHour);
                let factor = 0;

                if (distanceKm <= 100) {
                    subtotal = Math.round(pHour * travelHours * sv.qty);
                    type = 'HOUR';
                    unitPrice = Math.round(pHour);
                    factor = Math.round(travelHours);
                } else {
                    subtotal = Math.round(pKm * distanceKm * sv.qty);
                    type = 'KM';
                    unitPrice = Math.round(pKm);
                    factor = Math.round(distanceKm);
                }

                total += subtotal;
                items.push({
                    name: vData.name,
                    qty: sv.qty,
                    unitPrice,
                    subtotal,
                    type,
                    factor
                });
            }
        });
        return { total: Math.round(total), items };
    };

    const calculation = calculateTotalDetails();
    const price = calculation.total;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Recopilar todos los puntos para el historial de ruta (stops)
            const allPoints: { lat: number, lng: number, label: string }[] = [];
            originCoordsList.forEach((c, idx) => {
                if (c) allPoints.push({ ...c, label: `Origen ${idx + 1}: ${customOrigins[idx]}` });
            });
            destCoordsList.forEach((c, idx) => {
                if (c) allPoints.push({ ...c, label: `Destino ${idx + 1}: ${customDestinations[idx]}` });
            });

            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vehicle: selectedVehicles.map(v => `${v.qty}x ${vehiclesData.find(x => x.id === v.id)?.name}`).join(' | '),
                    destination: customDestinations.filter(d => d.trim()).join(' | '),
                    price,
                    customerName,
                    customerId: selectedCustomerId !== 'new' ? selectedCustomerId : undefined,
                    origin: customOrigins.filter(o => o.trim()).join(' | '),
                    travelDate,
                    travelTime,
                    cuit,
                    customerEmail,
                    customerPhone: `${customerPhone}${customerPhone2 ? ' / ' + customerPhone2 : ''}`,
                    taxStatus,
                    originLng: originCoordsList[0]?.lng || 0,
                    origin2Lat: originCoordsList.length > 1 ? originCoordsList[1]?.lat : (destCoordsList.length > 1 ? destCoordsList[0]?.lat : undefined),
                    origin2Lng: originCoordsList.length > 1 ? originCoordsList[1]?.lng : (destCoordsList.length > 1 ? destCoordsList[0]?.lng : undefined),
                    destLat: destCoordsList[destCoordsList.length - 1]?.lat || 0,
                    destLng: destCoordsList[destCoordsList.length - 1]?.lng || 0,
                    stops: allPoints,
                    pricingBreakdown: calculation.items,
                    observations,
                    distanceKm,
                    travelHours,
                    purchaseOrder
                }),
            });

            const data = await res.json();
            if (res.ok) {
                setOrderSuccess(data.id);
            } else {
                alert(`Error al guardar: ${data.error || 'Desconocido'}`);
            }
        } catch (error) {
            console.error("Error creating order", error);
            alert("Error de conexión. Por favor verifica tu internet.");
        } finally {
            setLoading(false);
        }
    };

    const handleCustomerChange = (customerId: string) => {
        setSelectedCustomerId(customerId);
        if (customerId === 'new') {
            setCustomerName('');
            setCustomerEmail('');
            setCustomerPhone('');
            setCustomerPhone2('');
            setCuit('');
            setTaxStatus('responsable_inscripto');
        } else {
            const c = customers.find(x => String(x.id) === customerId);
            if (c) {
                setCustomerName(c.name || '');
                setCustomerEmail(c.email || '');
                setCustomerPhone(c.phone || '');
                setCustomerPhone2(c.phone2 || '');
                setCuit(c.cuit || '');
                setTaxStatus(c.tax_status || 'responsable_inscripto');
            }
        }
    };

    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 2);
    const minDateString = minDate.toISOString().split('T')[0];

    if (orderSuccess) {
        return (
            <div className="page-container flex-col items-center">
                <div className="glass-panel" style={{ padding: '50px', maxWidth: '600px', textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem' }}>✉️ ✅</div>
                    <h2 className="text-gradient mt-20 mb-20">Reserva a confirmar</h2>
                    <p className="mb-20">Nos comunicaremos en breve. Recibirá un email en ({customerEmail}) con el presupuesto formal de EL CASAL. <strong>(Por favor, revise también su carpeta de correo no deseado o SPAM)</strong>.</p>
                    <div className="glass-panel mb-20" style={{ padding: '20px', background: 'rgba(0,0,0,0.3)' }}>
                        <div className="glass-label">Pedido ID</div>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{orderSuccess}</div>
                    </div>
                    <Link href="/"><button className="glass-button">Volver al Inicio</button></Link>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container" style={{ maxWidth: '800px' }}>
            <div className="flex justify-between items-start mb-20">
                <div>
                    <Link href="/" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>← Cancelar</Link>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '5px' }}>
                        <h1 className="text-gradient">
                            {corporateClient ? `Panel Corporativo ${corporateClient.name}` : 'Presupuesto Estimativo y Reserva'}
                        </h1>
                    </div>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7, color: 'var(--text-secondary)' }}>
                        {corporateClient ? 'Utilizá tus direcciones guardadas y tarifas personalizadas.' : 'El presupuesto será revisado, adaptado e informado por personal de EL CASAL.'}
                    </p>
                </div>
            </div>

            <div className="flex justify-between items-center mb-10">
                <span className="badge badge-pending">Paso {step} de 3</span>
                <div className="flex gap-10">
                    {[1, 2, 3].map(i => (
                        <div key={i} className={`status-indicator ${step >= i ? 'badge-active' : 'badge-pending'}`} />
                    ))}
                </div>
            </div>

            <div className="glass-panel" style={{ padding: '30px' }}>
                {step === 1 && (
                    <div className="flex-col gap-20">
                        <h2 className="mb-10">1. Ruta y Fechas</h2>

                        <div className="flex-col gap-10">
                            <label className="glass-label">
                                {selectedCustomerId === 'new' ? '👤 Identificación del Cliente' : '👤 Cliente Seleccionado'}
                            </label>
                            <select
                                className="glass-select"
                                value={selectedCustomerId}
                                onChange={(e) => handleCustomerChange(e.target.value)}
                                style={{ fontSize: '1rem', padding: '12px' }}
                            >
                                {customerError ? (
                                    <option disabled>⚠️ Error al cargar clientes</option>
                                ) : Array.isArray(customers) && customers.length > 0 ? (
                                    corporateClient ? (
                                        <option value={corporateClient.id}>{corporateClient.name}</option>
                                    ) : (
                                        <>
                                            <option value="new">🆕 Nuevo Cliente / Otro</option>
                                            {customers.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </>
                                    )
                                ) : (
                                    <option disabled>Cargando clientes...</option>
                                )}
                            </select>
                            {selectedCustomerId === 'new' && (
                                <input
                                    type="text"
                                    className="glass-input"
                                    value={customerName}
                                    onChange={e => setCustomerName(e.target.value)}
                                    placeholder="Nombre completo o Razón Social"
                                    required
                                />
                            )}
                        </div>

                        {/* ORIGINES */}
                        <div className="flex-col gap-10">
                            <label className="glass-label">Origen/es</label>
                            <div className="flex-col gap-10">
                                {customOrigins.map((addr, idx) => (
                                    <div key={`orig-${idx}`} className="flex gap-10 items-center">
                                        <div className="flex-col justify-center gap-5" style={{ minWidth: '35px', opacity: 0.7 }}>
                                            <div style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'center', marginBottom: '-2px' }}>{idx + 1}</div>
                                            <div className="flex-col gap-2">
                                                <button type="button" className="filter-btn" style={{ padding: '2px', fontSize: '0.66rem', width: '100%', borderRadius: '4px' }} onClick={() => moveItem(customOrigins, setCustomOrigins, originCoordsList, setOriginCoordsList, idx, 'up')} disabled={idx === 0}>▲</button>
                                                <button type="button" className="filter-btn" style={{ padding: '2px', fontSize: '0.66rem', width: '100%', borderRadius: '4px' }} onClick={() => moveItem(customOrigins, setCustomOrigins, originCoordsList, setOriginCoordsList, idx, 'down')} disabled={idx === customOrigins.length - 1}>▼</button>
                                            </div>
                                        </div>
                                        <div style={{ flexGrow: 1 }}>
                                            <AddressAutocomplete
                                                placeholder={`Dirección de origen ${idx + 1}`}
                                                value={addr}
                                                savedLocations={dbLocations.filter(loc =>
                                                    corporateClient
                                                        ? loc.customer_id?.toString() === corporateClient.id.toString()
                                                        : !loc.customer_id
                                                )}
                                                onChange={val => {
                                                    const newO = [...customOrigins];
                                                    newO[idx] = val;
                                                    setCustomOrigins(newO);
                                                }}
                                                onSelect={(lat, lng) => {
                                                    const newC = [...originCoordsList];
                                                    newC[idx] = { lat, lng };
                                                    setOriginCoordsList(newC);
                                                }}
                                            />
                                        </div>
                                        {customOrigins.length > 1 && (
                                            <button className="filter-btn" type="button" style={{ color: '#ef4444', padding: '10px' }} onClick={() => {
                                                setCustomOrigins(customOrigins.filter((_, i) => i !== idx));
                                                setOriginCoordsList(originCoordsList.filter((_, i) => i !== idx));
                                            }}>✕</button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="filter-btn"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--glass-border)', padding: '12px', fontSize: '0.85rem' }}
                                    onClick={() => {
                                        setCustomOrigins([...customOrigins, '']);
                                        setOriginCoordsList([...originCoordsList, null]);
                                    }}
                                >
                                    ➕ Sumar Dirección Origen
                                </button>
                            </div>
                        </div>

                        {/* DIVISOR SUTIL */}
                        <div style={{ padding: '10px 0' }}>
                            <div style={{ height: '1px', background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.2), transparent)' }} />
                        </div>

                        {/* DESTINOS */}
                        <div className="flex-col gap-10">
                            <label className="glass-label">Destino/s</label>
                            <div className="flex-col gap-10">
                                {customDestinations.map((addr, idx) => (
                                    <div key={`dest-${idx}`} className="flex gap-10 items-center">
                                        <div className="flex-col justify-center gap-5" style={{ minWidth: '35px', opacity: 0.7 }}>
                                            <div style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'center', marginBottom: '-2px' }}>{idx + 1}</div>
                                            <div className="flex-col gap-2">
                                                <button type="button" className="filter-btn" style={{ padding: '2px', fontSize: '0.66rem', width: '100%', borderRadius: '4px' }} onClick={() => moveItem(customDestinations, setCustomDestinations, destCoordsList, setDestCoordsList, idx, 'up')} disabled={idx === 0}>▲</button>
                                                <button type="button" className="filter-btn" style={{ padding: '2px', fontSize: '0.66rem', width: '100%', borderRadius: '4px' }} onClick={() => moveItem(customDestinations, setCustomDestinations, destCoordsList, setDestCoordsList, idx, 'down')} disabled={idx === customDestinations.length - 1}>▼</button>
                                            </div>
                                        </div>
                                        <div style={{ flexGrow: 1 }}>
                                            <AddressAutocomplete
                                                placeholder={`Dirección de destino ${idx + 1}`}
                                                value={addr}
                                                savedLocations={dbLocations.filter(loc =>
                                                    corporateClient
                                                        ? loc.customer_id?.toString() === corporateClient.id.toString()
                                                        : !loc.customer_id
                                                )}
                                                onChange={val => {
                                                    const newD = [...customDestinations];
                                                    newD[idx] = val;
                                                    setCustomDestinations(newD);
                                                }}
                                                onSelect={(lat, lng) => {
                                                    const newC = [...destCoordsList];
                                                    newC[idx] = { lat, lng };
                                                    setDestCoordsList(newC);
                                                }}
                                            />
                                        </div>
                                        {customDestinations.length > 1 && (
                                            <button className="filter-btn" type="button" style={{ color: '#ef4444', padding: '10px' }} onClick={() => {
                                                setCustomDestinations(customDestinations.filter((_, i) => i !== idx));
                                                setDestCoordsList(destCoordsList.filter((_, i) => i !== idx));
                                            }}>✕</button>
                                        )}
                                    </div>
                                ))}
                                <button
                                    type="button"
                                    className="filter-btn"
                                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--glass-border)', padding: '12px', fontSize: '0.85rem' }}
                                    onClick={() => {
                                        setCustomDestinations([...customDestinations, '']);
                                        setDestCoordsList([...destCoordsList, null]);
                                    }}
                                >
                                    ➕ Sumar Dirección Destino
                                </button>
                            </div>
                        </div>

                        <div className="flex gap-20 items-start">
                            <div style={{ flex: 1.2 }}>
                                <label className="glass-label">Fecha de Carga</label>
                                <input type="date" className="glass-input" value={travelDate} onChange={e => setTravelDate(e.target.value)} min={minDateString} style={{ colorScheme: 'dark' }} />
                                <div style={{ fontSize: '0.65rem', marginTop: '6px', opacity: 0.8, lineHeight: '1.2' }}>
                                    48hs min. anticipación. <br />
                                    Para hoy/mañana: <a href="https://wa.me/5491150443328" style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>Contacto urgente ↗</a>
                                </div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="glass-label">Turno</label>
                                <div className="toggle-group" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '5px' }}>
                                    <button type="button" className={`toggle-btn ${travelTime === 'manana' ? 'active' : ''}`} onClick={() => setTravelTime('manana')} style={{ padding: '8px' }}>☀️ Mañana</button>
                                    <button type="button" className={`toggle-btn ${travelTime === 'mediodia' ? 'active' : ''}`} onClick={() => setTravelTime('mediodia')} style={{ padding: '8px' }}>🕛 Medio día</button>
                                    <button type="button" className={`toggle-btn ${travelTime === 'tarde' ? 'active' : ''}`} onClick={() => setTravelTime('tarde')} style={{ padding: '8px' }}>🌙 Tarde</button>
                                </div>
                            </div>
                        </div>

                        <button className="glass-button w-full mt-10" onClick={handleNext} disabled={calculatingRoute}>
                            {calculatingRoute ? 'Calculando...' : 'Siguiente Paso →'}
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="flex-col gap-20">
                        <h2 className="mb-0">2. Carga y Flota</h2>
                        <div className="flex gap-20">
                            <div style={{ flex: 1 }}>
                                <label htmlFor="kilos" className="glass-label">Kilos aprox</label>
                                <input id="kilos" type="number" className="glass-input" value={cargoKilos} onChange={e => setCargoKilos(e.target.value)} placeholder="(opcional)" />
                            </div>
                            <div style={{ flex: 2 }}>
                                <label htmlFor="vol" className="glass-label">TAMAÑO</label>
                                <input id="vol" type="text" className="glass-input" value={cargoVolume} onChange={e => setCargoVolume(e.target.value)} placeholder="(opcional)" />
                            </div>
                        </div>

                        <div className="flex-col gap-10">
                            {vehiclesData.map(v => {
                                const qty = selectedVehicles.find(sv => sv.id === v.id)?.qty || 0;
                                return (
                                    <div key={v.id} className="glass-panel flex justify-between items-center" style={{ padding: '15px' }}>
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>{v.name}</div>
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{v.description}</div>
                                        </div>
                                        <div className="flex items-center gap-10">
                                            <button type="button" className="filter-btn" onClick={() => toggleVehicle(v.id, Math.max(0, qty - 1))}>-</button>
                                            <span style={{ fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{qty}</span>
                                            <button type="button" className="filter-btn" onClick={() => toggleVehicle(v.id, qty + 1)}>+</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex gap-20 mt-10">
                            <button className="filter-btn" style={{ flex: 1 }} onClick={handlePrev}>← Volver</button>
                            <button className="glass-button" style={{ flex: 2 }} onClick={handleNext} disabled={selectedVehicles.length === 0}>Siguiente Paso →</button>
                        </div>
                    </div>
                )}

                {step === 3 && (
                    <form className="flex-col gap-20" onSubmit={handleSubmit}>
                        <h2 className="mb-0">3. Confirmación</h2>
                        <div className="glass-panel" style={{ padding: '20px', background: 'rgba(0,0,0,0.2)' }}>
                            <div className="flex-col gap-15">
                                <div>
                                    <div className="glass-label" style={{ fontSize: '0.7rem' }}>RUTA Y FECHAS</div>
                                    <div style={{ fontSize: '0.85rem' }} className="flex-col gap-5">
                                        <div>
                                            <strong>Orígenes:</strong>
                                            {customOrigins.filter(o => o.trim()).map((o, i) => (
                                                <div key={i} style={{ marginLeft: '10px', marginTop: '2px', opacity: 0.9 }}>• {o}</div>
                                            ))}
                                        </div>
                                        <div style={{ marginTop: '5px' }}>
                                            <strong>Destinos:</strong>
                                            {customDestinations.filter(d => d.trim()).map((d, i) => (
                                                <div key={i} style={{ marginLeft: '10px', marginTop: '2px', opacity: 0.9 }}>• {d}</div>
                                            ))}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', marginTop: '10px' }}>
                                        <strong>Fecha:</strong> {travelDate.split('-').reverse().join('/')} ({travelTime === 'manana' ? 'Mañana' : travelTime === 'mediodia' ? 'Medio día' : 'Tarde'})
                                    </div>
                                </div>

                                <div className="flex justify-between gap-20">
                                    <div style={{ flex: 1 }}>
                                        <div className="glass-label" style={{ fontSize: '0.7rem' }}>DISTANCIA ESTIMADA</div>
                                        <div style={{ fontSize: '1rem' }}>{distanceKm.toFixed(1)} km</div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div className="glass-label" style={{ fontSize: '0.7rem' }}>FLOTA</div>
                                        <div style={{ fontSize: '0.85rem' }}>
                                            {selectedVehicles.map((v, i) => (
                                                <div key={i} style={{ marginBottom: '2px' }}>{v.qty}x {vehiclesData.find(x => x.id === v.id)?.name}</div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="status-indicator badge-active" style={{ width: '100%', height: '1px', margin: '20px 0', opacity: 0.2 }} />

                            <div style={{ fontSize: '2.2rem', textAlign: 'center' }} className="text-gradient">Total: <strong>${price.toLocaleString('es-AR')}</strong></div>
                            <p style={{ textAlign: 'center', fontSize: '0.75rem', marginTop: '10px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                                * Este es un <strong>precio de referencia aproximado</strong>. El valor final se enviará a la brevedad tras la confirmación manual de disponibilidad y fletes de retorno.
                            </p>
                        </div>

                        <div className="flex-col gap-20">
                            <div>
                                <label htmlFor="po" className="glass-label">Nº Orden de Compra</label>
                                <input id="po" type="text" className="glass-input" value={purchaseOrder} onChange={e => setPurchaseOrder(e.target.value)} />
                            </div>
                            <div className="flex gap-20">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="cuit" className="glass-label">CUIT / CUIL</label>
                                    <input id="cuit" type="text" className="glass-input" value={cuit} onChange={e => setCuit(e.target.value)} required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="email" className="glass-label">Email de contacto</label>
                                    <input id="email" type="email" className="glass-input" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} required />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-20">
                            <div style={{ flex: 1 }}>
                                <label htmlFor="whatsapp1" className="glass-label">TELÉFONO / WHATSAPP</label>
                                <input id="whatsapp1" type="tel" className="glass-input" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Ej: 5411..." required />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label htmlFor="whatsapp2" className="glass-label">CONTACTO 2 (Opcional)</label>
                                <input id="whatsapp2" type="tel" className="glass-input" value={customerPhone2} onChange={e => setCustomerPhone2(e.target.value)} />
                            </div>
                        </div>

                        <div className="flex-col gap-10">
                            <label className="glass-label">Condición IVA</label>
                            <div className="toggle-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                                {['responsable_inscripto', 'monotributo', 'consumidor_final', 'exento'].map(t => (
                                    <button key={t} type="button" className={`toggle-btn ${taxStatus === t ? 'active' : ''}`} onClick={() => setTaxStatus(t)}>
                                        {t.replace('_', ' ').toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-col gap-10">
                            <label htmlFor="obs" className="glass-label">Observaciones</label>
                            <textarea id="obs" className="glass-input" style={{ minHeight: '80px' }} value={observations} onChange={e => setObservations(e.target.value)} placeholder="Escribe detalles adicionales..." />
                        </div>

                        <div className="flex gap-20 mt-10">
                            <button type="button" className="filter-btn" style={{ flex: 1 }} onClick={handlePrev}>← Volver</button>
                            <button type="submit" className="glass-button" style={{ flex: 2, background: 'var(--accent-gradient)', fontSize: '1.2rem', padding: '15px' }} disabled={loading}>
                                {loading ? 'Enviando...' : '📝 CONFIRMAR Y PEDIR'}
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <p style={{ textAlign: 'center', fontSize: '0.7rem', opacity: 0.4, marginTop: '30px', paddingBottom: '30px' }}>
                © EL CASAL - Logística de Alta Gama. Este presupuesto no garantiza disponibilidad inmediata.
            </p>
        </div>
    );
}
