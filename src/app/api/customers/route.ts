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

export async function GET(request: Request) {
    try {
        const password = getPassword(request);
        if (!await authenticate(password)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const password = getPassword(request);
        if (!await authenticate(password)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { name, email, phone, cuit, taxStatus } = body;

        // Try to find if customer exists or insert new
        const { data, error } = await supabase
            .from('customers')
            .upsert({ name, email, phone, cuit, tax_status: taxStatus }, { onConflict: 'name, phone' })
            .select()
            .maybeSingle();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const password = getPassword(request);
        if (!await authenticate(password)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { id, name, email, phone, cuit, taxStatus } = body;

        const { data, error } = await supabase
            .from('customers')
            .update({ name, email, phone, cuit, tax_status: taxStatus })
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
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

        const { error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
