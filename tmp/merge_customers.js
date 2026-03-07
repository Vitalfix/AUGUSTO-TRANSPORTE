
const { createClient } = require('@supabase/supabase-js');

// Configuración - Usar variables de entorno o valores directos si es temporal
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Necesitamos Service Role para bypass RLS si existe

if (!supabaseUrl || !supabaseKey) {
    console.error("Faltan credenciales de Supabase (URL o SERVICE_ROLE_KEY)");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function mergeDuplicateCustomers() {
    console.log("Iniciando limpieza de clientes duplicados...");

    // 1. Obtener todos los clientes
    const { data: customers, error: custError } = await supabase
        .from('customers')
        .select('*');

    if (custError) {
        console.error("Error obteniendo clientes:", custError);
        return;
    }

    // 2. Agrupar por nombre (normalizado)
    const groups = {};
    customers.forEach(c => {
        const nameKey = c.name.toLowerCase().trim();
        if (!groups[nameKey]) groups[nameKey] = [];
        groups[nameKey].push(c);
    });

    for (const nameKey in groups) {
        const list = groups[nameKey];
        if (list.length > 1) {
            console.log(`\nProcesando duplicados para: "${list[0].name}" (${list.length} encontrados)`);

            // 3. Identificar el Master (el que tenga más info o el ID más bajo/antiguo)
            // Criterio: prioridad al que tenga CUIT o Email, sino el primero
            const master = list.sort((a, b) => {
                const aScore = (a.cuit ? 2 : 0) + (a.email ? 1 : 0);
                const bScore = (b.cuit ? 2 : 0) + (b.email ? 1 : 0);
                if (bScore !== aScore) return bScore - aScore;
                return parseInt(a.id) - parseInt(b.id);
            })[0];

            const duplicates = list.filter(c => c.id !== master.id);
            console.log(`> Master elegido: ID ${master.id} (Info score alto)`);

            for (const dup of duplicates) {
                console.log(`  - Re-vinculando pedidos del duplicado ID ${dup.id} -> ${master.id}`);

                // 4. Actualizar pedidos que apuntaban al ID viejo
                const { error: updateError } = await supabase
                    .from('orders')
                    .update({ customer_id: master.id, customer_name: master.name })
                    .eq('customer_id', dup.id);

                if (updateError) {
                    console.error(`    Error re-vinculando pedidos de ID ${dup.id}:`, updateError);
                } else {
                    // 5. Borrar el duplicado
                    const { error: deleteError } = await supabase
                        .from('customers')
                        .delete()
                        .eq('id', dup.id);

                    if (deleteError) {
                        console.error(`    Error borrando duplicado ID ${dup.id}:`, deleteError);
                    } else {
                        console.log(`    ✓ Duplicado ID ${dup.id} eliminado con éxito.`);
                    }
                }
            }
        }
    }

    console.log("\nProceso de limpieza finalizado.");
}

mergeDuplicateCustomers();
