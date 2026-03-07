import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

async function authenticate(password: string | null) {
    if (!password) return false;
    const { data: dbPass } = await supabase
        .from('site_settings')
        .select('value')
        .eq('id', 'master_password')
        .single();
    return (dbPass?.value || '1234') === password;
}

function getPassword(request: Request) {
    return request.headers.get('x-admin-password');
}

export async function GET(request: Request) {
    try {
        const password = getPassword(request);
        if (!await authenticate(password)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const password = getPassword(request);
        if (!await authenticate(password)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { name, email, phone, cuit, taxStatus, hasSpecialPricing, specialPrices, isCorporate, clientSlug, logoUrl } = body;

        // Verificar si ya existe un cliente con ese nombre (case insensitive)
        const { data: existing } = await supabase
            .from('customers')
            .select('id')
            .ilike('name', name.trim())
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ error: 'Ya existe un cliente con este nombre. Use Editar para modificarlo.' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('customers')
            .insert({
                name: name.trim(),
                email,
                phone,
                cuit,
                tax_status: taxStatus,
                is_corporate: isCorporate || false,
                client_slug: clientSlug || null,
                logo_url: logoUrl || null
            })
            .select()
            .maybeSingle();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const password = getPassword(request);
        if (!await authenticate(password)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const body = await request.json();
        const { id, name, email, phone, cuit, taxStatus, hasSpecialPricing, specialPrices, isCorporate, clientSlug, logoUrl } = body;

        const { data, error } = await supabase
            .from('customers')
            .update({
                name,
                email,
                phone,
                cuit,
                tax_status: taxStatus,
                is_corporate: isCorporate,
                client_slug: clientSlug,
                logo_url: logoUrl
            })
            .eq('id', id)
            .select()
            .maybeSingle();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const password = getPassword(request);
        if (!await authenticate(password)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        // 1. Obtener todos los clientes
        const { data: customers } = await supabase.from('customers').select('*');
        if (!customers) return NextResponse.json({ count: 0 });

        const groups: any = {};
        customers.forEach(c => {
            const nameKey = c.name.toLowerCase().trim();
            if (!groups[nameKey]) groups[nameKey] = [];
            groups[nameKey].push(c);
        });

        let mergedCount = 0;
        for (const nameKey in groups) {
            const list = groups[nameKey];
            if (list.length > 1) {
                // Master: primero con CUIT/Email, sino el primero
                const master = list.sort((a: any, b: any) => {
                    const aScore = (a.cuit ? 2 : 0) + (a.email ? 1 : 0);
                    const bScore = (b.cuit ? 2 : 0) + (b.email ? 1 : 0);
                    if (bScore !== aScore) return bScore - aScore;
                    return parseInt(a.id) - parseInt(b.id);
                })[0];

                const duplicates = list.filter((c: any) => c.id !== master.id);
                for (const dup of duplicates) {
                    // Re-vincular pedidos
                    await supabase.from('orders').update({ customer_id: master.id, customer_name: master.name }).eq('customer_id', dup.id);
                    // Borrar duplicado
                    await supabase.from('customers').delete().eq('id', dup.id);
                    mergedCount++;
                }
            }
        }

        return NextResponse.json({ success: true, mergedCount });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        const password = getPassword(request);
        if (!await authenticate(password)) {
            return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 });

        // Move to recycle bin before deleting
        const { data: customer } = await supabase.from('customers').select('*').eq('id', id).single();
        if (customer) {
            // Guardar en papelera
            await supabase.from('recycle_bin').insert({
                original_id: customer.id.toString(),
                table_name: 'customers',
                data: customer
            });

            // Borrar pedidos relacionados (Cascada manual por seguridad)
            // Nota: Se borran los pedidos que tengan este customer_id asignado
            await supabase.from('orders').delete().eq('customer_id', id);
        }

        const { data: deletedRows, error } = await supabase
            .from('customers')
            .delete()
            .eq('id', id)
            .select();

        if (error) throw error;

        if (!deletedRows || deletedRows.length === 0) {
            return NextResponse.json({ error: 'No se pudo borrar el registro (posible problema de permisos en la DB)' }, { status: 403 });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
