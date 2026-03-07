import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;

    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) return NextResponse.json({ error: 'Order not found' }, { status: 404 });

    // Map to frontend camelCase
    const order = {
        id: data.id,
        customerName: data.customer_name,
        vehicle: data.vehicle,
        destination: data.destination,
        origin: data.origin,
        price: data.price,
        status: data.status,
        createdAt: data.created_at,
        lat: data.lat,
        lng: data.lng,
        driverName: data.driver_name,
        driverPhone: data.driver_phone,
        licensePlate: data.license_plate,
        waitingMinutes: data.waiting_minutes,
        originLat: data.origin_lat,
        originLng: data.origin_lng,
        destLat: data.dest_lat,
        destLng: data.dest_lng,
        origin2Lat: data.origin2_lat,
        origin2Lng: data.origin2_lng,
        startedAt: data.started_at,
        finishedAt: data.finished_at,
        activityLog: data.activity_log || [],
        stops: data.stops || [],
        pricingBreakdown: (data.pricing_breakdown || []).map((item: any) => ({
            ...item,
            unitPrice: Math.round(item.unitPrice || 0),
            factor: Math.round(item.factor || 0),
            subtotal: Math.round(item.subtotal || 0)
        }))
    };

    return NextResponse.json(order);
}
