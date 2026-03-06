const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCustomers() {
    const { data, error } = await supabase
        .from('customers')
        .select('name')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching customers:', error.message);
    } else {
        console.log('Customers found:', data.length);
        data.forEach(c => console.log(' - ' + c.name));
    }
}

checkCustomers();
