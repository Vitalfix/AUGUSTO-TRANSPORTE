import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    const body = await request.json();
    const { action, password, newPassword } = body;

    // Obtener la contraseña maestra actual desde BD
    const { data: dbPass } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'master_password')
        .single();

    const currentValidPassword = dbPass?.value || '1234';

    // Verificar si el PIN enviado es correcto
    if (password !== currentValidPassword) {
        return NextResponse.json({ error: 'PIN Incorrecto' }, { status: 401 });
    }

    // Accion: Validar la contraseña (Login)
    if (action === 'login') {
        return NextResponse.json({ success: true });
    }

    // Accion: Cambiar la contraseña
    if (action === 'change_password') {
        if (!newPassword || newPassword.length < 4) {
            return NextResponse.json({ error: 'La nueva contraseña debe tener al menos 4 caracteres' }, { status: 400 });
        }

        const { error } = await supabase
            .from('site_settings')
            .update({
                value: newPassword,
                updated_at: new Date().toISOString()
            })
            .eq('id', 'master_password');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Contraseña actualizada correctamente' });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}
