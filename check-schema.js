const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ijpmnhyvbrfohfdtuhrz.supabase.co';
const supabaseAnonKey = 'sb_publishable_odSbwo1QDRN6ByfIboeV5Q_GISA2nka';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkFullSchema() {
    console.log('Checking full schema of customers table...');
    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching full schema:', error.message);
    } else {
        console.log('Schema detected. Columns found in the first row:');
        if (data && data.length > 0) {
            console.log(Object.keys(data[0]));
        } else {
            console.log('Table is empty, cannot detect columns this way.');
        }
    }
}

checkFullSchema();
