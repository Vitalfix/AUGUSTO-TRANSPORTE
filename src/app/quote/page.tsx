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

const UTILITY_LOCATIONS = [
    { id: 'custom', name: 'Dirección Exacta', icon: '📍' },
    { id: 'multi', name: 'Múltiples Puntos', icon: '📎' }
];

interface SelectedVehicle {
    id: string;
    qty: number;
}

interface NominatimSuggestion {
    display_name: string;
    lat: string;
    lon: string;
}

function AddressAutocomplete({ value, onChange, placeholder, onSelect }: { value: string, onChange: (val: string) => void, placeholder: string, onSelect: (lat: number, lng: number) => void }) {
    const [suggestions, setSuggestions] = useState<NominatimSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    useEffect(() => {
        const fetchSuggestions = async () => {
            if (value.length < 4) {
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
    }, [value]);

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <input
                className="glass-input"
                placeholder={placeholder}
                value={value}
                onChange={(e) => {
                    onChange(e.target.value);
                    setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            />
            {showSuggestions && suggestions.length > 0 && (
                <div className="glass-panel" style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 100,
                    marginTop: '5px',
                    padding: '5px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    background: 'var(--bg-color)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: 'var(--glass-shadow)'
                }}>
                    {suggestions.map((s, idx) => (
                        <div
                            key={idx}
                            style={{
                                padding: '10px',
                                cursor: 'pointer',
                                borderBottom: idx === suggestions.length - 1 ? 'none' : '1px solid var(--glass-border)',
                                fontSize: '0.85rem'
                            }}
                            onClick={() => {
                                // Extract house number from typed value if it exists but is missing in suggestion
                                let finalName = s.display_name;
                                const houseNumberMatch = value.match(/\d+/);
                                if (houseNumberMatch && !s.display_name.match(new RegExp(`\\b${houseNumberMatch[0]}\\b`))) {
                                    // Insert the house number after the first part (street name)
                                    const parts = s.display_name.split(',');
                                    parts[0] = `${parts[0].trim()} ${houseNumberMatch[0]}`;
                                    finalName = parts.join(',');
                                }

                                onChange(finalName);
                                onSelect(parseFloat(s.lat), parseFloat(s.lon));
                                setShowSuggestions(false);
                            }}
                        >
                            {s.display_name}
                        </div>
                    ))}
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
    const [originType, setOriginType] = useState('ezeiza');
    const [customOrigins, setCustomOrigins] = useState<string[]>(['']);
    const [originCoordsList, setOriginCoordsList] = useState<({ lat: number, lng: number } | null)[]>([null]);
    const [destType, setDestType] = useState('custom');
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

    // Customers Data
    const [customers, setCustomers] = useState<any[]>([]);
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

    // Standard coordinate accessors (backward compatibility for calculateRealDistance)
    const originCoords = originCoordsList[0];
    const origin2Coords = originCoordsList[1];
    const destCoords = destCoordsList[0];

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
                    // Ordenar: SIEMENS primero, luego el resto alfabético
                    const sorted = [...custData].sort((a, b) => {
                        const nameA = (a.name || '').toUpperCase();
                        const nameB = (b.name || '').toUpperCase();
                        const aSiemens = nameA.includes('SIEMENS');
                        const bSiemens = nameB.includes('SIEMENS');

                        if (aSiemens && !bSiemens) return -1;
                        if (!aSiemens && bSiemens) return 1;
                        return nameA.localeCompare(nameB);
                    });
                    console.log("Clientes cargados y ordenados:", sorted.length);
                    setCustomers(sorted);
                } else {
                    console.error("Error al obtener clientes públicos:", custRes.status);
                }
            } catch (e) {
                console.error("Error fetching initial data", e);
            }
        };

        const fetchLocations = async () => {
            try {
                const res = await fetch('/api/locations');
                if (res.ok) {
                    const data = await res.json();
                    setDbLocations(data);
                    if (data.length > 0) setOriginType(`db_${data[0].id}`);
                }
            } catch (e) {
                console.error("Error fetching locations", e);
            }
        };

        fetchData();
        fetchLocations();
    }, []);

    const allLocations = [
        ...dbLocations.map(l => ({ id: `db_${l.id}`, name: l.name, icon: l.icon, lat: l.lat, lng: l.lng })),
        ...UTILITY_LOCATIONS
    ];

    const getCoords = (type: string, coords: { lat: number, lng: number } | null) => {
        if (type.startsWith('db_')) {
            const loc = dbLocations.find(l => `db_${l.id}` === type);
            return loc ? { lat: loc.lat, lng: loc.lng } : { lat: -34.815, lng: -58.535 };
        }
        if ((type === 'custom' || type === 'multi') && coords) return coords;
        return { lat: -34.815, lng: -58.535 };
    };

    const calculateRealDistance = async () => {
        setCalculatingRoute(true);
        try {
            const startNode = getCoords(originType, originCoords);
            const endNode = getCoords(destType, destCoords);

            const points = [startNode];
            if (originType === 'multi' && origin2Coords) points.push(origin2Coords);
            points.push(endNode);

            const res = await fetch('/api/route', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ points })
            });
            const data = await res.json();
            if (data.distance) {
                setDistanceKm(data.distance);
                const dh = data.distance <= 10 ? 2 : data.distance <= 20 ? 3 : data.distance <= 50 ? 4 : data.distance <= 70 ? 5 : 7;
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

        // Swap values
        const temp = newArr[index];
        newArr[index] = newArr[targetIndex];
        newArr[targetIndex] = temp;

        // Swap coordinates
        const tempC = newCoords[index];
        newCoords[index] = newCoords[targetIndex];
        newCoords[targetIndex] = tempC;

        setArr(newArr);
        setCoords(newCoords);
    };

    const calculateTotal = () => {
        let total = 0;
        const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
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

                if (distanceKm <= 100) total += pHour * travelHours * sv.qty;
                else total += pKm * distanceKm * sv.qty;
            }
        });
        return total;
    };

    const price = calculateTotal();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vehicle: selectedVehicles.map(v => `${v.qty}x ${vehiclesData.find(x => x.id === v.id)?.name}`).join(', '),
                    destination: destType.startsWith('db_')
                        ? dbLocations.find(l => `db_${l.id}` === destType)?.name
                        : customDestinations.filter(d => d.trim()).join(' | '),
                    price,
                    customerName,
                    customerId: selectedCustomerId !== 'new' ? selectedCustomerId : undefined,
                    origin: originType.startsWith('db_')
                        ? dbLocations.find(l => `db_${l.id}` === originType)?.name
                        : customOrigins.filter(o => o.trim()).join(' | '),
                    travelDate,
                    travelTime,
                    cuit,
                    customerEmail,
                    customerPhone: `${customerPhone}${customerPhone2 ? ' / ' + customerPhone2 : ''}`,
                    taxStatus,
                    originLat: getCoords(originType, originCoords).lat,
                    originLng: getCoords(originType, originCoords).lng,
                    origin2Lat: originType === 'multi' ? origin2Coords?.lat : undefined,
                    origin2Lng: originType === 'multi' ? origin2Coords?.lng : undefined,
                    destLat: getCoords(destType, destCoords).lat,
                    destLng: getCoords(destType, destCoords).lng,
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
                console.error("Server Error:", data.error);
                alert(`Error al guardar: ${data.error || 'Desconocido'}`);
            }
        } catch (error) {
            console.error("Error creating order", error);
            alert("Error de conexión. Por favor verifica tu internet.");
        } finally {
            setLoading(false);
        }
    };

    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 2);
    const minDateString = minDate.toISOString().split('T')[0];

    const handleCustomerChange = (customerId: string) => {
        setSelectedCustomerId(customerId);
        if (customerId === 'new') {
            setCustomerName('');
            setCustomerEmail('');
            setCustomerPhone('');
            setCuit('');
            setTaxStatus('responsable_inscripto');
        } else {
            const c = customers.find(x => String(x.id) === customerId);
            if (c) {
                setCustomerName(c.name || '');
                setCustomerEmail(c.email || '');
                setCustomerPhone(c.phone || '');
                setCuit(c.cuit || '');
                setTaxStatus(c.tax_status || 'responsable_inscripto');
            }
        }
    };

    if (orderSuccess) {
        return (
            <div className="page-container flex-col items-center">
                <div className="glass-panel" style={{ padding: '50px', maxWidth: '600px', textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem' }}>✉️ ✅</div>
                    <h2 className="text-gradient mt-20 mb-20">Reserva a confirmar</h2>
                    <p className="mb-20">Nos comunicaremos en breve. Recibirá un email en ({customerEmail}) con el presupuesto formal de EL CASAL.</p>
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
                    <h1 className="text-gradient">Presupuesto Estimativo y Reserva</h1>
                    <p style={{ fontSize: '0.8rem', opacity: 0.7, color: 'var(--text-secondary)' }}>El presupuesto será revisado, adaptado e informado por personal de EL CASAL.</p>
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
                            <label className="glass-label">Origen/es</label>
                            <div className="toggle-group">
                                {allLocations.map(l => (
                                    <button
                                        key={l.id}
                                        type="button"
                                        className={`toggle-btn ${originType === l.id ? 'active' : ''}`}
                                        onClick={() => {
                                            const prevType = originType;
                                            setOriginType(l.id);

                                            if (l.id === 'multi') {
                                                if (prevType.startsWith('db_')) {
                                                    const loc = dbLocations.find(dl => `db_${dl.id}` === prevType);
                                                    if (loc) {
                                                        setCustomOrigins([loc.name, '']);
                                                        setOriginCoordsList([{ lat: loc.lat, lng: loc.lng }, null]);
                                                    }
                                                } else if (prevType === 'custom') {
                                                    if (customOrigins.length === 1) {
                                                        setCustomOrigins([...customOrigins, '']);
                                                        setOriginCoordsList([...originCoordsList, null]);
                                                    }
                                                } else if (customOrigins.length === 0) {
                                                    setCustomOrigins(['', '']);
                                                    setOriginCoordsList([null, null]);
                                                }
                                            } else if (l.id === 'custom') {
                                                if (prevType.startsWith('db_')) {
                                                    const loc = dbLocations.find(dl => `db_${dl.id}` === prevType);
                                                    if (loc) {
                                                        setCustomOrigins([loc.name]);
                                                        setOriginCoordsList([{ lat: loc.lat, lng: loc.lng }]);
                                                    }
                                                }
                                            }
                                        }}
                                        style={{ flex: '1 1 45%' }}
                                    >
                                        <span>{l.icon}</span>
                                        {l.id === 'multi' ? 'Múltiples Orígenes' : l.name}
                                    </button>
                                ))}
                            </div>

                            {/* Detalle Origen */}
                            {originType === 'custom' && (
                                <div className="mt-10">
                                    <AddressAutocomplete
                                        placeholder="Escribí la dirección exacta de origen..."
                                        value={customOrigins[0]}
                                        onChange={val => {
                                            const newO = [...customOrigins];
                                            newO[0] = val;
                                            setCustomOrigins(newO);
                                        }}
                                        onSelect={(lat, lng) => {
                                            const newC = [...originCoordsList];
                                            newC[0] = { lat, lng };
                                            setOriginCoordsList(newC);
                                        }}
                                    />
                                </div>
                            )}
                            {originType === 'multi' && (
                                <div className="flex-col gap-10 mt-10">
                                    {/* Acceso rápido a guardados */}
                                    <div className="flex gap-10 overflow-x-auto pb-5 no-scrollbar" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '10px' }}>
                                        {dbLocations.map(loc => (
                                            <button
                                                key={loc.id}
                                                type="button"
                                                className="filter-btn"
                                                style={{ whiteSpace: 'nowrap', fontSize: '0.7rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                onClick={() => {
                                                    // Buscar un slot vacío o el último
                                                    const emptyIdx = customOrigins.findIndex(o => !o || o.trim() === '');
                                                    const targetIdx = emptyIdx !== -1 ? emptyIdx : customOrigins.length;

                                                    const newO = [...customOrigins];
                                                    const newC = [...originCoordsList];

                                                    newO[targetIdx] = loc.name;
                                                    newC[targetIdx] = { lat: loc.lat, lng: loc.lng };

                                                    setCustomOrigins(newO);
                                                    setOriginCoordsList(newC);
                                                }}
                                            >
                                                <span>{loc.icon || '📍'}</span> {loc.name}
                                            </button>
                                        ))}
                                    </div>

                                    {customOrigins.map((addr, idx) => (
                                        <div key={idx} className="flex gap-10 items-center">
                                            <div className="flex-col justify-center gap-5" style={{ minWidth: '35px', opacity: 0.7 }}>
                                                <div style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'center', marginBottom: '-2px' }}>{idx + 1}</div>
                                                <div className="flex-col gap-2">
                                                    <button type="button" className="filter-btn" style={{ padding: '2px', fontSize: '0.6rem', width: '100%', borderRadius: '4px' }} onClick={() => moveItem(customOrigins, setCustomOrigins, originCoordsList, setOriginCoordsList, idx, 'up')} disabled={idx === 0}>▲</button>
                                                    <button type="button" className="filter-btn" style={{ padding: '2px', fontSize: '0.6rem', width: '100%', borderRadius: '4px' }} onClick={() => moveItem(customOrigins, setCustomOrigins, originCoordsList, setOriginCoordsList, idx, 'down')} disabled={idx === customOrigins.length - 1}>▼</button>
                                                </div>
                                            </div>
                                            <div style={{ flexGrow: 1 }}>
                                                <AddressAutocomplete
                                                    placeholder={`Dirección ${idx + 1}`}
                                                    value={addr}
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
                                                <button className="filter-btn" type="button" onClick={() => {
                                                    setCustomOrigins(customOrigins.filter((_, i) => i !== idx));
                                                    setOriginCoordsList(originCoordsList.filter((_, i) => i !== idx));
                                                }}>✕</button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className="filter-btn w-full"
                                        style={{ background: 'var(--glass-bg-secondary)', border: '1px dashed var(--glass-border)', padding: '12px' }}
                                        onClick={() => {
                                            setCustomOrigins([...customOrigins, '']);
                                            setOriginCoordsList([...originCoordsList, null]);
                                        }}
                                    >
                                        ➕ Sumar Dirección Origen
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex-col gap-10">
                            <label className="glass-label">Destino/s</label>
                            <div className="toggle-group">
                                {allLocations.map(l => (
                                    <button
                                        key={l.id}
                                        type="button"
                                        className={`toggle-btn ${destType === l.id ? 'active' : ''}`}
                                        onClick={() => {
                                            const prevType = destType;
                                            setDestType(l.id);

                                            if (l.id === 'multi') {
                                                if (prevType.startsWith('db_')) {
                                                    const loc = dbLocations.find(dl => `db_${dl.id}` === prevType);
                                                    if (loc) {
                                                        setCustomDestinations([loc.name, '']);
                                                        setDestCoordsList([{ lat: loc.lat, lng: loc.lng }, null]);
                                                    }
                                                } else if (prevType === 'custom') {
                                                    if (customDestinations.length === 1) {
                                                        setCustomDestinations([...customDestinations, '']);
                                                        setDestCoordsList([...destCoordsList, null]);
                                                    }
                                                } else if (customDestinations.length === 0) {
                                                    setCustomDestinations(['', '']);
                                                    setDestCoordsList([null, null]);
                                                }
                                            } else if (l.id === 'custom') {
                                                if (prevType.startsWith('db_')) {
                                                    const loc = dbLocations.find(dl => `db_${dl.id}` === prevType);
                                                    if (loc) {
                                                        setCustomDestinations([loc.name]);
                                                        setDestCoordsList([{ lat: loc.lat, lng: loc.lng }]);
                                                    }
                                                }
                                            }
                                        }}
                                        style={{ flex: '1 1 45%' }}
                                    >
                                        <span>{l.icon}</span>
                                        {l.id === 'multi' ? 'Múltiples Destinos' : l.name}
                                    </button>
                                ))}
                            </div>

                            {/* Detalle Destino */}
                            {destType === 'custom' && (
                                <div className="mt-10">
                                    <AddressAutocomplete
                                        placeholder="Escribí la dirección exacta de destino..."
                                        value={customDestinations[0]}
                                        onChange={val => {
                                            const newD = [...customDestinations];
                                            newD[0] = val;
                                            setCustomDestinations(newD);
                                        }}
                                        onSelect={(lat, lng) => {
                                            const newC = [...destCoordsList];
                                            newC[0] = { lat, lng };
                                            setDestCoordsList(newC);
                                        }}
                                    />
                                </div>
                            )}
                            {destType === 'multi' && (
                                <div className="flex-col gap-10 mt-10">
                                    {/* Acceso rápido a guardados */}
                                    <div className="flex gap-10 overflow-x-auto pb-5 no-scrollbar" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '10px' }}>
                                        {dbLocations.map(loc => (
                                            <button
                                                key={loc.id}
                                                type="button"
                                                className="filter-btn"
                                                style={{ whiteSpace: 'nowrap', fontSize: '0.7rem', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}
                                                onClick={() => {
                                                    const emptyIdx = customDestinations.findIndex(o => !o || o.trim() === '');
                                                    const targetIdx = emptyIdx !== -1 ? emptyIdx : customDestinations.length;

                                                    const newD = [...customDestinations];
                                                    const newC = [...destCoordsList];

                                                    newD[targetIdx] = loc.name;
                                                    newC[targetIdx] = { lat: loc.lat, lng: loc.lng };

                                                    setCustomDestinations(newD);
                                                    setDestCoordsList(newC);
                                                }}
                                            >
                                                <span>{loc.icon || '📍'}</span> {loc.name}
                                            </button>
                                        ))}
                                    </div>

                                    {customDestinations.map((addr, idx) => (
                                        <div key={idx} className="flex gap-10 items-center">
                                            <div className="flex-col justify-center gap-5" style={{ minWidth: '35px', opacity: 0.7 }}>
                                                <div style={{ fontSize: '10px', fontWeight: 'bold', textAlign: 'center', marginBottom: '-2px' }}>{idx + 1}</div>
                                                <div className="flex-col gap-2">
                                                    <button type="button" className="filter-btn" style={{ padding: '2px', fontSize: '0.6rem', width: '100%', borderRadius: '4px' }} onClick={() => moveItem(customDestinations, setCustomDestinations, destCoordsList, setDestCoordsList, idx, 'up')} disabled={idx === 0}>▲</button>
                                                    <button type="button" className="filter-btn" style={{ padding: '2px', fontSize: '0.6rem', width: '100%', borderRadius: '4px' }} onClick={() => moveItem(customDestinations, setCustomDestinations, destCoordsList, setDestCoordsList, idx, 'down')} disabled={idx === customDestinations.length - 1}>▼</button>
                                                </div>
                                            </div>
                                            <div style={{ flexGrow: 1 }}>
                                                <AddressAutocomplete
                                                    placeholder={`Dirección ${idx + 1}`}
                                                    value={addr}
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
                                                <button className="filter-btn" type="button" onClick={() => {
                                                    setCustomDestinations(customDestinations.filter((_, i) => i !== idx));
                                                    setDestCoordsList(destCoordsList.filter((_, i) => i !== idx));
                                                }}>✕</button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className="filter-btn w-full"
                                        style={{ background: 'var(--glass-bg-secondary)', border: '1px dashed var(--glass-border)', padding: '12px' }}
                                        onClick={() => {
                                            setCustomDestinations([...customDestinations, '']);
                                            setDestCoordsList([...destCoordsList, null]);
                                        }}
                                    >
                                        ➕ Sumar Dirección Destino
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="flex-col gap-20" style={{ width: '100%' }}>
                            <div style={{ flex: 1 }}>
                                <label htmlFor="date" className="glass-label">Fecha del Viaje</label>
                                <input
                                    id="date"
                                    type="date"
                                    className="glass-input"
                                    min={minDateString}
                                    value={travelDate}
                                    onChange={e => setTravelDate(e.target.value)}
                                    onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                                    style={{ colorScheme: 'dark', cursor: 'pointer' }} // Force calendar icon visibility in some browsers
                                />
                                <div style={{ fontSize: '0.75rem', marginTop: '8px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                    ℹ️ Solo disponible con 48hs de anticipación. Para hoy o mañana: <a href="https://wa.me/5491150443328" style={{ color: 'var(--success-color)', fontWeight: 'bold' }}>Contacto urgente ↗</a>
                                </div>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label className="glass-label">Franja Horaria</label>
                                <div className="toggle-group">
                                    <button
                                        type="button"
                                        className={`toggle-btn ${travelTime === 'manana' ? 'active' : ''}`}
                                        onClick={() => setTravelTime('manana')}
                                        style={{ flex: 1 }}
                                    >
                                        ☀️ Mañana
                                    </button>
                                    <button
                                        type="button"
                                        className={`toggle-btn ${travelTime === 'mediodia' ? 'active' : ''}`}
                                        onClick={() => setTravelTime('mediodia')}
                                        style={{ flex: 1 }}
                                    >
                                        🕛 Medio día
                                    </button>
                                    <button
                                        type="button"
                                        className={`toggle-btn ${travelTime === 'tarde' ? 'active' : ''}`}
                                        onClick={() => setTravelTime('tarde')}
                                        style={{ flex: 1 }}
                                    >
                                        🌙 Tarde
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex-col gap-10">
                            <label className="glass-label">Identificación del Cliente</label>
                            <select
                                className="glass-select"
                                value={selectedCustomerId}
                                onChange={(e) => {
                                    console.log("Seleccionando cliente ID:", e.target.value);
                                    handleCustomerChange(e.target.value);
                                }}
                                style={{ fontSize: '1rem', padding: '12px', marginBottom: '10px' }}
                            >
                                <option value="new">🆕 Nuevo Cliente / Otro</option>
                                {Array.isArray(customers) && customers.length > 0 ? (
                                    customers.map(c => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))
                                ) : (
                                    <option disabled>Cargando clientes...</option>
                                )}
                            </select>

                            <label htmlFor="name" className="glass-label">{selectedCustomerId === 'new' ? 'Nombre / Empresa' : 'Cliente Seleccionado'}</label>
                            <input
                                id="name"
                                type="text"
                                className="glass-input"
                                value={customerName}
                                onChange={e => setCustomerName(e.target.value)}
                                placeholder="Nombre completo o Razón Social"
                                disabled={selectedCustomerId !== 'new'}
                                required
                            />
                        </div>

                        <button className="glass-button w-full mt-10" onClick={handleNext} disabled={!originType || !destType || !travelDate || !customerName || calculatingRoute}>
                            {calculatingRoute ? 'Calculando...' : 'Siguiente Paso →'}
                        </button>
                    </div>
                )}

                {step === 2 && (
                    <div className="flex-col gap-20">
                        <h2>2. Carga y Flota</h2>
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
                                            <button className="filter-btn" onClick={() => toggleVehicle(v.id, Math.max(0, qty - 1))}>-</button>
                                            <span style={{ fontWeight: 'bold' }}>{qty}</span>
                                            <button className="filter-btn" onClick={() => toggleVehicle(v.id, qty + 1)}>+</button>
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
                        <h2>3. Confirmación</h2>
                        <div className="glass-panel" style={{ padding: '20px', background: 'rgba(0,0,0,0.2)' }}>
                            <div className="flex-col gap-15">
                                <div>
                                    <div className="glass-label" style={{ fontSize: '0.7rem' }}>RUTA Y CRONOLOGÍA</div>
                                    <div style={{ fontSize: '0.85rem' }}>
                                        <strong>Origen:</strong>
                                        <div style={{ marginLeft: '10px' }}>
                                            {(originType.startsWith('db_')
                                                ? [dbLocations.find(l => `db_${l.id}` === originType)?.name]
                                                : customOrigins.filter(o => o.trim())).map((o, idx) => (
                                                    <div key={idx} style={{ marginTop: '2px' }}>• {o}</div>
                                                ))}
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.85rem', marginTop: '10px' }}>
                                        <strong>Destino:</strong>
                                        <div style={{ marginLeft: '10px' }}>
                                            {(destType.startsWith('db_')
                                                ? [dbLocations.find(l => `db_${l.id}` === destType)?.name]
                                                : customDestinations.filter(d => d.trim())).map((d, idx) => (
                                                    <div key={idx} style={{ marginTop: '2px' }}>• {d}</div>
                                                ))}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between gap-20">
                                    <div style={{ flex: 1 }}>
                                        <div className="glass-label" style={{ fontSize: '0.7rem' }}>FECHA Y TURNO</div>
                                        <div style={{ fontSize: '0.85rem' }}>
                                            {travelDate.split('-').reverse().join('/')} - {
                                                travelTime === 'manana' ? 'Mañana' :
                                                    travelTime === 'mediodia' ? 'Medio día' : 'Tarde'
                                            }
                                        </div>
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div className="glass-label" style={{ fontSize: '0.7rem' }}>DISTANCIA</div>
                                        <div style={{ fontSize: '0.85rem' }}>{distanceKm.toFixed(1)} km</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="glass-label" style={{ fontSize: '0.7rem' }}>FLOTA SOLICITADA</div>
                                    <div className="flex-col gap-5">
                                        {selectedVehicles.map(v => (
                                            <div key={v.id} style={{ fontSize: '0.85rem' }}>
                                                • {v.qty}x {vehiclesData.find(x => x.id === v.id)?.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="status-indicator badge-active" style={{ width: '100%', height: '1px', margin: '20px 0', opacity: 0.3 }} />

                            <div style={{ fontSize: '2rem', textAlign: 'center' }}>Total: <strong>${price.toLocaleString('es-AR')}</strong></div>
                            <p style={{ textAlign: 'center', fontSize: '0.75rem', marginTop: '10px', color: 'var(--text-secondary)' }}>
                                * Este valor es un <strong>presupuesto estimativo</strong>. Será evaluado y confirmado manualmente por nuestro equipo según detalles específicos de la carga.
                            </p>
                        </div>

                        <div className="flex-col gap-20">
                            <div style={{ flex: 1 }}>
                                <label htmlFor="po" className="glass-label">Nº Orden de Compra</label>
                                <input id="po" type="text" className="glass-input" value={purchaseOrder} onChange={e => setPurchaseOrder(e.target.value)} placeholder="Opcional" />
                            </div>
                            <div className="flex gap-20">
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="cuit" className="glass-label">CUIT / CUIL</label>
                                    <input id="cuit" type="text" className="glass-input" value={cuit} onChange={e => setCuit(e.target.value)} required />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label htmlFor="email" className="glass-label">Email</label>
                                    <input id="email" type="email" className="glass-input" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} required />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-20">
                            <div style={{ flex: 1 }}>
                                <label htmlFor="whatsapp1" className="glass-label">CONTACTO 1 / WHATSAPP</label>
                                <input id="whatsapp1" type="tel" className="glass-input" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="Ej: 5411..." required />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label htmlFor="whatsapp2" className="glass-label">CONTACTO 2 / WHATSAPP</label>
                                <input id="whatsapp2" type="tel" className="glass-input" value={customerPhone2} onChange={e => setCustomerPhone2(e.target.value)} placeholder="Opcional" />
                            </div>
                        </div>

                        <div className="flex-col gap-20">
                            <div style={{ flex: 1 }}>
                                <label className="glass-label">Condición IVA</label>
                                <div className="toggle-group" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                    <button
                                        type="button"
                                        className={`toggle-btn ${taxStatus === 'responsable_inscripto' ? 'active' : ''}`}
                                        onClick={() => setTaxStatus('responsable_inscripto')}
                                        style={{ padding: '10px' }}
                                    >
                                        RI
                                    </button>
                                    <button
                                        type="button"
                                        className={`toggle-btn ${taxStatus === 'monotributo' ? 'active' : ''}`}
                                        onClick={() => setTaxStatus('monotributo')}
                                        style={{ padding: '10px' }}
                                    >
                                        Monotributo
                                    </button>
                                    <button
                                        type="button"
                                        className={`toggle-btn ${taxStatus === 'consumidor_final' ? 'active' : ''}`}
                                        onClick={() => setTaxStatus('consumidor_final')}
                                        style={{ padding: '10px' }}
                                    >
                                        Cons. Final
                                    </button>
                                    <button
                                        type="button"
                                        className={`toggle-btn ${taxStatus === 'exento' ? 'active' : ''}`}
                                        onClick={() => setTaxStatus('exento')}
                                        style={{ padding: '10px' }}
                                    >
                                        Exento
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="flex-col gap-10">
                            <label htmlFor="obs" className="glass-label">Observaciones / Detalles adicionales</label>
                            <textarea
                                id="obs"
                                className="glass-input"
                                style={{ minHeight: '80px', paddingTop: '10px' }}
                                value={observations}
                                onChange={e => setObservations(e.target.value)}
                                placeholder="Escribe aquí cualquier detalle extra sobre la carga o el acceso..."
                            />
                        </div>

                        <div className="flex gap-20 mt-10">
                            <button type="button" className="filter-btn" style={{ flex: 1 }} onClick={handlePrev}>← Volver</button>
                            <button type="submit" className="glass-button" style={{ flex: 2, background: 'var(--accent-gradient)', padding: '15px', fontSize: '1.2rem' }} disabled={loading}>
                                {loading ? 'Procesando...' : '📝 GENERAR PEDIDO'}
                            </button>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textAlign: 'center', marginTop: '10px', opacity: 0.7, lineHeight: '1.4' }}>
                            <strong>Nota:</strong> Este presupuesto es estimativo y está sujeto a confirmación manual de disponibilidad y tarifas finales. No constituye un compromiso contractual.
                        </p>
                    </form>
                )}
            </div>
        </div >
    );
}
