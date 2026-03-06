"use client";

import { useEffect } from 'react';

export default function DynamicManifest() {
    useEffect(() => {
        const path = window.location.pathname;
        const manifestLink = document.querySelector('link[rel="manifest"]');

        if (manifestLink) {
            if (path.startsWith('/chofer')) {
                manifestLink.setAttribute('href', '/manifest-chofer.json');
            } else if (path.startsWith('/admin')) {
                manifestLink.setAttribute('href', '/manifest-admin.json');
            } else {
                manifestLink.setAttribute('href', '/manifest.json');
            }
        }
    }, []);

    return null;
}
