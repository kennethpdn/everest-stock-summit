CREATE TYPE public.statut_demande AS ENUM ('en_attente','validee','en_livraison','livree','refusee');
CREATE TABLE public.demandes_reapprovisionnement (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  centre_id uuid NOT NULL REFERENCES public.centres(id),
  produit_id uuid NOT NULL REFERENCES public.produits(id),
  quantite_demandee integer NOT NULL CHECK (quantite_demandee > 0),
  statut public.statut_demande NOT NULL DEFAULT 'en_attente',
  demandeur_id uuid NOT NULL DEFAULT auth.uid(),
  validateur_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX demandes_reappro_centre_idx ON public.demandes_reapprovisionnement (centre_id, statut);
GRANT SELECT, INSERT, UPDATE ON public.demandes_reapprovisionnement TO authenticated;
GRANT ALL ON public.demandes_reapprovisionnement TO service_role;
ALTER TABLE public.demandes_reapprovisionnement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Managers read demandes" ON public.demandes_reapprovisionnement FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestionnaire_entrepot'));
CREATE POLICY "Centre read own demandes" ON public.demandes_reapprovisionnement FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'responsable_centre') AND centre_id = public.user_centre_id(auth.uid()));
CREATE POLICY "Centre create own demandes" ON public.demandes_reapprovisionnement FOR INSERT TO authenticated
  WITH CHECK (demandeur_id = auth.uid() AND statut = 'en_attente' AND validateur_id IS NULL
    AND public.has_role(auth.uid(),'responsable_centre') AND centre_id = public.user_centre_id(auth.uid()));
CREATE POLICY "Managers update demandes" ON public.demandes_reapprovisionnement FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestionnaire_entrepot'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'gestionnaire_entrepot'));

CREATE OR REPLACE FUNCTION public.handle_demande_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  IF NEW.statut IS DISTINCT FROM OLD.statut THEN
    IF NOT ((OLD.statut = 'en_attente' AND NEW.statut IN ('validee','refusee'))
         OR (OLD.statut = 'validee' AND NEW.statut = 'en_livraison')
         OR (OLD.statut = 'en_livraison' AND NEW.statut = 'livree')) THEN
      RAISE EXCEPTION 'Transition de statut non autorisée : % → %.', OLD.statut, NEW.statut;
    END IF;
    IF NEW.statut IN ('validee','refusee') THEN NEW.validateur_id := auth.uid(); END IF;
    IF NEW.statut = 'livree' THEN
      INSERT INTO public.mouvements_stock (produit_id, type_mouvement, quantite_unites, centre_source_id, centre_destination_id, motif, utilisateur_id)
      VALUES (NEW.produit_id, 'sortie_vers_centre', NEW.quantite_demandee, NULL, NEW.centre_id, 'Réapprovisionnement livré', auth.uid());
    END IF;
  END IF;
  -- champs figés
  NEW.centre_id := OLD.centre_id; NEW.produit_id := OLD.produit_id;
  NEW.quantite_demandee := OLD.quantite_demandee; NEW.demandeur_id := OLD.demandeur_id;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.handle_demande_update() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER demandes_reappro_update BEFORE UPDATE ON public.demandes_reapprovisionnement
  FOR EACH ROW EXECUTE FUNCTION public.handle_demande_update();