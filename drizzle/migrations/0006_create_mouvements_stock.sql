CREATE TYPE public.type_mouvement AS ENUM ('entree', 'sortie_vers_centre', 'vente', 'retour', 'casse_invendu');

CREATE UNIQUE INDEX IF NOT EXISTS stocks_produit_entrepot_key ON public.stocks (produit_id) WHERE centre_id IS NULL;

CREATE TABLE public.mouvements_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produit_id uuid NOT NULL REFERENCES public.produits(id) ON DELETE RESTRICT,
  type_mouvement public.type_mouvement NOT NULL,
  quantite_unites integer NOT NULL CHECK (quantite_unites > 0),
  centre_source_id uuid REFERENCES public.centres(id) ON DELETE RESTRICT,
  centre_destination_id uuid REFERENCES public.centres(id) ON DELETE RESTRICT,
  motif text,
  utilisateur_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  utilisateur_nom text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX mouvements_stock_created_at_idx ON public.mouvements_stock (created_at DESC);
CREATE INDEX mouvements_stock_produit_idx ON public.mouvements_stock (produit_id);
CREATE INDEX mouvements_stock_source_idx ON public.mouvements_stock (centre_source_id);
CREATE INDEX mouvements_stock_destination_idx ON public.mouvements_stock (centre_destination_id);

CREATE OR REPLACE FUNCTION public.apply_stock_delta(_produit uuid, _centre uuid, _delta integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_qte integer;
  v_nom text;
BEGIN
  SELECT nom INTO v_nom FROM public.produits WHERE id = _produit;

  SELECT id, quantite_unites INTO v_id, v_qte
  FROM public.stocks
  WHERE produit_id = _produit AND centre_id IS NOT DISTINCT FROM _centre
  FOR UPDATE;

  IF v_id IS NULL THEN
    IF _delta < 0 THEN
      RAISE EXCEPTION 'Stock insuffisant : aucun stock enregistré pour « % » à cet emplacement.', COALESCE(v_nom, 'ce produit');
    END IF;
    INSERT INTO public.stocks (produit_id, centre_id, quantite_unites)
    VALUES (_produit, _centre, _delta);
    RETURN;
  END IF;

  IF v_qte + _delta < 0 THEN
    RAISE EXCEPTION 'Stock insuffisant pour « % » : % unité(s) disponible(s), % demandée(s).',
      COALESCE(v_nom, 'ce produit'), v_qte, abs(_delta);
  END IF;

  UPDATE public.stocks
  SET quantite_unites = v_qte + _delta, derniere_maj = now()
  WHERE id = v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_mouvement_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.utilisateur_id IS NULL THEN
    NEW.utilisateur_id := auth.uid();
  END IF;

  SELECT nom_complet INTO NEW.utilisateur_nom FROM public.profiles WHERE id = NEW.utilisateur_id;

  NEW.motif := NULLIF(btrim(COALESCE(NEW.motif, '')), '');
  IF NEW.type_mouvement IN ('retour', 'casse_invendu') AND NEW.motif IS NULL THEN
    RAISE EXCEPTION 'Un motif est obligatoire pour un retour ou une casse/invendu.';
  END IF;

  IF NEW.type_mouvement = 'entree' THEN
    NEW.centre_source_id := NULL;
    PERFORM public.apply_stock_delta(NEW.produit_id, NEW.centre_destination_id, NEW.quantite_unites);

  ELSIF NEW.type_mouvement = 'sortie_vers_centre' THEN
    IF NEW.centre_destination_id IS NULL THEN
      RAISE EXCEPTION 'Une sortie vers un centre doit préciser le centre destinataire.';
    END IF;
    IF NEW.centre_source_id IS NOT DISTINCT FROM NEW.centre_destination_id THEN
      RAISE EXCEPTION 'Le centre source et le centre destinataire doivent être différents.';
    END IF;
    PERFORM public.apply_stock_delta(NEW.produit_id, NEW.centre_source_id, -NEW.quantite_unites);
    PERFORM public.apply_stock_delta(NEW.produit_id, NEW.centre_destination_id, NEW.quantite_unites);

  ELSIF NEW.type_mouvement IN ('vente', 'casse_invendu') THEN
    NEW.centre_destination_id := NULL;
    PERFORM public.apply_stock_delta(NEW.produit_id, NEW.centre_source_id, -NEW.quantite_unites);

  ELSIF NEW.type_mouvement = 'retour' THEN
    IF NEW.centre_source_id IS NULL THEN
      RAISE EXCEPTION 'Un retour doit préciser le centre d’origine.';
    END IF;
    PERFORM public.apply_stock_delta(NEW.produit_id, NEW.centre_source_id, -NEW.quantite_unites);
    PERFORM public.apply_stock_delta(NEW.produit_id, NEW.centre_destination_id, NEW.quantite_unites);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER mouvements_stock_apply
BEFORE INSERT ON public.mouvements_stock
FOR EACH ROW EXECUTE FUNCTION public.handle_mouvement_stock();

GRANT SELECT, INSERT ON public.mouvements_stock TO authenticated;
GRANT ALL ON public.mouvements_stock TO service_role;

ALTER TABLE public.mouvements_stock ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers read all mouvements"
ON public.mouvements_stock FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot'));

CREATE POLICY "Centre managers read own centre mouvements"
ON public.mouvements_stock FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'responsable_centre')
  AND public.user_centre_id(auth.uid()) IS NOT NULL
  AND (
    centre_source_id = public.user_centre_id(auth.uid())
    OR centre_destination_id = public.user_centre_id(auth.uid())
  )
);

CREATE POLICY "Managers insert mouvements"
ON public.mouvements_stock FOR INSERT TO authenticated
WITH CHECK (
  utilisateur_id = auth.uid()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot'))
);

CREATE POLICY "Centre managers insert own centre mouvements"
ON public.mouvements_stock FOR INSERT TO authenticated
WITH CHECK (
  utilisateur_id = auth.uid()
  AND public.has_role(auth.uid(), 'responsable_centre')
  AND public.user_centre_id(auth.uid()) IS NOT NULL
  AND type_mouvement IN ('vente', 'retour', 'casse_invendu')
  AND centre_source_id = public.user_centre_id(auth.uid())
);

REVOKE ALL ON FUNCTION public.apply_stock_delta(uuid, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_mouvement_stock() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.handle_mouvement_stock() TO authenticated, service_role;