import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Usamos el service role key para poder subir archivos sin restricciones de RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BUCKET = 'logos';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const slug = (formData.get('slug') as string) || 'logo';

        if (!file) {
            return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
        }

        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
        }

        // Crear el bucket si no existe (silencioso si ya existe)
        await supabaseAdmin.storage.createBucket(BUCKET, { public: true }).catch(() => { });

        // Nombre del archivo limpio
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
        const filename = `${slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')}.${ext}`;

        const buffer = await file.arrayBuffer();

        // Subir a Supabase Storage (upsert para sobreescribir si ya existe)
        const { error } = await supabaseAdmin.storage
            .from(BUCKET)
            .upload(filename, buffer, {
                contentType: file.type,
                upsert: true,
            });

        if (error) {
            console.error('Error subiendo a Supabase Storage:', error.message);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Obtener la URL pública
        const { data: urlData } = supabaseAdmin.storage
            .from(BUCKET)
            .getPublicUrl(filename);

        return NextResponse.json({
            url: urlData.publicUrl,
            filename,
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error desconocido';
        console.error('Error en upload-logo:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
