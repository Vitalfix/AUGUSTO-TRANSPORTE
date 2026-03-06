import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    const { data: dbSetting } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'notification_emails')
        .maybeSingle();

    return NextResponse.json({ emails: dbSetting?.value || '' });
}

export async function POST(request: Request) {
    const password = request.headers.get('x-admin-password');

    const { data: dbPass } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'master_password')
        .single();

    if (password !== (dbPass?.value || '1234')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { action, value } = await request.json();

    if (action === 'update_emails') {
        const { error } = await supabase
            .from('site_settings')
            .upsert({ id: 'notification_emails', value: value, updated_at: new Date().toISOString() });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    } else if (action === 'update_password') {
        const { error } = await supabase
            .from('site_settings')
            .upsert({ id: 'master_password', value: value, updated_at: new Date().toISOString() });
        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
