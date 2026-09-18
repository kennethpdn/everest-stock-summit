GRANT SELECT ON public.centres TO anon;
CREATE POLICY "Public can read active centres"
ON public.centres FOR SELECT TO anon
USING (actif = true);