const { createClient } = require('@supabase/supabase-js');

async function checkStatuses() {
    const supabaseUrl = 'https://ijpmnhyvbrfohfdtuhrz.supabase.co';
    const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqcG1uaHl2YnJmb2hmZHR1aHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDEyMTcyOTEsImV4cCI6MjA1Njc5MzI5MX0.X_Y3N2nk9_4i2DfiFPLkKvzpxekBxEsM4R';
    // Wait, the anon key in check-db.js was 'sb_publishable_odSbwo1QDRN6ByfIboeV5Q_GISA2nka'.
    // That's weird. ANON KEYS usually start with eyJhbGci
    // Let's use the env one.

    // I'll grab the env one from .env.local
    const fs = require('fs');
    const env = fs.readFileSync('.env.local', 'utf8');
    const anonKeyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
    const anonKey = anonKeyMatch ? anonKeyMatch[1].trim() : '';

    const supabase = createClient(supabaseUrl, anonKey);

    const { data, error } = await supabase
        .from('orders')
        .select('id, status, customer_name')
        .limit(20);

    if (error) {
        console.error('Error fetching orders:', error.message);
        return;
    }

    console.log('Current orders and their statuses:');
    data.forEach(o => {
        console.log(`Order ID: ${o.id} | Name: ${o.customer_name} | Status: ${o.status}`);
    });
}

checkStatuses();
