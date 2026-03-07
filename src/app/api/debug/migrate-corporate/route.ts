
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
    try {
        // En lugar de ALTER TABLE (que requiere permisos que el cliente anon/service no siempre tiene via API),
        // vamos a intentar actualizar los datos asumiendo que las columnas ya existen (porque las agregué via Admin o SQL dashboard).

        // 1. Verificar si existen las columnas (esto fallará si no existen)
        const { data: testData, error: testError } = await supabase
            .from('customers')
            .select('is_corporate, client_slug, logo_url')
            .limit(1);

        if (testError) {
            return NextResponse.json({
                error: 'Parece que las columnas no existen aún. Por favor ejecuta el archivo update_corporate_schema.sql en el dashboard de Supabase.',
                details: testError.message
            }, { status: 500 });
        }

        // 2. Marcar a SIEMENS como corporativo
        const { data, error } = await supabase
            .from('customers')
            .update({
                is_corporate: true,
                client_slug: 'siemens',
                logo_url: 'https://vitalfix.s3.amazonaws.com/siemens_logo_white.png'
            })
            .ilike('name', '%SIEMENS%');

        if (error) throw error;

        return NextResponse.json({
            success: true,
            message: 'SIEMENS ha sido marcado como corporativo exitosamente.'
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
