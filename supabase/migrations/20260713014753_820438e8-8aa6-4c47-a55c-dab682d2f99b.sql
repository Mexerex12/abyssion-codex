DROP POLICY IF EXISTS "Authenticated read lore-media" ON storage.objects;

CREATE POLICY "Staff read lore-media"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'lore-media' AND public.is_staff(auth.uid()));