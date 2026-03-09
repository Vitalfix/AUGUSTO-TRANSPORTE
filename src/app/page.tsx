"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import InstallPrompt from '@/components/InstallPrompt';
import { Customer } from '@/lib/types';

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [corporateClients, setCorporateClients] = useState<Customer[]>([]);

  // Internal counters for secret access
  const [clicks, setClicks] = useState({ logo: 0, admin: 0 });

  // Use clicks in a hidden way to satisfy lint if needed, 
  // but better to just ensure it's functional.
  const isDebug = process.env.NODE_ENV === 'development' && clicks.logo > 0;

  const fetchCorporateClients = async () => {
    try {
      const res = await fetch('/api/customers/public');
      if (res.ok) {
        const data = await res.json();
        setCorporateClients(data.filter((c: Customer) => c.is_corporate));
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
    setClicks(prev => {
      const newLogo = prev.logo + 1;
      if (newLogo === 5) {
        router.push('/chofer');
        return { ...prev, logo: 0 };
      }
      return { ...prev, logo: newLogo };
    });
    setTimeout(() => setClicks(prev => ({ ...prev, logo: 0 })), 2000);
  };

  const handleAdminClick = () => {
    setClicks(prev => {
      const newAdmin = prev.admin + 1;
      if (newAdmin === 5) {
        sessionStorage.removeItem('admin_password');
        router.push('/admin');
        return { ...prev, admin: 0 };
      }
      return { ...prev, admin: newAdmin };
    });
    setTimeout(() => setClicks(prev => ({ ...prev, admin: 0 })), 2000);
  };

  if (!mounted) return null;

  return (
    <div className="page-container flex-col items-center">
      {isDebug && <div className="abs z-100 top-full left-0 text-xs">Clicks: {clicks.logo}</div>}
      <header className="home-header">
        <img
          src="/logo.jpg"
          alt="EL CASAL"
          className="main-logo pointer main-logo-img"
          onClick={handleLogoClick}
        />
      </header>

      {/* ACCESO CORPORATIVO */}
      {mounted && corporateClients.length > 0 && (
        <div className="glass-panel corporate-access-panel">
          <h3 className="text-gradient text-center mb-15 text-lg uppercase letter-spacing-1">
            ACCESO CORPORATIVO
          </h3>
          <div className="corporate-grid">
            {corporateClients.map((client) => (
              <Link key={client.id} href={`/quote?client=${client.client_slug}`} className="corporate-card">
                <div className="corporate-card-inner">
                  {client.logo_url ? (
                    <img
                      src={client.logo_url}
                      alt={client.name}
                      className="corporate-logo-img"
                    />
                  ) : (
                    <>
                      <div className="corporate-placeholder-icon">🏢</div>
                      <span className="text-xs text-bold text-secondary">{client.name}</span>
                    </>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="home-main-grid">
        {/* 1. Seguir Viaje */}
        <div className="glass-panel p-20 text-center flex-col justify-center">
          <div className="home-icon-lg">📍</div>
          <h2 className="text-gradient mb-10 text-xl">Seguir Viaje</h2>
          <p className="text-secondary mb-20 text-sm">
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
              className="glass-input text-center uppercase"
              placeholder="CÓDIGO (EJ: A0001)"
              required
            />
            <button type="submit" className="glass-button w-full text-lg">
              Ver Mapa
            </button>
          </form>
        </div>

        {/* 2. Pedir Viaje */}
        <div className="glass-panel p-20 text-center flex-col justify-center">
          <div className="home-icon-lg">🚚</div>
          <h2 className="text-gradient mb-10 text-xl">Pedir Viaje</h2>
          <p className="text-secondary mb-20 text-sm">
            Cotizá y reservá tu transporte de carga de forma inmediata y profesional.
          </p>
          <Link href="/quote" className="w-full">
            <button className="glass-button w-full text-lg">
              Nueva Solicitud
            </button>
          </Link>
        </div>
      </div>

      {/* 3. Servicios Ofrecidos */}
      <div className="glass-panel services-panel">
        <h3 className="text-gradient text-center mb-20 text-lg letter-spacing-1">
          NUESTROS SERVICIOS
        </h3>
        <div className="services-grid">
          {[
            { tag: '🛒', text: 'E-commerce' },
            { tag: '📦', text: 'Flete puerta a puerta' },
            { tag: '🚚', text: 'Reparto' },
            { tag: '🚛', text: 'Servicio de Expresos' },
            { tag: '🏠', text: 'Mudanzas' },
            { tag: '🏗️', text: 'Camiones Plancha' },
            { tag: '❄️', text: 'Camiones Refrigerados' },
            { tag: '🚢', text: 'Camiones Portacontenedores' },
            { tag: '🛵', text: 'Mensajería' },
            { tag: '⚠️', text: 'Cargas Peligrosas' },
          ].map((srv, idx) => (
            <div key={idx} className="service-item">
              <span className="service-icon">{srv.tag}</span>
              <span className="text-xs text-bold">{srv.text}</span>
            </div>
          ))}
        </div>
      </div>

      <footer className="home-footer">
        <div onClick={handleAdminClick} className="legal-notice">
          <strong>Aviso Legal:</strong> Todos los presupuestos no incluyen seguro. Los presupuestos generados en este sitio son de carácter estimativo e informativo. No constituyen una oferta contractual vinculante y están sujetos a revisión y confirmación manual por parte de EL CASAL. Ni los propietarios del servicio ni los desarrolladores de la plataforma se responsabilizan por errores, variaciones de tarifas, fallos técnicos o el uso de la información aquí proporcionada. El uso de esta web implica la aceptación de estos términos.
        </div>
        <div className="version-tag">
          v1.4 VitalFix Elite
        </div>
      </footer>

      <InstallPrompt />
    </div>
  );
}
