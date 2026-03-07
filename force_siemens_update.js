
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function fixSiemens() {
    try {
        console.log('--- Iniciando actualización de SIEMENS ---');

        const env = fs.readFileSync('.env.development.local', 'utf8');
        const envVars = Object.fromEntries(
            env.split('\n')
                .filter(line => line.includes('='))
                .map(line => {
                    const idx = line.indexOf('=');
                    const key = line.substring(0, idx).trim();
                    let val = line.substring(idx + 1).trim();
                    if (val.startsWith('"') && val.endsWith('"')) {
                        val = val.substring(1, val.length - 1);
                    }
                    return [key, val];
                })
        );

        const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('No se encontraron credenciales en .env.development.local');
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // 1. Buscar si existe el cliente SIEMENS
        const { data: customers, error: fetchError } = await supabase
            .from('customers')
            .select('*')
            .ilike('name', '%SIEMENS%');

        if (fetchError) throw fetchError;

        if (!customers || customers.length === 0) {
            console.log('SIEMENS no existe. Creándolo...');
            const { data: newCustomer, error: insertError } = await supabase
                .from('customers')
                .insert([{
                    name: 'SIEMENS',
                    is_corporate: true,
                    client_slug: 'siemens',
                    logo_url: 'https://vitalfix.s3.amazonaws.com/siemens_logo_white.png'
                }])
                .select();
            if (insertError) throw insertError;
            console.log('Cliente SIEMENS creado exitosamente.');
        } else {
            console.log(`Encontrado(s) ${customers.length} cliente(s) SIEMENS. Actualizando...`);
            for (const c of customers) {
                const { error: updateError } = await supabase
                    .from('customers')
                    .update({
                        is_corporate: true,
                        client_slug: 'siemens',
                        logo_url: 'https://vitalfix.s3.amazonaws.com/siemens_logo_white.png'
                    })
                    .eq('id', c.id);
                if (updateError) throw updateError;
                console.log(`Cliente ID ${c.id} actualizado.`);
            }
        }

        console.log('--- Proceso finalizado con éxito ---');
    } catch (err) {
        console.error('ERROR FATAL:', err.message);
    }
}

fixSiemens();
