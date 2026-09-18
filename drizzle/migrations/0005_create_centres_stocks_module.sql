-- Type de centre de vente
DO $$ BEGIN
  CREATE TYPE public.type_centre AS ENUM ('bar', 'restaurant', 'supermarche', 'lounge', 'depot');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Enrichissement de la table centres existante (utilisée par profiles.centre_id)
ALTER TABLE public.centres ADD COLUMN IF NOT EXISTS zone text;
ALTER TABLE public.centres ADD COLUMN IF NOT EXISTS type_centre public.type_centre NOT NULL DEFAULT 'bar';
ALTER TABLE public.centres ADD COLUMN IF NOT EXISTS contact_nom text;
ALTER TABLE public.centres ADD COLUMN IF NOT EXISTS contact_telephone text;
ALTER TABLE public.centres ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS centres_touch_updated_at ON public.centres;
CREATE TRIGGER centres_touch_updated_at BEFORE UPDATE ON public.centres
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Les gestionnaires d'entrepôt peuvent aussi gérer les centres
DROP POLICY IF EXISTS "Stock managers insert centres" ON public.centres;
CREATE POLICY "Stock managers insert centres" ON public.centres
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot'));

DROP POLICY IF EXISTS "Stock managers update centres" ON public.centres;
CREATE POLICY "Stock managers update centres" ON public.centres
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot'));

DROP POLICY IF EXISTS "Stock managers read all centres" ON public.centres;
CREATE POLICY "Stock managers read all centres" ON public.centres
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot'));

-- Centre du profil de l'utilisateur (SECURITY DEFINER pour éviter la récursion RLS)
CREATE OR REPLACE FUNCTION public.user_centre_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT centre_id FROM public.profiles WHERE id = _user_id
$$;

REVOKE ALL ON FUNCTION public.user_centre_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_centre_id(uuid) TO authenticated, service_role;

-- Stock par produit et par emplacement (centre_id NULL = entrepôt central)
CREATE TABLE IF NOT EXISTS public.stocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produit_id uuid NOT NULL REFERENCES public.produits(id) ON DELETE RESTRICT,
  centre_id uuid REFERENCES public.centres(id) ON DELETE RESTRICT,
  quantite_unites integer NOT NULL DEFAULT 0 CHECK (quantite_unites >= 0),
  seuil_alerte integer NOT NULL DEFAULT 10 CHECK (seuil_alerte >= 0),
  derniere_maj timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS stocks_produit_centre_key
  ON public.stocks (produit_id, centre_id) NULLS NOT DISTINCT;
CREATE INDEX IF NOT EXISTS stocks_centre_id_idx ON public.stocks (centre_id);

GRANT SELECT, INSERT, UPDATE ON public.stocks TO authenticated;
GRANT ALL ON public.stocks TO service_role;

ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_derniere_maj()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.derniere_maj := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stocks_touch_derniere_maj ON public.stocks;
CREATE TRIGGER stocks_touch_derniere_maj BEFORE UPDATE ON public.stocks
FOR EACH ROW EXECUTE FUNCTION public.touch_derniere_maj();

DROP POLICY IF EXISTS "Managers read all stocks" ON public.stocks;
CREATE POLICY "Managers read all stocks" ON public.stocks
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot'));

DROP POLICY IF EXISTS "Centre managers read own centre stocks" ON public.stocks;
CREATE POLICY "Centre managers read own centre stocks" ON public.stocks
FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'responsable_centre')
  AND centre_id IS NOT NULL
  AND centre_id = public.user_centre_id(auth.uid())
);

DROP POLICY IF EXISTS "Managers insert stocks" ON public.stocks;
CREATE POLICY "Managers insert stocks" ON public.stocks
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot'));

DROP POLICY IF EXISTS "Managers update stocks" ON public.stocks;
CREATE POLICY "Managers update stocks" ON public.stocks
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot'));

DROP POLICY IF EXISTS "Centre managers update own centre stocks" ON public.stocks;
CREATE POLICY "Centre managers update own centre stocks" ON public.stocks
FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(), 'responsable_centre')
  AND centre_id IS NOT NULL
  AND centre_id = public.user_centre_id(auth.uid())
)
WITH CHECK (
  public.has_role(auth.uid(), 'responsable_centre')
  AND centre_id IS NOT NULL
  AND centre_id = public.user_centre_id(auth.uid())
);
