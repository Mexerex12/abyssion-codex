
CREATE POLICY "Public read lore-media" ON storage.objects FOR SELECT USING (bucket_id = 'lore-media');
CREATE POLICY "Admins upload lore-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'lore-media' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins update lore-media" ON storage.objects FOR UPDATE USING (bucket_id = 'lore-media' AND public.is_admin(auth.uid()));
CREATE POLICY "Admins delete lore-media" ON storage.objects FOR DELETE USING (bucket_id = 'lore-media' AND public.is_admin(auth.uid()));
