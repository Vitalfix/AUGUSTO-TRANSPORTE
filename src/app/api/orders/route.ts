import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function authenticate(password: string | null) {
    if (!password) return false;
    const { data: dbPass } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'master_password')
        .single();
    return (dbPass?.value || '1234') === password;
}

function getPassword(request: Request) {
    return request.headers.get('x-admin-password');
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const driverName = searchParams.get('driverName');

    const password = getPassword(request);
    const isAuthenticatedAdmin = await authenticate(password);

    if (!isAuthenticatedAdmin && !driverId) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

    // If it's a driver fetching, limit results
    if (!isAuthenticatedAdmin && driverId) {
        if (driverName) {
            query = query.or(`driver_id.eq.${driverId},driver_name.eq.${driverName}`);
        } else {
            query = query.eq('driver_id', driverId);
        }
    }

    const { data, error } = await query;

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Map database snake_case to our frontend camelCase
    const orders = data.map(o => ({
        id: o.id,
        customerName: o.customer_name,
        vehicle: o.vehicle,
        origin: o.origin,
        destination: o.destination,
        price: o.price ? Math.round(o.price) : 0,
        status: o.status,
        createdAt: o.created_at,
        travelDate: o.travel_date,
        travelTime: o.travel_time,
        cuit: o.cuit,
        taxStatus: o.tax_status,
        lat: o.lat,
        lng: o.lng,
        driverName: o.driver_name,
        driverPhone: o.driver_phone,
        licensePlate: o.license_plate,
        customerPhone: o.customer_phone,
        customerEmail: o.customer_email,
        driverId: o.driver_id,
        originLat: o.origin_lat,
        originLng: o.origin_lng,
        destLat: o.dest_lat,
        destLng: o.dest_lng,
        origin2Lat: o.origin2_lat,
        origin2Lng: o.origin2_lng,
        startedAt: o.started_at,
        finishedAt: o.finished_at,
        activityLog: o.activity_log || [],
        distanceKm: o.distance_km ? Math.round(o.distance_km) : 0,
        travelHours: o.travel_hours,
        purchaseOrder: o.purchase_order,
        pricingBreakdown: (o.pricing_breakdown || []).map((item: any) => ({
            ...item,
            unitPrice: Math.round(item.unitPrice || 0),
            factor: Math.round(item.factor || 0),
            subtotal: Math.round(item.subtotal || 0)
        })),
        stops: o.stops || []
    }));

    return NextResponse.json(orders);
}

