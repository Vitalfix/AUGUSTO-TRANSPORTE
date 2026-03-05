const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
const envVars = Object.fromEntries(
    env.split('\n')
        .filter(line => line.includes('='))
        .map(line => line.split('=').map(s => s.trim()))
);

const supabase = createClient(
    envVars.NEXT_PUBLIC_SUPABASE_URL,
    envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function listPricing() {
    const { data, error } = await supabase.from('pricing_config').select('*').order('id');
    if (error) {
        console.error(error);
        return;
    }
    console.log(JSON.stringify(data, null, 2));
}

listPricing();
