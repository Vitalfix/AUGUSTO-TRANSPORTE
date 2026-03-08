// Script de prueba para verificar permisos de Supabase Storage
// Ejecutar con: node test_storage.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function testStorage() {
    const supabase = createClient(
        'https://ijpmnhyvbrfohfdtuhrz.supabase.co',
        'sb_publishable_odSbwo1QDRN6ByfIboeV5Q_GISA2nka'
    );

    console.log('Probando subida al bucket "logos"...');

    // Leer el logo de Siemens que ya existe localmente
    const logoPath = path.join(__dirname, 'public', 'logos', 'siemens.png');

    if (!fs.existsSync(logoPath)) {
        console.log('No existe el archivo local. Creando un PNG de prueba mínimo...');
        // PNG mínimo válido de 1x1 pixel transparente
        const minPng = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000000200015421b500000000049454e44ae426082', 'hex');
        fs.mkdirSync(path.join(__dirname, 'public', 'logos'), { recursive: true });
        fs.writeFileSync(logoPath, minPng);
        console.log('Archivo de prueba creado.');
    }

    const fileBuffer = fs.readFileSync(logoPath);

    const { data, error } = await supabase.storage
        .from('logos')
        .upload('siemens.png', fileBuffer, {
            contentType: 'image/png',
            upsert: true
        });

    if (error) {
        console.error('ERROR al subir:', error.message);
        console.log('\nSolución: Ejecuta el SQL en setup_storage_policies.sql en tu Supabase SQL Editor');
    } else {
        console.log('✅ ¡Subida exitosa!', data);

        const { data: urlData } = supabase.storage
            .from('logos')
            .getPublicUrl('siemens.png');

        console.log('URL pública del logo:', urlData.publicUrl);
        console.log('\n⚠️  Actualizá el logo_url de SIEMENS en la base de datos con esta URL:');
        console.log(`UPDATE customers SET logo_url = '${urlData.publicUrl}' WHERE name ILIKE '%SIEMENS%';`);
    }
}

testStorage().catch(console.error);
