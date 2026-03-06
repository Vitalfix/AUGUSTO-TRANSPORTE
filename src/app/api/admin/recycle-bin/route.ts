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
    const password = getPassword(request);
    if (!await authenticate(password)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Cleanup items older than 48 hours on every fetch (or we could use a cron)
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    await supabase.from('recycle_bin').delete().lt('deleted_at', fortyEightHoursAgo);

    const { data, error } = await supabase
        .from('recycle_bin')
        .select('*')
        .order('deleted_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data);
}

export async function POST(request: Request) {
    const password = getPassword(request);
    if (!await authenticate(password)) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { action, id } = body; // action: 'restore' | 'delete_permanently'

    if (action === 'restore') {
        const { data: binItem, error: fetchError } = await supabase
            .from('recycle_bin')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !binItem) return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 });

        // Restore to original table
        const { error: restoreError } = await supabase
            .from(binItem.table_name)
            .insert([binItem.data]);

        if (restoreError) return NextResponse.json({ error: 'Error al restaurar: ' + restoreError.message }, { status: 500 });

        // Remove from bin
        await supabase.from('recycle_bin').delete().eq('id', id);

        return NextResponse.json({ success: true });
    }

    if (action === 'delete_permanently') {
        const { error } = await supabase.from('recycle_bin').delete().eq('id', id);
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    }

    if (action === 'empty_bin') {
        const { error } = await supabase.from('recycle_bin').delete().neq('id', 0); // Delete all
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}
