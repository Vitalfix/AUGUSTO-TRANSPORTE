"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import InstallPrompt from '@/components/InstallPrompt';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const newClicks = prev + 1;

      if (newClicks === 5) {
        router.push('/chofer');
        return 0;
      } else if (newClicks === 10) {
        router.push('/admin');
        return 0;
      }
      return newClicks;
    });

    // Reset if no activity for 2 seconds
    const timer = setTimeout(() => {
      setLogoClicks(0);
    }, 2000);

    return () => clearTimeout(timer);
  };

  if (!mounted) return null;

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '90vh', padding: '10px 15px' }}>
      <header style={{ marginBottom: '10px' }}>
        <img
          src="/logo.jpg"
          alt="EL CASAL"
          className="main-logo"
          style={{ maxWidth: '300px', cursor: 'pointer' }}
          onClick={handleLogoClick}
        />
      </header>

      <div className="home-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', flexGrow: 1, alignItems: 'center', maxWidth: '800px', margin: '0 auto' }}>

        {/* 1. Pedir Viaje */}
        <div className="glass-panel" style={{ padding: '30px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>🚚</div>
          <h2 style={{ marginBottom: '10px', fontSize: '1.8rem' }} className="text-gradient">Pedir Viaje</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
            Cotizá y reservá tu transporte de carga de forma inmediata y profesional.
          </p>
          <Link href="/quote" style={{ width: '100%' }}>
            <button className="glass-button" style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }}>
              Nueva Solicitud
            </button>
          </Link>
        </div>

        {/* 2. Seguir Viaje */}
        <div className="glass-panel" style={{ padding: '30px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '15px' }}>📍</div>
          <h2 style={{ marginBottom: '10px', fontSize: '1.8rem' }} className="text-gradient">Seguir Viaje</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.9rem' }}>
            Consultá el estado y ubicación satelital de tu pedido en tiempo real.
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
              placeholder="CÓDIGO (EJ: A0001)"
              style={{ textAlign: 'center', textTransform: 'uppercase', padding: '12px', fontSize: '1rem' }}
              required
            />
            <button type="submit" className="glass-button" style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }}>
              Ver Mapa
            </button>
          </form>
        </div>

      </div>

      {/* Social / Admin Row */}
      <footer style={{ marginTop: '15px', paddingBottom: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>

        <div style={{
          fontSize: '0.65rem',
          color: 'var(--text-secondary)',
          textAlign: 'center',
          maxWidth: '600px',
          opacity: 0.6,
          lineHeight: '1.4',
          marginTop: '20px',
          padding: '0 10px'
        }}>
          <strong>Aviso Legal:</strong> Los presupuestos generados en este sitio son de carácter estimativo e informativo. No constituyen una oferta contractual vinculante y están sujetos a revisión y confirmación manual por parte de EL CASAL. Ni los propietarios del servicio ni los desarrolladores de la plataforma se responsabilizan por errores, variaciones de tarifas, fallos técnicos o el uso de la información aquí proporcionada. El uso de esta web implica la aceptación de estos términos.
        </div>

        <div style={{ fontSize: '0.6rem', color: 'var(--text-secondary)', opacity: 0.2, marginTop: '2px' }}>
          v1.3 Premium Logistics
        </div>
      </footer>

      <InstallPrompt />

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
