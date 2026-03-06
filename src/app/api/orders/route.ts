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
        price: o.price,
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
        observations: o.observations,
        distanceKm: o.distance_km,
        travelHours: o.travel_hours
    }));

    return NextResponse.json(orders);
}

export async function POST(request: Request) {
    const body = await request.json();

    // Get the last order to generate the next sequential ID
    // We check BOTH 'orders' and 'recycle_bin' to ensure IDs are NEVER reused
    const { data: lastOrder } = await supabase
        .from('orders')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

    const { data: lastRecycled } = await supabase
        .from('recycle_bin')
        .select('original_id')
        .order('original_id', { ascending: false })
        .limit(1);

    const oId = lastOrder?.[0]?.id || '';
    const rId = lastRecycled?.[0]?.original_id || '';

    // Choose the lexicographically largest ID between active and deleted records
    const lastId = oId > rId ? oId : rId;

    // Default starting ID
    let id = 'A0001';

    // If the last ID follows the pattern [Letter][4 Numbers], calculate the next one
    const idPattern = /^[A-Z](\d{4})$/;
    const match = lastId.match(idPattern);

    if (match) {
        const letter = lastId.charAt(0);
        const number = parseInt(match[1], 10);

        if (number < 9999) {
            // Increment number: A0001 -> A0002
            id = letter + (number + 1).toString().padStart(4, '0');
        } else {
            // Increment letter and reset number: A9999 -> B0000
            const nextLetter = String.fromCharCode(letter.charCodeAt(0) + 1);
            id = nextLetter + '0000';
        }
    }

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
                bcc: bccEmails.length > 0 ? bccEmails : undefined,
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
        distanceKm, travelHours, cuit, taxStatus
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
    if (cuit !== undefined) updateData.cuit = cuit;
    if (taxStatus !== undefined) updateData.tax_status = taxStatus;

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
                            <p>Atentamente,<br/><strong>El equipo de EL CASAL</strong></p>
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
