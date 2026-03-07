
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Intentar leer credenciales de varios lugares
let supabaseUrl, supabaseKey;

try {
    const envLocalPath = path.join(__dirname, '.env.local');
    if (fs.existsSync(envLocalPath)) {
        const envContent = fs.readFileSync(envLocalPath, 'utf8');
        const lines = envContent.split('\n');
        for (const line of lines) {
            if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim().replace(/"/g, '');
            if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) supabaseKey = line.split('=')[1].trim().replace(/"/g, '');
            if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=') && !supabaseKey) supabaseKey = line.split('=')[1].trim().replace(/"/g, '');
        }
    }
} catch (e) {
    console.error('Error leyendo .env.local:', e);
}

// Valores por defecto o fallback si no están en .env.local (pueden venir de env vars del sistema)
supabaseUrl = supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL;
supabaseKey = supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Faltan variables de entorno para Supabase');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSiemens() {
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .ilike('name', '%SIEMENS%');

    if (error) {
        console.error('Error al consultar clientes:', error);
        return;
    }

    if (data.length === 0) {
        console.log('No se encontró ningún cliente con nombre SIEMENS');
    } else {
        console.log('Clientes SIEMENS encontrados:');
        console.log(JSON.stringify(data, null, 2));
    }
}

checkSiemens();
