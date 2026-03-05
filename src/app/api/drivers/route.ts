import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('is_active', true);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
}

export async function POST(request: Request) {
    const { name, pin } = await request.json();

    // Simple verification
    const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('name', name)
        .eq('pin', pin)
        .single();

    if (error || !data) {
        return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 });
    }

    return NextResponse.json(data);
}
