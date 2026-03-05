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
    const password = getPassword(request);
    if (!await authenticate(password)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Map database snake_case to our frontend camelCase
    const orders = data.map(o => ({
        id: o.id,
        customerName: o.customer_name,
        vehicle: o.vehicle,
        origin: o.origin,
        destination: o.destination,
        price: o.price,
        status: o.status,
        createdAt: o.created_at,
        travelDate: o.travel_date,
        travelTime: o.travel_time,
        cuit: o.cuit,
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
        observations: o.observations,
        distanceKm: o.distance_km,
        travelHours: o.travel_hours
    }));

    return NextResponse.json(orders);
}

export async function POST(request: Request) {
    const body = await request.json();
    const id = Math.random().toString(36).substring(2, 9).toUpperCase();

    // Insert the order
    let { data, error } = await supabase
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
                observations: body.observations,
                distance_km: body.distanceKm,
                travel_hours: body.travelHours,
                activity_log: [{ type: 'CREATED', label: 'Pedido Generado (Presupuesto Estimativo)', time: new Date().toISOString() }]
            }
        ])
        .select()
        .single();

    // Detect customer data changes for existing customers or create new ones
    try {
        if (body.customerId) {
            const { data: existingCustomer } = await supabase
                .from('customers')
                .select('*')
                .eq('id', body.customerId)
                .single();

            if (existingCustomer) {
                const phoneHasChanged = body.customerPhone !== existingCustomer.phone;
                const emailHasChanged = body.customerEmail !== (existingCustomer.email || '');
                const cuitHasChanged = body.cuit !== (existingCustomer.cuit || '');
                const taxStatusHasChanged = body.taxStatus !== (existingCustomer.tax_status || 'responsable_inscripto');

                if (phoneHasChanged || emailHasChanged || cuitHasChanged || taxStatusHasChanged) {
                    const log: any[] = [{ type: 'CREATED', label: 'Pedido Generado (Presupuesto Estimativo)', time: new Date().toISOString() }];
                    log.push({
                        type: 'CUSTOMER_UPDATE_PENDING',
                        label: 'El cliente ha modificado sus datos. ¿Actualizar perfil?',
                        time: new Date().toISOString(),
                        newData: { phone: body.customerPhone, email: body.customerEmail, cuit: body.cuit, tax_status: body.taxStatus, id: body.customerId }
                    });
                    await supabase.from('orders').update({ activity_log: log }).eq('id', id);
                }
            }
        } else if (body.customerName) {
            // Just insert new customer normally if no customerId is provided
            await supabase
                .from('customers')
                .upsert({
                    name: body.customerName,
                    email: body.customerEmail,
                    phone: body.customerPhone,
                    cuit: body.cuit,
                    tax_status: body.taxStatus
                }, { onConflict: 'name, phone' });
        }
    } catch (e) {
        console.error("Error evaluating customer changes", e);
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
        // Admin Notification
        await resend.emails.send({
            from: 'EL CASAL <onboarding@resend.dev>',
            to: 'vitalfix@gmail.com',
            subject: `Nueva Solicitud: ${id}`,
            html: `
        <h2 style="color: #3b82f6;">Nueva solicitud de presupuesto (A Confirmar)</h2>
        <p><strong>ID de Pedido:</strong> ${id}</p>
        <p><strong>Cliente:</strong> ${body.customerName} (CUIT: ${body.cuit || 'N/A'})</p>
        <p><strong>Condición IVA:</strong> ${body.taxStatus || 'No especificado'}</p>
        <p><strong>Contacto:</strong> ${body.customerPhone}</p>
        <p><strong>Vehículo(s):</strong> ${body.vehicle}</p>
        <p><strong>Ruta:</strong> ${body.origin} -> ${body.destination}</p>
        <p><strong>Fecha/Hora:</strong> ${body.travelDate} (${body.travelTime})</p>
        <p><strong>Observaciones:</strong> ${body.observations || 'Sin observaciones'}</p>
        <p style="font-size: 1.2rem; font-weight: bold; color: #10b981;">Total Estimado (Cálculo Web): $${body.price.toLocaleString('es-AR')}</p>
        <hr/>
        <p><strong>Acción necesaria:</strong> Revisar detalles de la carga, ajustar el precio si es necesario y contactar al cliente para confirmar el servicio.</p>
        <a href="https://transport-app-lilac-beta.vercel.app/admin" style="display: inline-block; padding: 10px 20px; background: #3b82f6; color: white; text-decoration: none; border-radius: 5px;">Ir al Panel Admin</a>
      `
        });

        // Customer Confirmation (Optional but recommended by UI)
        if (body.customerEmail) {
            await resend.emails.send({
                from: 'EL CASAL <onboarding@resend.dev>',
                to: body.customerEmail,
                subject: `Recibimos tu solicitud de presupuesto - ID ${id}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; color: white;">
                            <h1 style="margin: 0; font-size: 24px;">EL CASAL</h1>
                            <p style="margin: 10px 0 0; opacity: 0.9;">Tu solicitud ha sido recibida</p>
                        </div>
                        <div style="padding: 30px; color: #1e293b; line-height: 1.6;">
                            <h2 style="color: #3b82f6; margin-top: 0;">¡Gracias por tu solicitud!</h2>
                            <p>Hola <strong>${body.customerName}</strong>,</p>
                            <p>Hemos recibido tu pedido de presupuesto estimativo con el ID: <strong>${id}</strong>.</p>
                            <p><strong>Aviso importante:</strong> El presupuesto de <strong>$${body.price.toLocaleString('es-AR')}</strong> es <strong>estimativo</strong>. Nuestro equipo evaluará los detalles y te contactará para confirmar el presupuesto definitivo.</p>
                            
                            <div style="margin: 30px 0; text-align: center;">
                                <p style="font-size: 14px; color: #64748b; margin-bottom: 15px;">Podes ver los detalles de tu solicitud aquí:</p>
                                <a href="https://transport-app-lilac-beta.vercel.app/tracking/${id}" style="display: inline-block; padding: 14px 28px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);">Ver Estado del Pedido</a>
                            </div>

                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
                            <p>Cualquier duda, podés escribirnos por WhatsApp.</p>
                            <p>Atentamente,<br/><strong>El equipo de EL CASAL</strong></p>
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
    if (!await authenticate(password)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
        id, status, lat, lng, price, driverName, driverPhone, licensePlate,
        waitingMinutes, driverId, origin, destination, vehicle, travelDate,
        travelTime, customerName, customerEmail, customerPhone, observations,
        distanceKm, travelHours
    } = body;

    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (lat !== undefined) updateData.lat = lat;
    if (lng !== undefined) updateData.lng = lng;
    if (price !== undefined) updateData.price = price;
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
    if (distanceKm !== undefined) updateData.distance_km = distanceKm;
    if (travelHours !== undefined) updateData.travel_hours = travelHours;

    // Fetch current log to append
    const { data: currentOrder } = await supabase.from('orders').select('activity_log').eq('id', id).single();
    let currentLog = body.activityLog || currentOrder?.activity_log || [];

    if (status === 'STARTED') {
        updateData.started_at = new Date().toISOString();
    }
    if (status === 'FINISHED') {
        updateData.finished_at = new Date().toISOString();
    }

    if (status === 'STARTED') {
        currentLog = [...currentLog, { type: 'STARTED', label: 'Viaje Iniciado', time: new Date().toISOString() }];
    } else if (status === 'FINISHED') {
        currentLog = [...currentLog, { type: 'FINISHED', label: 'Viaje Finalizado', time: new Date().toISOString() }];
    } else if (status === 'CONFIRMED') {
        currentLog = [...currentLog, { type: 'CONFIRMED', label: 'PEDIDO PROGRAMADO', time: new Date().toISOString() }];
    } else if (status === 'APPROVED') {
        currentLog = [...currentLog, { type: 'APPROVED', label: 'PRESUPUESTO APROBADO', time: new Date().toISOString() }];
    } else if (status === 'INVOICED') {
        currentLog = [...currentLog, { type: 'INVOICED', label: 'ORDEN FACTURADA', time: new Date().toISOString() }];
    } else if (status === 'PAID') {
        currentLog = [...currentLog, { type: 'PAID', label: 'PAGO RECIBIDO / COBRADO', time: new Date().toISOString() }];
    } else if (status === 'ARRIVED_ORIGIN') {
        currentLog = [...currentLog, { type: 'ARRIVED_ORIGIN', label: 'Chofer llegó a Origen', time: new Date().toISOString() }];
    } else if (status === 'ARRIVED_DESTINATION') {
        currentLog = [...currentLog, { type: 'ARRIVED_DESTINATION', label: 'Chofer llegó a Destino', time: new Date().toISOString() }];
    }

    updateData.activity_log = currentLog;

    const { data, error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Notificaciones
    if (status === 'CONFIRMED' && data.customer_email) {
        try {
            await resend.emails.send({
                from: 'EL CASAL <onboarding@resend.dev>',
                to: data.customer_email,
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
                            <p>Atentamente,<br/><strong>El equipo de EL CASAL</strong></p>
                        </div>
                    </div>
                `
            });
        } catch (e) { console.error("Error email confirmado", e); }
    }

    // Notificaciones de llegada
    if ((status === 'ARRIVED_ORIGIN' || status === 'ARRIVED_DESTINATION') && data.customer_email) {
        const msg = status === 'ARRIVED_ORIGIN' ? 'el chofer ha llegado al origen' : 'el chofer ha llegado al destino';
        try {
            await resend.emails.send({
                from: 'EL CASAL <onboarding@resend.dev>',
                to: data.customer_email,
                subject: `Actualización de tu pedido - ID ${id}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <div style="background: #f8fafc; padding: 30px; text-align: center; border-bottom: 1px solid #e2e8f0;">
                            <h1 style="margin: 0; font-size: 24px; color: #1e293b;">EL CASAL</h1>
                        </div>
                        <div style="padding: 30px; color: #1e293b; line-height: 1.6; text-align: center;">
                            <div style="font-size: 40px; margin-bottom: 10px;">📍</div>
                            <h2 style="margin-top: 0;">Actualización importante</h2>
                            <p>Te informamos que <strong>${msg}</strong>.</p>
                            
                            <div style="margin: 30px 0;">
                                <a href="https://transport-app-lilac-beta.vercel.app/tracking/${id}" style="display: inline-block; padding: 14px 28px; background: #1e293b; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Ver Mapa en Vivo</a>
                            </div>
                        </div>
                    </div>
                `
            });
        } catch (e) { console.error("Error email llegada", e); }
    }

    if (status === 'STARTED' && data.customer_email) {
        try {
            await resend.emails.send({
                from: 'EL CASAL <onboarding@resend.dev>',
                to: data.customer_email,
                subject: `¡Tu viaje ha iniciado! - ID ${id}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                        <div style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center; color: white;">
                            <h1 style="margin: 0; font-size: 24px;">EL CASAL</h1>
                            <p style="margin: 10px 0 0; opacity: 0.9;">Seguimiento en Tiempo Real</p>
                        </div>
                        <div style="padding: 30px; color: #1e293b; line-height: 1.6;">
                            <h2 style="color: #3b82f6; margin-top: 0;">Tu envío está en camino 🚚</h2>
                            <p>Te informamos que el vehículo ya inició el recorrido hacia el destino.</p>
                            <p><strong>Chofer:</strong> ${data.driver_name || 'Asignado'} (${data.license_plate || ''})</p>
                            
                            <div style="margin: 30px 0; text-align: center;">
                                <a href="https://transport-app-lilac-beta.vercel.app/tracking/${id}" style="display: inline-block; padding: 14px 28px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: bold; box-shadow: 0 4px 6px rgba(59, 130, 246, 0.2);">SEGUIR EN EL MAPA</a>
                            </div>

                            <p style="font-size: 0.9em; color: #64748b;">Podrás ver la ubicación exacta del vehículo y el tiempo estimado de llegada.</p>
                        </div>
                    </div>
                `
            });
        } catch (e) { console.error("Error email inicio", e); }
    }

    if (status === 'FINISHED' && data.customer_email) {
        try {
            const total = data.price;
            await resend.emails.send({
                from: 'EL CASAL <onboarding@resend.dev>',
                to: data.customer_email,
                subject: `Viaje Finalizado - Resumen ID ${id}`,
                html: `
                    <h2>¡Entrega Realizada! ✅</h2>
                    <p>El pedido <strong>${id}</strong> ha sido entregado correctamente.</p>
                    <p><strong>Total Final:</strong> $${total.toLocaleString('es-AR')}</p>
                    <p>Gracias por confiar en EL CASAL.</p>
                `
            });
        } catch (e) { console.error("Error email fin", e); }
    }

    return NextResponse.json(data);
}