export async function POST(request: Request) {
    const body = await request.json();

    // Get the last order to generate the next sequential ID
    // We check BOTH 'orders' and 'recycle_bin' to ensure IDs are NEVER reused
    const { data: ordersData } = await supabase.from('orders').select('id');
    const { data: recycledData } = await supabase.from('recycle_bin').select('original_id');

    const allIds = [
        ...(ordersData?.map(o => o.id) || []),
        ...(recycledData?.map(r => r.original_id) || [])
    ].filter(Boolean);

    let id = 'A0001';
    if (allIds.length > 0) {
        let maxLetter = 'A';
        let maxNum = 0;

        for (const currentKey of allIds) {
            const m = currentKey.match(/^([A-Z])(\d+)/);
            if (m) {
                const l = m[1];
                const n = parseInt(m[2], 10);
                if (l > maxLetter || (l === maxLetter && n > maxNum)) {
                    maxLetter = l;
                    maxNum = n;
                }
            }
        }

        if (maxNum < 9999) {
            id = maxLetter + (maxNum + 1).toString().padStart(4, '0');
        } else {
            const nextLetter = String.fromCharCode(maxLetter.charCodeAt(0) + 1);
            id = nextLetter + '0001';
        }
    }

    // Brute force safety check
    let isDuplicate = true;
    while (isDuplicate) {
        if (!allIds.includes(id)) {
            isDuplicate = false;
        } else {
            const m = id.match(/^([A-Z])(\d+)/);
            if (m) {
                const l = m[1];
                const n = parseInt(m[2], 10);
                if (n < 9999) {
                    id = l + (n + 1).toString().padStart(4, '0');
                } else {
                    id = String.fromCharCode(l.charCodeAt(0) + 1) + '0001';
                }
            }
        }
    }

    // Insert or update customer logic
    let finalCustomerId = body.customerId;

    try {
        if (body.customerName) {
            // Buscamos si ya existe un cliente con este nombre (insensible a mayúsculas)
            const { data: existing } = await supabase
                .from('customers')
                .select('id')
                .ilike('name', body.customerName.trim())
                .maybeSingle();

            if (existing) {
                finalCustomerId = existing.id;
                // Actualizamos datos si cambiaron (email, cuit, teléfono, etc)
                const updateData: any = {};
                if (body.customerEmail) updateData.email = body.customerEmail;
                if (body.cuit) updateData.cuit = body.cuit;
                if (body.taxStatus) updateData.tax_status = body.taxStatus;
                if (body.customerPhone) updateData.phone = body.customerPhone;

                if (Object.keys(updateData).length > 0) {
                    await supabase.from('customers').update(updateData).eq('id', finalCustomerId);
                }
            } else {
                // Creamos nuevo
                const { data: newCust, error: insErr } = await supabase
                    .from('customers')
                    .insert({
                        name: body.customerName,
                        email: body.customerEmail,
                        phone: body.customerPhone,
                        cuit: body.cuit,
                        tax_status: body.taxStatus
                    })
                    .select()
                    .single();

                if (newCust) {
                    finalCustomerId = (newCust as any).id;
                } else if (insErr) {
                    console.error("Customer creation failed, trying fallback search", insErr.message);
                    // Si falló por alguna restricción de email/cuit repetido, buscamos CUALQUIER cliente con ese nombre
                    const { data: fallback } = await supabase
                        .from('customers')
                        .select('id')
                        .eq('name', body.customerName)
                        .limit(1)
                        .maybeSingle();
                    if (fallback) finalCustomerId = fallback.id;
                }
            }
        }
    } catch (e) {
        console.error("Error evaluating customer changes", e);
    }

    // Insert the order with a flexible object to handle potential missing columns
    const orderData: any = {
        id,
        customer_name: body.customerName,
        vehicle: body.vehicle,
        destination: body.destination,
        price: body.price ? Math.round(body.price) : 0,
        origin: body.origin,
        travel_date: body.travelDate,
        travel_time: body.travelTime,
        cuit: body.cuit,
        tax_status: body.taxStatus,
        customer_email: body.customerEmail,
        customer_phone: body.customerPhone,
        status: 'PENDING',
        lat: body.lat,
        lng: body.lng,
        origin_lat: body.originLat,
        origin_lng: body.originLng,
        origin2_lat: body.origin2Lat,
        origin2_lng: body.origin2Lng,
        dest_lat: body.destLat,
        dest_lng: body.destLng,
        stops: body.stops || [],
        observations: body.observations,
        distance_km: body.distanceKm ? Math.round(body.distanceKm) : 0,
        travel_hours: body.travelHours,
        pricing_breakdown: body.pricingBreakdown ? body.pricingBreakdown.map((item: any) => ({
            ...item,
            unitPrice: Math.round(item.unitPrice || 0),
            factor: Math.round(item.factor || 0),
            subtotal: Math.round(item.subtotal || 0)
        })) : null,
        activity_log: body.pendingCustomerUpdateLog || [{ type: 'CREATED', label: 'Pedido Generado (Presupuesto Estimativo)', time: new Date().toISOString() }]
    };

    // Add columns that might be missing in older schemas (checked dynamically)
    // For now, we add them and if the insert fails, we'll know the schema needs update
    // But to be REALLY safe, we can try-catch the insert or just inform the user.
    // Given the error, we'll include them if we can.
    orderData.customer_id = finalCustomerId;
    orderData.purchase_order = body.purchaseOrder;

    let { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single();

    if (error && (error.message.includes('column "customer_id" does not exist') || error.message.includes('column "stops" does not exist'))) {
        console.warn("Schema missing new columns, retrying without them...");
        delete orderData.customer_id;
        delete orderData.purchase_order;
        delete orderData.stops;
        const retry = await supabase.from('orders').insert([orderData]).select().single();
        data = retry.data;
        error = retry.error;
    }

    // Fallback if 'observations' column does not exist yet
    if (error && error.message.includes('column "observations" of relation "orders" does not exist')) {
        const fallbackResult = await supabase
            .from('orders')
            .insert([
                {
                    id,
                    customer_name: body.customerName,
                    vehicle: body.vehicle,
                    destination: body.destination,
                    price: body.price,
                    origin: body.origin,
                    travel_date: body.travelDate,
                    travel_time: body.travelTime,
                    cuit: body.cuit,
                    customer_email: body.customerEmail,
                    customer_phone: body.customerPhone,
                    status: 'PENDING',
                    lat: body.lat,
                    lng: body.lng,
                    origin_lat: body.originLat,
                    origin_lng: body.originLng,
                    origin2_lat: body.origin2Lat,
                    origin2_lng: body.origin2Lng,
                    dest_lat: body.destLat,
                    dest_lng: body.destLng,
                    distance_km: body.distanceKm,
                    travel_hours: body.travelHours,
                    purchase_order: body.purchaseOrder,
                    // Store observations in activity_log as fallback
                    activity_log: [{
                        type: 'CREATED',
                        label: 'Pedido Generado (Presupuesto Estimativo)',
                        time: new Date().toISOString(),
                        observations_fallback: body.observations
                    }]
                }
            ])
            .select()
            .single();
        data = fallbackResult.data;
        error = fallbackResult.error;
    }

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    try {
        const { data: dbSetting } = await supabase
            .from('site_settings')
            .select('value')
            .eq('id', 'notification_emails')
            .maybeSingle();
        const bccEmails = dbSetting?.value ? dbSetting.value.split(',').map((e: string) => e.trim()).filter(Boolean) : [];

        // Admin Notification
        await resend.emails.send({
            from: 'EL CASAL <onboarding@resend.dev>',
            to: 'vitalfix@gmail.com',
            bcc: bccEmails.length > 0 ? bccEmails : undefined,
            subject: `Nueva Solicitud: ${id}`,
            html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
            <h2 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">Nueva solicitud de presupuesto</h2>
            <p style="font-size: 1.1rem;"><strong>ID de Pedido:</strong> <span style="color: #2563eb;">${id}</span></p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            
            <p style="margin: 5px 0;"><strong>Cliente:</strong> ${body.customerName}</p>
            <p style="margin: 5px 0;"><strong>CUIT:</strong> ${body.cuit || 'N/A'}</p>
            <p style="margin: 5px 0;"><strong>Condición IVA:</strong> ${body.taxStatus || 'No especificado'}</p>
            <p style="margin: 5px 0;"><strong>Contacto:</strong> ${body.customerPhone}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${body.customerEmail || 'No provisto'}</p>
            ${body.purchaseOrder ? `<p style="margin: 5px 0;"><strong>Nº Orden de Compra:</strong> ${body.purchaseOrder}</p>` : ''}
            
            <div style="margin: 20px 0; padding: 20px; background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0;">
                <p style="margin-top: 0; margin-bottom: 12px; font-size: 1.1rem;"><strong>📦 Vehículo(s):</strong><br/>${body.vehicle.split(/[|,]/).map((v: string) => v.trim()).filter(Boolean).join('<br/>')}</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
                <p style="margin-top: 0; margin-bottom: 12px;"><strong>📍 Origen:</strong><br/>
                    <span style="color: #475569;">${body.origin.split(/[|]/).map((s: string) => s.trim()).filter(Boolean).join('<br/>')}</span>
                </p>
                <p style="margin-top: 0; margin-bottom: 12px;"><strong>🏁 Destino:</strong><br/>
                    <span style="color: #475569;">${body.destination.split(/[|]/).map((s: string) => s.trim()).filter(Boolean).join('<br/>')}</span>
                </p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 15px 0;" />
                <p style="margin-bottom: 0;"><strong>📅 Fecha/Hora:</strong> ${body.travelDate} (${body.travelTime})</p>
            </div>

            <p style="margin: 20px 0;"><strong>📝 Observaciones:</strong><br/>
               <span style="color: #475569;">${(body.observations || 'Sin observaciones').replace(/\n/g, '<br/>')}</span>
            </p>

            <div style="margin-top: 25px; padding: 20px; background: #ecfdf5; border-radius: 12px; border: 1px solid #10b981; text-align: center;">
                <p style="margin: 0; font-size: 1.4rem; font-weight: bold; color: #065f46;">Total Estimado: $${body.price.toLocaleString('es-AR')}</p>
            </div>

            <div style="margin-top: 30px; text-align: center;">
                <a href="https://transport-app-lilac-beta.vercel.app/tracking/${id}" style="display: inline-block; padding: 16px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 1.1rem; box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.3);">ABRIR SEGUIMIENTO</a>
            </div>

            <div style="margin-top: 40px; padding: 15px; border-top: 1px solid #e2e8f0; font-size: 0.75rem; color: #94a3b8; text-align: center; line-height: 1.4;">
                <strong>Aviso Legal:</strong> Los presupuestos generados en este sitio son de carácter estimativo e informativo. No constituyen una oferta contractual vinculante y están sujetos a revisión y confirmación manual por parte de EL CASAL. Ni los propietarios del servicio ni los desarrolladores de la plataforma se responsabilizan por errores, variaciones de tarifas, fallos técnicos o el uso de la información aquí proporcionada. El uso de esta web implica la aceptación de estos términos.
            </div>
        </div>
      `
        });

        // Customer Confirmation (Optional but recommended by UI)
        if (body.customerEmail) {
            await resend.emails.send({
                from: 'EL CASAL <onboarding@resend.dev>',
                to: body.customerEmail,
                bcc: bccEmails.length > 0 ? bccEmails : undefined,
                subject: `Recibimos tu solicitud de presupuesto - ID ${id}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; color: white;">
                             <img src="https://transport-app-lilac-beta.vercel.app/logo.jpg" alt="EL CASAL" style="max-width: 150px; border-radius: 8px; margin-bottom: 10px; background: white; padding: 5px;">
                            <h1 style="margin: 0; font-size: 24px;">EL CASAL</h1>
                            <p style="margin: 10px 0 0; opacity: 0.9;">Tu solicitud ha sido recibida</p>
                        </div>
                        <div style="padding: 30px; color: #1e293b; line-height: 1.6;">
                            <h2 style="color: #3b82f6; margin-top: 0;">¡Gracias por contactarnos!</h2>
                            <p>Hola <strong>${body.customerName}</strong>,</p>
                            <p>Hemos recibido correctamente tu pedido de presupuesto con el ID: <strong><span style="color: #2563eb;">${id}</span></strong>.</p>
                            ${body.purchaseOrder ? `<p><strong>Nº Orden de Compra:</strong> ${body.purchaseOrder}</p>` : ''}
                            
                            <div style="margin: 20px 0; padding: 15px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0;">
                                <p style="margin-top: 0; margin-bottom: 10px;"><strong>📍 Origen:</strong><br/>
                                    ${body.origin.split(/[|]/).map((s: string) => s.trim()).filter(Boolean).join('<br/>')}
                                </p>
                                <p style="margin-bottom: 0;"><strong>🏁 Destino:</strong><br/>
                                    ${body.destination.split(/[|]/).map((s: string) => s.trim()).filter(Boolean).join('<br/>')}
                                </p>
                            </div>

                            <p style="background: #fffbeb; padding: 15px; border-radius: 8px; border-left: 4px solid #f59e0b; color: #92400e;">
                                <strong>Nota Importante:</strong> El presupuesto de <strong style="color: #059669;">$${body.price.toLocaleString('es-AR')}</strong> es de carácter <strong>estimativo</strong>. Nuestro equipo evaluará los detalles manualmente y te contactará a la brevedad para confirmar el valor definitivo y la disponibilidad.
                            </p>
                            
                            <div style="margin: 30px 0; text-align: center;">
                                <p style="font-size: 14px; color: #64748b; margin-bottom: 15px;">Podés consultar el estado de tu pedido en cualquier momento:</p>
                                <a href="https://transport-app-lilac-beta.vercel.app/tracking/${id}" style="display: inline-block; padding: 14px 28px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);">ABRIR SEGUIMIENTO</a>
                            </div>

                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                            
                            <div style="font-size: 0.75rem; color: #94a3b8; text-align: center; line-height: 1.4; margin-bottom: 20px;">
                                <strong>Aviso Legal:</strong> Los presupuestos generados en este sitio son de carácter estimativo e informativo. No constituyen una oferta contractual vinculante y están sujetos a revisión y confirmación manual por parte de EL CASAL. Ni los propietarios del servicio ni los desarrolladores de la plataforma se responsabilizan por errores, variaciones de tarifas, fallos técnicos o el uso de la información aquí proporcionada. El uso de esta web implica la aceptación de estos términos.
                            </div>
                            <p style="text-align: center;">Atentamente,<br/><strong>El equipo de EL CASAL</strong></p>
                        </div>
                    </div>
                `
            });
        }
    } catch (emailError) {
        console.error("Error enviando email", emailError);
    }

    return NextResponse.json({
        id: data.id,
        customerName: data.customer_name,
        vehicle: data.vehicle,
        destination: data.destination,
        price: data.price,
        status: data.status,
        lat: data.lat,
        lng: data.lng
    }, { status: 201 });
}

export async function PATCH(request: Request) {
    const password = getPassword(request);
    const isAdmin = await authenticate(password);

    const body = await request.json();

    if (!isAdmin) {
        // Allow driver updates for specific fields ONLY (GPS, Status, Wait Time, etc.)
        const allowedDriverFields = ['id', 'status', 'lat', 'lng', 'waitingMinutes', 'activityLog'];
        const bodyKeys = Object.keys(body);

        const hasUnauthorizedFields = bodyKeys.some(key => !allowedDriverFields.includes(key));

        if (hasUnauthorizedFields) {
            return NextResponse.json({ error: 'Campos no permitidos para el chofer' }, { status: 401 });
        }
    }
    const {
        id, status, lat, lng, price, driverName, driverPhone, licensePlate,
        waitingMinutes, driverId, origin, destination, vehicle, travelDate,
        travelTime, customerName, customerEmail, customerPhone, observations,
        distanceKm, travelHours, cuit, taxStatus, purchaseOrder
    } = body;

    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (lat !== undefined) updateData.lat = lat;
    if (lng !== undefined) updateData.lng = lng;
    if (price !== undefined) updateData.price = Math.round(price);
    if (driverName !== undefined) updateData.driver_name = driverName;
    if (driverPhone !== undefined) updateData.driver_phone = driverPhone;
    if (licensePlate !== undefined) updateData.license_plate = licensePlate;
    if (waitingMinutes !== undefined) updateData.waiting_minutes = waitingMinutes;
    if (driverId !== undefined) updateData.driver_id = driverId;
    if (origin !== undefined) updateData.origin = origin;
    if (destination !== undefined) updateData.destination = destination;
    if (vehicle !== undefined) updateData.vehicle = vehicle;
    if (travelDate !== undefined) updateData.travel_date = travelDate;
    if (travelTime !== undefined) updateData.travel_time = travelTime;
    if (customerName !== undefined) updateData.customer_name = customerName;
    if (customerEmail !== undefined) updateData.customer_email = customerEmail;
    if (customerPhone !== undefined) updateData.customer_phone = customerPhone;
    if (observations !== undefined) updateData.observations = observations;
    if (distanceKm !== undefined) updateData.distance_km = Math.round(distanceKm);
    if (travelHours !== undefined) updateData.travel_hours = travelHours;
    if (cuit !== undefined) updateData.cuit = cuit;
    if (taxStatus !== undefined) updateData.tax_status = taxStatus;
    if (purchaseOrder !== undefined) updateData.purchase_order = purchaseOrder;
    if (body.pricingBreakdown !== undefined) {
        updateData.pricing_breakdown = body.pricingBreakdown.map((item: any) => ({
            ...item,
            unitPrice: Math.round(item.unitPrice || 0),
            factor: Math.round(item.factor || 0),
            subtotal: Math.round(item.subtotal || 0)
        }));
    }

    // Fetch current log to append
    const { data: currentOrder } = await supabase.from('orders').select('activity_log').eq('id', id).single();
    let currentLog = body.activityLog || currentOrder?.activity_log || [];

    if (status === 'STARTED') {
        updateData.started_at = new Date().toISOString();
    }
    if (status === 'FINISHED') {
        updateData.finished_at = new Date().toISOString();
    }

    const userLabel = isAdmin ? 'Administración' : (driverName || 'Chofer');

    if (status === 'STARTED') {
        currentLog = [...currentLog, { type: 'STARTED', label: 'Viaje Iniciado', time: new Date().toISOString(), user: userLabel }];
    } else if (status === 'FINISHED') {
        currentLog = [...currentLog, { type: 'FINISHED', label: 'Viaje Finalizado', time: new Date().toISOString(), user: userLabel }];
    } else if (status === 'CONFIRMED') {
        currentLog = [...currentLog, { type: 'CONFIRMED', label: 'PEDIDO PROGRAMADO', time: new Date().toISOString(), user: userLabel }];
    } else if (status === 'APPROVED') {
        currentLog = [...currentLog, { type: 'APPROVED', label: 'PRESUPUESTO APROBADO', time: new Date().toISOString(), user: userLabel }];
    } else if (status === 'INVOICED') {
        currentLog = [...currentLog, { type: 'INVOICED', label: 'ORDEN FACTURADA', time: new Date().toISOString(), user: userLabel }];
    } else if (status === 'PAID') {
        currentLog = [...currentLog, { type: 'PAID', label: 'PAGO RECIBIDO / COBRADO', time: new Date().toISOString(), user: userLabel }];
    } else if (status === 'ARRIVED_ORIGIN') {
        currentLog = [...currentLog, { type: 'ARRIVED_ORIGIN', label: 'Chofer llegó a Origen', time: new Date().toISOString(), user: userLabel }];
    } else if (status === 'ARRIVED_DESTINATION') {
        currentLog = [...currentLog, { type: 'ARRIVED_DESTINATION', label: 'Chofer llegó a Destino', time: new Date().toISOString(), user: userLabel }];
    }

    updateData.activity_log = currentLog;

    const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Fetch bcc emails
    const { data: dbSetting } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'notification_emails')
        .maybeSingle();
    const bccEmails = dbSetting?.value ? dbSetting.value.split(',').map((e: string) => e.trim()).filter(Boolean) : [];

    // Notificaciones
    if (status === 'CONFIRMED' && data.customer_email) {
        try {
            await resend.emails.send({
                from: 'EL CASAL <onboarding@resend.dev>',
                to: data.customer_email,
                bcc: bccEmails.length > 0 ? bccEmails : undefined,
                subject: `¡Pedido Confirmado! - ID ${id}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center; color: white;">
                            <h1 style="margin: 0; font-size: 24px;">EL CASAL</h1>
                            <p style="margin: 10px 0 0; opacity: 0.9;">¡Tu viaje ha sido programado!</p>
                        </div>
                        <div style="padding: 30px; color: #1e293b; line-height: 1.6;">
                            <h2 style="color: #10b981; margin-top: 0;">Reserva Confirmada ✅</h2>
                            <p>Hola <strong>${data.customer_name}</strong>,</p>
                            <p>Tu servicio para el día <strong>${data.travel_date}</strong> a las <strong>${data.travel_time}</strong> ha sido confirmado exitosamente.</p>
                            
                            <div style="padding: 20px; background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; margin: 25px 0;">
                                <h3 style="margin-top: 0; font-size: 16px; color: #64748b;">DETALLES DEL TRASLADO:</h3>
                                <p style="margin: 5px 0;"><strong>👤 Chofer:</strong> ${data.driver_name || 'Asignado'}</p>
                                <p style="margin: 5px 0;"><strong>🚛 Vehículo:</strong> ${data.license_plate ? 'Patente ' + data.license_plate : 'En camino'}</p>
                                <p style="margin: 5px 0;"><strong>💰 Costo final:</strong> $${data.price.toLocaleString('es-AR')}</p>
                            </div>

                            <div style="margin: 30px 0; text-align: center;">
                                <p style="font-size: 14px; color: #64748b; margin-bottom: 15px;">Accedé al seguimiento satelital y detalles aquí:</p>
                                <a href="https://transport-app-lilac-beta.vercel.app/tracking/${id}" style="display: inline-block; padding: 14px 28px; background: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 6px rgba(16, 185, 129, 0.2);">SEGUIMIENTO EN VIVO</a>
                            </div>

                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                            
                            <div style="font-size: 0.75rem; color: #94a3b8; text-align: center; line-height: 1.4; margin-bottom: 20px;">
                                <strong>Aviso Legal:</strong> Los presupuestos generados en este sitio son de carácter estimativo e informativo. No constituyen una oferta contractual vinculante y están sujetos a revisión y confirmación manual por parte de EL CASAL. Ni los propietarios del servicio ni los desarrolladores de la plataforma se responsabilizan por errores, variaciones de tarifas, fallos técnicos o el uso de la información aquí proporcionada. El uso de esta web implica la aceptación de estos términos.
                            </div>

                            <p style="text-align: center;">Atentamente,<br/><strong>El equipo de EL CASAL</strong></p>
                        </div>
                    </div>
                `
            });
        } catch (e) { console.error("Error email confirmado", e); }
    }

    // Notificaciones de llegada (DESACTIVADAS PARA AHORRAR CUOTA DE EMAILS)
    /* 
    if ((status === 'ARRIVED_ORIGIN' || status === 'ARRIVED_DESTINATION') && data.customer_email) {
       ...
    } 
    */

    // Notificación de Inicio (DESACTIVADA PARA AHORRAR CUOTA DE EMAILS)
    /*
    if (status === 'STARTED' && data.customer_email) {
       ...
    }
    */

    // Notificación de Fin de Viaje (DESACTIVADA PARA AHORRAR CUOTA DE EMAILS)
    /*
    if (status === 'FINISHED' && data.customer_email) {
        try {
            const total = data.price;
            await resend.emails.send({
                from: 'EL CASAL <onboarding@resend.dev>',
                to: data.customer_email,
                bcc: bccEmails.length > 0 ? bccEmails : undefined,
                subject: `Viaje Finalizado - Resumen ID ${id}`,
                html: `
                    <h2>¡Entrega Realizada! ✅</h2>
                    <p>El pedido <strong>${id}</strong> ha sido entregado correctamente.</p>
                    <p><strong>Total Final Estimativo:</strong> $${total.toLocaleString('es-AR')}</p>
                    <p>Gracias por confiar en EL CASAL.</p>
                `
            });
        } catch (e) { console.error("Error email fin", e); }
    }
    */

    return NextResponse.json(data);
}

export async function DELETE(request: Request) {
    try {
        const password = getPassword(request);
        if (!await authenticate(password)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

        // Move to recycle bin before deleting
        const { data: order } = await supabase.from('orders').select('*').eq('id', id).single();
        if (order) {
            await supabase.from('recycle_bin').insert({
                original_id: order.id,
                table_name: 'orders',
                data: order
            });
        }

        const { data: deletedRows, error } = await supabase
            .from('orders')
            .delete()
            .eq('id', id)
            .select();

        if (error) throw error;

        if (!deletedRows || deletedRows.length === 0) {
            return NextResponse.json({ error: 'No se pudo borrar el registro (posible problema de permisos en la DB)' }, { status: 403 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
