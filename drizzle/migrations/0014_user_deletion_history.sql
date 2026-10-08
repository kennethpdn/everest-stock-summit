ALTER TABLE public.mouvements_stock ALTER COLUMN utilisateur_id DROP NOT NULL;
ALTER TABLE public.mouvements_stock DROP CONSTRAINT mouvements_stock_utilisateur_id_fkey;
ALTER TABLE public.mouvements_stock ADD CONSTRAINT mouvements_stock_utilisateur_id_fkey FOREIGN KEY (utilisateur_id) REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.profiles DROP CONSTRAINT profiles_reviewed_by_fkey;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.demandes_reapprovisionnement ALTER COLUMN demandeur_id DROP NOT NULL;
ALTER TABLE public.demandes_reapprovisionnement ADD COLUMN demandeur_nom text, ADD COLUMN validateur_nom text;
UPDATE public.demandes_reapprovisionnement d SET demandeur_nom = (SELECT nom_complet FROM public.profiles WHERE id = d.demandeur_id),
  validateur_nom = (SELECT nom_complet FROM public.profiles WHERE id = d.validateur_id);
UPDATE public.mouvements_stock m SET utilisateur_nom = (SELECT nom_complet FROM public.profiles WHERE id = m.utilisateur_id) WHERE utilisateur_nom IS NULL;

CREATE OR REPLACE FUNCTION public.handle_demande_insert() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  SELECT nom_complet INTO NEW.demandeur_nom FROM public.profiles WHERE id = NEW.demandeur_id;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.handle_demande_insert() FROM PUBLIC, anon;
CREATE TRIGGER demandes_reappro_insert BEFORE INSERT ON public.demandes_reapprovisionnement FOR EACH ROW EXECUTE FUNCTION public.handle_demande_insert();

CREATE OR REPLACE FUNCTION public.handle_demande_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at := now();
  IF NEW.statut IS DISTINCT FROM OLD.statut THEN
    IF NOT ((OLD.statut = 'en_attente' AND NEW.statut IN ('validee','refusee'))
         OR (OLD.statut = 'validee' AND NEW.statut = 'en_livraison')
         OR (OLD.statut = 'en_livraison' AND NEW.statut = 'livree')) THEN
      RAISE EXCEPTION 'Transition de statut non autorisée : % → %.', OLD.statut, NEW.statut;
    END IF;
    IF NEW.statut IN ('validee','refusee') THEN
      NEW.validateur_id := auth.uid();
      SELECT nom_complet INTO NEW.validateur_nom FROM public.profiles WHERE id = auth.uid();
    END IF;
    IF NEW.statut = 'livree' THEN
      INSERT INTO public.mouvements_stock (produit_id, type_mouvement, quantite_unites, centre_source_id, centre_destination_id, motif, utilisateur_id)
      VALUES (NEW.produit_id, 'sortie_vers_centre', NEW.quantite_demandee, NULL, NEW.centre_id, 'Réapprovisionnement livré', auth.uid());
    END IF;
  END IF;
  NEW.centre_id := OLD.centre_id; NEW.produit_id := OLD.produit_id;
  NEW.quantite_demandee := OLD.quantite_demandee; NEW.demandeur_id := OLD.demandeur_id;
  NEW.demandeur_nom := OLD.demandeur_nom;
  RETURN NEW;
END $function$;