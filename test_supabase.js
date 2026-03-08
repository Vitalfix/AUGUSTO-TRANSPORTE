const { createClient } = require('@supabase/supabase-js');

async function test() {
    const supabase = createClient(
        'https://ijpmnhyvbrfohfdtuhrz.supabase.co',
        'sb_publishable_odSbwo1QDRN6ByfIboeV5Q_GISA2nka'
    );

    // 1. Test básico - ver qué columnas tiene customers
    console.log('--- Test 1: Consultar customers ---');
    const { data: basic, error: basicErr } = await supabase
        .from('customers')
        .select('id, name')
        .limit(2);

    if (basicErr) {
        console.error('Error consultando customers:', basicErr.message);
    } else {
        console.log('OK. Primeros 2 clientes:', basic);
    }

    // 2. Verificar si existe columna is_corporate
    console.log('\n--- Test 2: Consultar columna is_corporate ---');
    const { data: corpData, error: corpErr } = await supabase
        .from('customers')
        .select('id, name, is_corporate, client_slug, logo_url')
        .limit(2);

    if (corpErr) {
        console.error('ERROR con columnas corporativas:', corpErr.message);
        console.log('\n>>> La columna is_corporate/client_slug/logo_url NO existe en la DB.');
        console.log('>>> Necesitas ejecutar el SQL en Supabase para crearla.');
    } else {
        console.log('Columnas corporativas OK:', JSON.stringify(corpData, null, 2));
    }

    // 3. Ver si SIEMENS está marcado
    console.log('\n--- Test 3: Buscar SIEMENS ---');
    const { data: siemens, error: siemensErr } = await supabase
        .from('customers')
        .select('id, name, is_corporate, client_slug, logo_url')
        .ilike('name', '%SIEMENS%');

    if (siemensErr) {
        console.error('Error buscando SIEMENS:', siemensErr.message);
    } else {
        console.log('SIEMENS encontrado:', JSON.stringify(siemens, null, 2));
    }
}

test().catch(console.error);
