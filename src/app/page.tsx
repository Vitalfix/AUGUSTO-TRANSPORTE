"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

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
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '90vh' }}>
      <header style={{ marginBottom: '15px' }}>
        <img
          src="/logo.jpg"
          alt="EL CASAL"
          className="main-logo"
        />
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px', flexGrow: 1 }}>

        {/* 1. Seguir Viaje */}
        <div className="glass-panel" style={{ padding: '20px 15px', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>📍</div>
          <h2 style={{ marginBottom: '5px', fontSize: '1.3rem' }}>Seguir Viaje</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '15px', fontSize: '0.85rem', flexGrow: 1 }}>
            Ingresá tu código de seguimiento.
          </p>
          <form
            className="flex-col gap-10"
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
              placeholder="CÓDIGO (EJ: A0000)"
              style={{ textAlign: 'center', textTransform: 'uppercase', padding: '10px' }}
              required
            />
            <button type="submit" className="glass-button" style={{ width: '100%', padding: '12px' }}>
              Ver Mapa
            </button>
          </form>
        </div>

        {/* 2. Pedir Viaje */}
        <div className="glass-panel" style={{ padding: '20px 15px', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🚚</div>
          <h2 style={{ marginBottom: '5px', fontSize: '1.3rem' }}>Pedir Viaje</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '15px', fontSize: '0.85rem', flexGrow: 1 }}>
            Cotizá y reservá desde tu celular.
          </p>
          <Link href="/quote" style={{ width: '100%' }}>
            <button className="glass-button" style={{ width: '100%', padding: '12px' }}>
              Nueva Solicitud
            </button>
          </Link>
        </div>

        {/* Soy Chofer */}
        <div className="glass-panel" style={{ padding: '20px 15px', textAlign: 'center', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>👷</div>
          <h2 className="text-gradient-green" style={{ marginBottom: '5px', fontSize: '1.3rem' }}>Soy Chofer</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '10px', fontSize: '0.85rem', flexGrow: 1 }}>
            Accedé a tus viajes asignados.
          </p>

          <button
            className="glass-button"
            style={{ width: '100%', marginBottom: '8px', background: 'rgba(59,130,246,0.1)', borderColor: '#3b82f6', fontSize: '0.75rem', padding: '10px' }}
            onClick={() => {
              if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                  () => alert("✅ ¡GPS Funcionando correctamente!"),
                  (err) => alert(`❌ Error de GPS: ${err.message}.`)
                );
              } else {
                alert("❌ Este dispositivo no soporta GPS.");
              }
            }}
          >
            📡 PROBAR GPS
          </button>

          <Link href="/driver/login" style={{ width: '100%' }}>
            <button className="glass-button" style={{ width: '100%', borderColor: 'var(--success-color)', color: 'var(--success-color)', padding: '12px' }}>
              Ingresar con PIN
            </button>
          </Link>
        </div>

      </div>

      {/* Social / Admin Row */}
      <footer style={{ marginTop: '20px', paddingBottom: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>

        {!isStandalone && (
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
        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', opacity: 0.3, marginTop: '5px' }}>
          v1.2 Premium Logistics System
        </div>
      </footer>

      <style jsx>{`
        .install-btn-pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 4px 15px rgba(59,130,246,0.5); }
          50% { transform: scale(1.08); box-shadow: 0 4px 25px rgba(59,130,246,0.8); }
          100% { transform: scale(1); box-shadow: 0 4px 15px rgba(59,130,246,0.5); }
        }
      `}</style>
    </div>
  );
}
