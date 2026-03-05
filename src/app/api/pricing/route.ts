import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .order('price_km', { ascending: true }); // Just order by some logic, or id

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Convert underscore fields to camelCase
    const formatted = data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        priceKm: item.price_km,
        priceHour: item.price_hour,
        priceWaitHour: item.price_wait_hour,
        priceStay: item.price_stay,
    }));

    return NextResponse.json(formatted);
}

export async function PATCH(request: Request) {
    const masterPassword = request.headers.get('x-admin-password');
    const body = await request.json();
    const { id, priceKm, priceHour, priceWaitHour, priceStay } = body;

    // DB master password
    const { data: dbPass } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'master_password')
        .single();

    const adminPass = dbPass?.value || '1234';

    if (!masterPassword || masterPassword !== adminPass) {
        return NextResponse.json({ error: 'Contraseña Incorrecta' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('pricing_config')
        .update({
            price_km: priceKm,
            price_hour: priceHour,
            price_wait_hour: priceWaitHour,
            price_stay: priceStay,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
}
