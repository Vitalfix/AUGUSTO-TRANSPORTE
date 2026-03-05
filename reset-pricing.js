const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const envVars = Object.fromEntries(
    env.split('\n')
        .filter(line => line.includes('='))
        .map(line => {
            const [key, ...rest] = line.split('=');
            return [key.trim(), rest.join('=').trim()];
        })
);

const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL,
    envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const vehicles = [
    { id: 'util_chico', name: 'Utilitario chico', description: 'Hasta 500kg o medio Pallet', price_km: 450, price_hour: 6500, price_wait_hour: 3500, price_stay: 45000 },
    { id: 'cam_mediana', name: 'Camioneta Mediana', description: 'Hasta 900kg o 2 Pallet', price_km: 650, price_hour: 9500, price_wait_hour: 4500, price_stay: 65000 },
    { id: 'cam_grande', name: 'Camioneta Grande', description: 'Hasta 1200kg o 3 Pallet', price_km: 850, price_hour: 12500, price_wait_hour: 5500, price_stay: 75000 },
    { id: 'camion_chico', name: 'Camion Chico', description: 'Hasta 4000kg o 4-6 Pallet', price_km: 1200, price_hour: 18000, price_wait_hour: 8000, price_stay: 120000 },
    { id: 'camion_grande', name: 'Camion Grande', description: 'Hasta 7000kg o 8-12 Pallet', price_km: 1600, price_hour: 24000, price_wait_hour: 12000, price_stay: 150000 },
    { id: 'balancin', name: 'Balancin', description: '14-16 Pallet', price_km: 2000, price_hour: 30000, price_wait_hour: 15000, price_stay: 200000 },
    { id: 'semi', name: 'Semi', description: '1 trailer 20-30 Pallet / 2 medio 30-30 Pallet / 3 Araña 20-40 Pallet', price_km: 2800, price_hour: 45000, price_wait_hour: 25000, price_stay: 300000 }
];

async function updatePricing() {
    console.log('Borreando tarifas viejas...');
    const { error: delError } = await supabase.from('pricing_config').delete().neq('id', 'something_that_wont_match');
    if (delError) {
        console.error('Error borrando:', delError);
        // Fallback to individual deletes if needed
    }

    console.log('Insertando nuevas tarifas...');
    const { error: insError } = await supabase.from('pricing_config').insert(vehicles);
    if (insError) {
        console.error('Error insertando:', insError);
    } else {
        console.log('Tarifas actualizadas correctamente!');
    }
}

updatePricing();
