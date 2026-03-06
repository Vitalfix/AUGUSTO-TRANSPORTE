'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function ScrollToTop() {
    const pathname = usePathname();

    useEffect(() => {
        // En cada cambio de ruta, forzar scroll arriba de todo
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'auto'
        });

        // También para elementos con scroll interno que puedan haber quedado abajo
        document.documentElement.scrollTo(0, 0);
        document.body.scrollTo(0, 0);
    }, [pathname]);

    return null;
}
