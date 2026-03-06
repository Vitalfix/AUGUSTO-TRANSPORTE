
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkSchema() {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching orders:', error);
        return;
    }

    if (data.length > 0) {
        console.log('Columns in orders:', Object.keys(data[0]));
    } else {
        console.log('No orders found, cannot determine columns this way.');
        // fallback to rpc if available or just try inserting
    }
}

checkSchema();
