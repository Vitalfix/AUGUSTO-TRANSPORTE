const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function migrate() {
    // Get env from .env.local
    let envContent = '';
    try {
        envContent = fs.readFileSync('.env.local', 'utf8');
    } catch (e) {
        console.error('Error reading .env.local', e);
        return;
    }

    const urlMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
    const anonMatch = envContent.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

    if (!urlMatch || !anonMatch) {
        console.error('Missing env vars');
        return;
    }

    const supabaseUrl = urlMatch[1].trim();
    const supabaseAnonKey = anonMatch[1].trim();

    // I can't run ALTER TABLE via supabase-js client.
    // The user needs to run SQL.

    console.log('--- SQL MIGRATION REQUIRED ---');
    console.log('Please run the following SQL in the Supabase SQL Editor:');
    console.log('');
    console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS distance_km NUMERIC;');
    console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS travel_hours NUMERIC;');
    console.log('');
    console.log('------------------------------');
}

migrate();
