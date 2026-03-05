import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { data, masterPassword } = body;

        // Verify master password before doing anything destructive
        const { data: dbPass } = await supabase
            .from('site_settings')
            .select('value')
            .eq('id', 'master_password')
            .single();

        const adminPass = dbPass?.value || 'vitalfix';

        if (masterPassword !== adminPass) {
            return NextResponse.json({ error: 'Contraseña maestra incorrecta para restaurar' }, { status: 401 });
        }

        if (!data || !data.orders || !data.drivers) {
            return NextResponse.json({ error: 'Archivo de backup inválido o incompleto' }, { status: 400 });
        }

        // DESTRUCTION - Order matters due to Foreign Keys
        // Clear orders first
        await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        // Clear drivers
        await supabase.from('drivers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        // Clear pricing
        await supabase.from('pricing_config').delete().neq('id', 'none');
        // Clear settings
        await supabase.from('site_settings').delete().neq('id', 'none');

        // RESTORATION - Order: Settings -> Pricing -> Drivers -> Orders
        if (data.site_settings?.length > 0) {
            const { error: errS } = await supabase.from('site_settings').insert(data.site_settings);
            if (errS) throw new Error('Error restaurando Ajustes: ' + errS.message);
        }

        if (data.pricing_config?.length > 0) {
            const { error: errP } = await supabase.from('pricing_config').insert(data.pricing_config);
            if (errP) throw new Error('Error restaurando Tarifas: ' + errP.message);
        }

        if (data.drivers?.length > 0) {
            const { error: errD } = await supabase.from('drivers').insert(data.drivers);
            if (errD) throw new Error('Error restaurando Choferes: ' + errD.message);
        }

        if (data.orders?.length > 0) {
            // Need to filter out any null IDs just in case
            const validOrders = data.orders.filter((o: any) => o.id);
            const { error: errO } = await supabase.from('orders').insert(validOrders);
            if (errO) throw new Error('Error restaurando Pedidos: ' + errO.message);
        }

        return NextResponse.json({ success: true, message: 'Base de datos restaurada correctamente' });

    } catch (error: any) {
        console.error('RESTORE ERROR:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
