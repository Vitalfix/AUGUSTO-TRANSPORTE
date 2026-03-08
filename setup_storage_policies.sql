-- ============================================================
-- POLITICAS DE STORAGE PARA BUCKET "logos"
-- Ejecutar en Supabase → SQL Editor → New Query → Run
-- ============================================================
-- Permitir a cualquiera LEER las imágenes del bucket logos
CREATE POLICY "Logos - lectura pública" ON storage.objects FOR
SELECT TO public USING (bucket_id = 'logos');
-- Permitir a cualquiera SUBIR imágenes al bucket logos
CREATE POLICY "Logos - subida pública" ON storage.objects FOR
INSERT TO public WITH CHECK (bucket_id = 'logos');
-- Permitir a cualquiera SOBREESCRIBIR imágenes del bucket logos
CREATE POLICY "Logos - actualización pública" ON storage.objects FOR
UPDATE TO public USING (bucket_id = 'logos') WITH CHECK (bucket_id = 'logos');