import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const { points } = await request.json();

        if (!points || points.length < 2) {
            return NextResponse.json({ error: 'Se requieren al menos 2 puntos (Origen y Destino)' }, { status: 400 });
        }

        // Formatear coordenadas para OSRM (lon,lat;lon,lat)
        const coordinates = points.map((p: any) => `${p.lng},${p.lat}`).join(';');

        // Usar la instancia pública de OSRM (demo)
        // Nota: En producción real de alto tráfico se recomienda instancia propia o servicio pago.
        const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;

        const response = await fetch(url);
        const data = await response.json();

        if (data.code !== 'Ok') {
            return NextResponse.json({ error: 'No se pudo calcular la ruta', details: data }, { status: 500 });
        }

        const route = data.routes[0];
        const distanceKm = Math.round(route.distance / 1000);
        const durationMin = Math.round(route.duration / 60);

        return NextResponse.json({
            distance: distanceKm,
            duration: durationMin,
            geometry: route.geometry
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
