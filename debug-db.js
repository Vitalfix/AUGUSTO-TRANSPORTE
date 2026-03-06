const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ijpmnhyvbrfohfdtuhrz.supabase.co';
const supabaseAnonKey = 'sb_publishable_odSbwo1QDRN6ByfIboeV5Q_GISA2nka';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkCustomers() {
    console.log('Fetching customers from public API...');
    const { data, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name', { ascending: true });

    if (error) {
        console.error('Error fetching customers:', error.message);
    } else {
        console.log('Customers found in DB:', data.length);
        if (data.length > 0) {
            data.forEach(c => console.log(` - ID: ${c.id}, Name: ${c.name}`));
        } else {
            console.log('No customers found in the table.');
        }
    }
}

checkCustomers();
