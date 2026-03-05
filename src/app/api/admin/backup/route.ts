import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        const [orders, drivers, pricing, settings] = await Promise.all([
            supabase.from('orders').select('*'),
            supabase.from('drivers').select('*'),
            supabase.from('pricing_config').select('*'),
            supabase.from('site_settings').select('*')
        ]);

        if (orders.error) throw orders.error;
        if (drivers.error) throw drivers.error;
        if (pricing.error) throw pricing.error;
        if (settings.error) throw settings.error;

        const backupData = {
            version: '1.0',
            timestamp: new Date().toISOString(),
            data: {
                orders: orders.data,
                drivers: drivers.data,
                pricing_config: pricing.data,
                site_settings: settings.data
            }
        };

        return NextResponse.json(backupData);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
