import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
        }

        // Validar que sea imagen
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
        }

        // Sanitizar nombre y guardar en public/logos/
        const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
        const slug = (formData.get('slug') as string || file.name.split('.')[0])
            .toLowerCase()
            .replace(/[^a-z0-9-]/g, '-');
        const filename = `${slug}.${ext}`;

        const logosDir = path.join(process.cwd(), 'public', 'logos');
        await mkdir(logosDir, { recursive: true });

        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(path.join(logosDir, filename), buffer);

        return NextResponse.json({
            url: `/logos/${filename}`,
            filename
        });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Error desconocido';
        console.error('Error subiendo logo:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
