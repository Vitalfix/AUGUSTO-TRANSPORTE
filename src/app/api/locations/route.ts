import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

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

// GET: List all locations
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('locations')
            .select('*')
            .order('name');

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data);
    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST: Add new location
export async function POST(req: Request) {
    try {
        const password = getPassword(req);
        const isAdmin = await authenticate(password);
        if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await req.json();
        const { name, lat, lng, icon } = body;

        const { data, error } = await supabase
            .from('locations')
            .insert([{ name, lat, lng, icon }])
            .select();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data[0]);
    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH: Update location
export async function PATCH(req: Request) {
    try {
        const password = getPassword(req);
        const isAdmin = await authenticate(password);
        if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const body = await req.json();
        const { id, name, lat, lng, icon } = body;

        const { data, error } = await supabase
            .from('locations')
            .update({ name, lat, lng, icon, updated_at: new Date() })
            .eq('id', id)
            .select();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json(data[0]);
    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE: Remove location
export async function DELETE(req: Request) {
    try {
        const password = getPassword(req);
        const isAdmin = await authenticate(password);
        if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

        const { error } = await supabase
            .from('locations')
            .delete()
            .eq('id', id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
