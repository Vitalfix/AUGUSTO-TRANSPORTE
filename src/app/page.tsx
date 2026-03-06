"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Detectar si es móvil
    const mobileCheck = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(navigator.userAgent);
    setIsMobile(mobileCheck);

    // Detectar si YA está abierta como App (para ocultar el botón)
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone
      || document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);

    // Capturar el evento de instalación automática (Android/Chrome)
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
      // Instrucciones manuales si no hay prompt automático
      const isIOS = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
      if (isIOS) {
        alert("INSTALACIÓN EN IPHONE:\n1. Toca 'Compartir' (cuadrado con flecha arriba).\n2. Selecciona 'Añadir a la pantalla de inicio'.");
      } else {
        alert("INSTALACIÓN MANUAL:\n1. Toca los 3 puntos del navegador (arriba a la derecha).\n2. Selecciona 'Instalar aplicación' o 'Agregar a pantalla de inicio'.");
      }
    }
  };

  // Si no está montado, no renderizamos para evitar errores de hidratación
  if (!mounted) return null;

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '90vh', padding: '10px 15px' }}>
      <header style={{ marginBottom: '10px' }}>
        <img
          src="/logo.jpg"
          alt="EL CASAL"
          className="main-logo"
          style={{ maxWidth: '300px' }}
        />
      </header>

      <div className="home-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', flexGrow: 1 }}>

        {/* 1. Pedir Viaje (AHORA PRIMERO) */}
        <div className="glass-panel" style={{ padding: '12px 15px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>🚚</div>
          <h2 style={{ marginBottom: '5px', fontSize: '1.2rem' }}>Pedir Viaje</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '10px', fontSize: '0.75rem' }}>
            Cotizá y reservá desde tu celular.
          </p>
          <Link href="/quote" style={{ width: '100%' }}>
            <button className="glass-button" style={{ width: '100%', padding: '10px' }}>
              Nueva Solicitud
            </button>
          </Link>
        </div>

        {/* 2. Seguir Viaje (AHORA SEGUNDO) */}
        <div className="glass-panel" style={{ padding: '12px 15px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>📍</div>
          <h2 style={{ marginBottom: '5px', fontSize: '1.2rem' }}>Seguir Viaje</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '10px', fontSize: '0.75rem' }}>
            Ingresá tu código de seguimiento.
          </p>
          <form
            className="flex-col gap-8"
            onSubmit={(e) => {
              e.preventDefault();
              const id = (e.currentTarget.elements.namedItem('trackingId') as HTMLInputElement).value;
              if (id) window.location.href = `/tracking/${id.toUpperCase()}`;
            }}
          >
            <input
              name="trackingId"
              type="text"
              className="glass-input"
              placeholder="EJ: A0000"
              style={{ textAlign: 'center', textTransform: 'uppercase', padding: '8px', fontSize: '0.8rem' }}
              required
            />
            <button type="submit" className="glass-button" style={{ width: '100%', padding: '10px' }}>
              Ver Mapa
            </button>
          </form>
        </div>

        {/* Soy Chofer */}
        <div className="glass-panel" style={{ padding: '12px 15px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '5px' }}>👷</div>
          <h2 className="text-gradient-green" style={{ marginBottom: '5px', fontSize: '1.2rem' }}>Soy Chofer</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '0.75rem' }}>
            Accedé a tus viajes asignados.
          </p>

          <Link href="/chofer" style={{ width: '100%' }}>
            <button className="glass-button" style={{ width: '100%', borderColor: 'var(--success-color)', color: 'var(--success-color)', padding: '10px' }}>
              Ingresar
            </button>
          </Link>
        </div>

      </div>

      {/* Social / Admin Row */}
      <footer style={{ marginTop: '15px', paddingBottom: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>

        {isMobile && !isStandalone && (
          <button
            id="install-button-manual"
            className="install-btn-pulse"
            onClick={handleInstallClick}
            style={{
              background: '#3b82f6',
              border: 'none',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '30px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              boxShadow: '0 4px 15px rgba(59,130,246,0.5)',
              zIndex: 9999
            }}
          >
            📲 INSTALAR APP OFICIAL
          </button>
        )}

        <button
          onClick={() => {
            const pin = window.prompt("Ingrese PIN de Administrador:");
            if (pin) {
              sessionStorage.setItem('admin_password', pin);
              window.location.href = '/admin';
            }
          }}
          style={{ background: 'none', border: 'none', fontSize: '1.2rem', opacity: 0.3, cursor: 'pointer', marginTop: '10px' }}
          title="Administración"
        >
          🛡️
        </button>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', opacity: 0.2, marginTop: '2px' }}>
          v1.3 Premium Logistics
        </div>
      </footer>

      <style jsx>{`
        .home-grid {
          max-height: calc(100vh - 200px);
        }
        @media (max-width: 600px) {
           .home-grid {
             grid-template-columns: 1fr !important;
             gap: 8px !important;
           }
           .main-logo {
             max-width: 220px !important;
           }
           .glass-panel {
             padding: 10px 15px !important;
           }
           h2 {
             font-size: 1.1rem !important;
             margin-bottom: 2px !important;
           }
           p {
             margin-bottom: 5px !important;
           }
        }
        .install-btn-pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 4px 15px rgba(59,130,246,0.5); }
          50% { transform: scale(1.05); box-shadow: 0 4px 20px rgba(59,130,246,0.7); }
          100% { transform: scale(1); box-shadow: 0 4px 15px rgba(59,130,246,0.5); }
        }
      `}</style>
    </div>
  );
}
