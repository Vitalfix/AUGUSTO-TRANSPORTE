-- Limpiar tabla para evitar duplicados si se corre de nuevo
delete from pricing_config;

-- Insertar valores de ejemplo (Precios en ARS actualizados a 2024 aprox)
-- logic: name, description, price_km, price_hour, price_wait_hour, price_stay
insert into pricing_config (id, name, description, price_km, price_hour, price_wait_hour, price_stay) values
('utilitario', 'Utilitario Chico (Kangoo, Partner, Berlingo)', 'Hasta 600kg. Ideal para paquetería rápida.', 450, 6500, 3500, 45000),
('furgon_mediano', 'Furgón Mediano (Sprinter, Master, Daily)', 'Hasta 1500kg. Capacidad 2-3 pallets.', 650, 9500, 4500, 65000),
('furgon_grande', 'Furgón Techo Elevado / Extra Largo', 'Hasta 2000kg. Carga de gran volumen.', 850, 12500, 5500, 75000),
('camion_chasis', 'Camión Chasis / Mudancero', 'Hasta 5000kg. Con furgón o playo.', 1200, 18000, 8000, 120000),
('camion_balancin', 'Camión Balancín (10-12 Pallets)', 'Hasta 10.000kg. Cargas pesadas industriales.', 1600, 24000, 12000, 150000),
('camion_semi', 'Semi-remolque (28 Pallets)', 'Hasta 28.000kg. Máxima capacidad de transporte.', 2200, 35000, 20000, 250000);

-- Asegurar que la configuración de contraseña maestra exista
insert into site_settings (id, value) values ('master_password', 'vitalfix') on conflict (id) do update set value = 'vitalfix';
