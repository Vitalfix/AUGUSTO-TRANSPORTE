import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

export async function GET() {
    const { data, error } = await supabase
        .from('pricing_config')
        .select('*')
        .order('price_km', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(request: Request) {
    const password = getPassword(request);
    if (!await authenticate(password)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/(^_|_$)/g, '');

    const { data, error } = await supabase
        .from('pricing_config')
        .insert([
            {
                id,
                name,
                description,
                price_km: 0,
                price_hour: 0,
                price_wait_hour: 0,
                price_stay: 0
            }
        ])
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function PATCH(request: Request) {
    const password = getPassword(request);
    if (!await authenticate(password)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, description } = body;

    const { data, error } = await supabase
        .from('pricing_config')
        .update({
            name,
            description,
            updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function DELETE(request: Request) {
    const password = getPassword(request);
    if (!await authenticate(password)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'Falta el ID del vehículo' }, { status: 400 });

    // Move to recycle bin before deleting
    const { data: vehicle } = await supabase.from('pricing_config').select('*').eq('id', id).single();
    if (vehicle) {
        await supabase.from('recycle_bin').insert({
            original_id: vehicle.id.toString(),
            table_name: 'pricing_config',
            data: vehicle
        });
    }

    const { data, error } = await supabase
        .from('pricing_config')
        .delete()
        .eq('id', id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}
