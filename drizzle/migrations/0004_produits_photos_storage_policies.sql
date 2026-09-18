CREATE POLICY "Approved users read produit photos" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'produits-photos' AND public.is_approved(auth.uid()));

CREATE POLICY "Stock managers upload produit photos" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'produits-photos' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot')));

CREATE POLICY "Stock managers update produit photos" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'produits-photos' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot')))
  WITH CHECK (bucket_id = 'produits-photos' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot')));

CREATE POLICY "Stock managers delete produit photos" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'produits-photos' AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot')));