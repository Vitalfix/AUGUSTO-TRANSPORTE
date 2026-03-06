"use client";

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const mobileCheck = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);
        setIsMobile(mobileCheck);

        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone
            || document.referrer.includes('android-app://');
        setIsStandalone(isStandaloneMode);

        const handler = (e: any) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = () => {
        if (installPrompt) {
            installPrompt.prompt();
            installPrompt.userChoice.then((choice: any) => {
                if (choice.outcome === 'accepted') setInstallPrompt(null);
            });
        } else {
            const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
            if (isIOS) {
                alert("INSTALACIÓN EN IPHONE:\n1. Toca 'Compartir' (cuadrado con flecha arriba).\n2. Selecciona 'Añadir a la pantalla de inicio'.");
            } else {
                alert("INSTALACIÓN MANUAL:\n1. Toca los 3 puntos del navegador (arriba a la derecha).\n2. Selecciona 'Instalar aplicación' o 'Agregar a pantalla de inicio'.");
            }
        }
    };

    if (!mounted || isStandalone || !isMobile) return null;

    return (
        <div style={{ position: 'fixed', bottom: '20px', left: '0', right: '0', display: 'flex', justifyContent: 'center', zIndex: 99999 }}>
            <button
                className="install-btn-pulse"
                onClick={handleInstallClick}
                style={{
                    background: 'var(--accent-gradient, #3b82f6)',
                    border: 'none',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '30px',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    boxShadow: '0 4px 15px rgba(59,130,246,0.5)',
                }}
            >
                📲 INSTALAR APP OFICIAL
            </button>
        </div>
    );
}
