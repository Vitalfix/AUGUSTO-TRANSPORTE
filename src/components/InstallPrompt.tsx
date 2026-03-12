"use client";

import { useState, useEffect } from 'react';

export default function InstallPrompt() {
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [showIOSModal, setShowIOSModal] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const ua = navigator.userAgent.toLowerCase();
        const isIOSDevice = /iphone|ipad|ipod/.test(ua) || 
                           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        const mobileCheck = /android|blackberry|iemobile|opera mini/i.test(ua) || isIOSDevice;
        
        setIsMobile(mobileCheck);
        setIsIOS(isIOSDevice);

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
        } else if (isIOS) {
            setShowIOSModal(true);
        } else {
            alert("INSTALACIÓN MANUAL:\n1. Toca los 3 puntos del navegador (arriba a la derecha).\n2. Selecciona 'Instalar aplicación' o 'Agregar a pantalla de inicio'.");
        }
    };

    if (!mounted || isStandalone || !isMobile) return null;

    return (
        <>
            <div style={{ position: 'fixed', bottom: '20px', left: '0', right: '0', display: 'flex', justifyContent: 'center', zIndex: 9999 }}>
                <button
                    className="install-btn-pulse"
                    onClick={handleInstallClick}
                    style={{
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        border: 'none',
                        color: 'white',
                        padding: '14px 28px',
                        borderRadius: '50px',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        boxShadow: '0 10px 25px rgba(59,130,246,0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'transform 0.2s',
                    }}
                >
                    <span style={{ fontSize: '1.4rem' }}>📲</span>
                    INSTALAR APP OFICIAL
                </button>
            </div>

            {/* MODAL DE GUÍA PARA IOS */}
            {showIOSModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(5px)',
                    zIndex: 10000,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }} onClick={() => setShowIOSModal(false)}>
                    <div style={{
                        background: 'var(--bg-color, #ffffff)',
                        color: 'var(--text-color, #000000)',
                        borderRadius: '24px',
                        padding: '30px',
                        maxWidth: '350px',
                        width: '100%',
                        position: 'relative',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                    }} onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setShowIOSModal(false)}
                            style={{
                                position: 'absolute',
                                top: '15px',
                                right: '15px',
                                background: 'rgba(128,128,128,0.1)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                cursor: 'pointer',
                                fontSize: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'inherit'
                            }}
                        >✕</button>

                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <img src="/icon.png" alt="App Icon" style={{ width: '80px', height: '80px', borderRadius: '18px', marginBottom: '15px', boxShadow: '0 5px 15px rgba(0,0,0,0.1)' }} />
                            <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>Instalar El Casal</h3>
                            <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>Sigue estos pasos para instalar la aplicación en tu iPhone <strong>(usando Safari)</strong>:</p>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ 
                                    minWidth: '32px', 
                                    height: '32px', 
                                    backgroundColor: '#3b82f6', 
                                    color: 'white', 
                                    borderRadius: '50%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    fontWeight: 'bold'
                                }}>1</div>
                                <p style={{ fontSize: '0.95rem', margin: 0 }}>
                                    Toca el botón <strong>Compartir</strong> <br />
                                    <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>(Cuadrado con flecha arriba)</span>
                                </p>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                                    <polyline points="16 6 12 2 8 6" />
                                    <line x1="12" y1="2" x2="12" y2="15" />
                                </svg>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <div style={{ 
                                    minWidth: '32px', 
                                    height: '32px', 
                                    backgroundColor: '#3b82f6', 
                                    color: 'white', 
                                    borderRadius: '50%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    fontWeight: 'bold'
                                }}>2</div>
                                <p style={{ fontSize: '0.95rem', margin: 0 }}>
                                    Busca y selecciona <br />
                                    <strong>"Añadir a la pantalla de inicio"</strong>
                                </p>
                                <div style={{ width: '24px', height: '24px', border: '2px solid #3b82f6', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '18px' }}>+</span>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={() => setShowIOSModal(false)}
                            style={{
                                width: '100%',
                                marginTop: '30px',
                                padding: '12px',
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '12px',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
            
            <style jsx>{`
                .install-btn-pulse {
                    animation: pulse 2s infinite;
                }
                @keyframes pulse {
                    0% { transform: scale(1); box-shadow: 0 10px 25px rgba(59,130,246,0.4); }
                    50% { transform: scale(1.05); box-shadow: 0 15px 35px rgba(59,130,246,0.6); }
                    100% { transform: scale(1); box-shadow: 0 10px 25px rgba(59,130,246,0.4); }
                }
            `}</style>
        </>
    );
}
