import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
    console.log('API /api/customers/public: Iniciando petición...');
    try {
        const { data, error } = await supabase
            .from('customers')
            .select('id, name, email, phone, cuit, tax_status, has_special_pricing, special_prices')
            .order('name', { ascending: true });

        if (error) {
            console.error('API /api/customers/public: Error de Supabase:', error.message);
            throw error;
        }

        console.log(`API /api/customers/public: Éxito. Clientes encontrados: ${data?.length || 0}`);
        return NextResponse.json(data || []);
    } catch (error: any) {
        console.error('API /api/customers/public: Error general:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
