import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper to authenticate master password
async function authenticate(password: string) {
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

    if (!password || !await authenticate(password)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .order('name', { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(request: Request) {
    const password = getPassword(request);
    const body = await request.json();
    const { name, phone, license_plate, pin } = body;

    if (!password || !await authenticate(password)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('drivers')
        .insert([{ name, phone, license_plate, pin, is_active: true }])
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function PATCH(request: Request) {
    const password = getPassword(request);
    const body = await request.json();
    const { id, is_active, name, phone, license_plate, pin } = body;

    if (!password || !await authenticate(password)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const updateData: any = {};
    if (is_active !== undefined) updateData.is_active = is_active;
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (license_plate) updateData.license_plate = license_plate;
    if (pin) updateData.pin = pin;

    const { data, error } = await supabase
        .from('drivers')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function DELETE(request: Request) {
    const password = getPassword(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!password || !await authenticate(password)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { error } = await supabase
        .from('drivers')
        .delete()
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
}
