"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import InstallPrompt from '@/components/InstallPrompt';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);
  const [adminClicks, setAdminClicks] = useState(0);
  const [corporateClients, setCorporateClients] = useState<any[]>([]);

  const fetchCorporateClients = async () => {
    try {
      const res = await fetch('/api/customers/public');
      if (res.ok) {
        const data = await res.json();
        setCorporateClients(data.filter((c: any) => c.is_corporate));
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchCorporateClients();
  }, []);

  const handleLogoClick = () => {
    setLogoClicks(prev => {
      const newClicks = prev + 1;
      if (newClicks === 5) {
        router.push('/chofer');
        return 0;
      }
      return newClicks;
    });
    const timer = setTimeout(() => setLogoClicks(0), 2000);
    return () => clearTimeout(timer);
  };

  const handleAdminClick = () => {
    setAdminClicks(prev => {
      const newClicks = prev + 1;
      if (newClicks === 5) {
        // Clear session to force password prompt every time
        sessionStorage.removeItem('admin_password');
        router.push('/admin');
        return 0;
      }
      return newClicks;
    });
    const timer = setTimeout(() => setAdminClicks(0), 2000);
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

      <div className="home-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', flexGrow: 1, alignItems: 'stretch', maxWidth: '800px', margin: '0 auto' }}>

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

      {/* 3. Servicios Ofrecidos */}
      <div className="glass-panel" style={{ marginTop: '20px', padding: '25px', maxWidth: '800px', margin: '20px auto 0 auto', width: '100%' }}>
        <h3 className="text-gradient" style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.4rem', letterSpacing: '1px' }}>
          NUESTROS SERVICIOS
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px' }}>
          {[
            { tag: '🛒', text: 'E-commerce' },
            { tag: '📦', text: 'Flete puerta a puerta' },
            { tag: '🚚', text: 'Reparto' },
            { tag: '🚛', text: 'Servicio de Expresos' },
            { tag: '🏠', text: 'Mudanzas' },
            { tag: '🏗️', text: 'Camiones Plancha' },
            { tag: '❄️', text: 'Camiones Refrigerados' },
            { tag: '🚢', text: 'Camiones Portacontenedores' },
          ].map((srv, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              <span style={{ fontSize: '1.2rem' }}>{srv.tag}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{srv.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Clientes Corporativos */}
      {mounted && corporateClients.length > 0 && (
        <div className="glass-panel" style={{ marginTop: '20px', padding: '25px', maxWidth: '800px', margin: '20px auto 0 auto', width: '100%' }}>
          <h3 className="text-gradient" style={{ textAlign: 'center', marginBottom: '20px', fontSize: '1.2rem', letterSpacing: '1px' }}>
            ACCESO CORPORATIVO
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '20px', justifyContent: 'center' }}>
            {corporateClients.map((client) => (
              <Link key={client.id} href={`/quote?client=${client.client_slug}`} className="corporate-card">
                <div style={{
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '15px',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  border: '1px solid var(--glass-border)',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer'
                }}>
                  {client.logo_url || client.client_slug === 'siemens' ? (
                    <img
                      src={client.logo_url || '/logos/siemens.png'}
                      alt={client.name}
                      style={{ height: '40px', maxWidth: '120px', objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                    />
                  ) : (
                    <div style={{ fontSize: '2rem' }}>🏢</div>
                  )}
                  <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>{client.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Social / Admin Row */}
      <footer style={{ marginTop: '15px', paddingBottom: '5px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>

        <div
          onClick={handleAdminClick}
          style={{
            fontSize: '0.65rem',
            color: 'var(--text-secondary)',
            textAlign: 'center',
            maxWidth: '600px',
            opacity: 0.6,
            lineHeight: '1.4',
            marginTop: '20px',
            padding: '0 10px',
            cursor: 'default',
            userSelect: 'none'
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
        .corporate-card:hover div {
          transform: translateY(-5px);
          background: rgba(255,255,255,0.1) !important;
          border-color: var(--accent-color) !important;
          box-shadow: 0 10px 20px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  );
}
