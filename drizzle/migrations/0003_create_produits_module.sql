CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL UNIQUE,
  description text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users read categories" ON public.categories
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));

CREATE POLICY "Stock managers insert categories" ON public.categories
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot'));

CREATE POLICY "Stock managers update categories" ON public.categories
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot'));

CREATE TABLE public.produits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  categorie_id uuid REFERENCES public.categories(id) ON DELETE RESTRICT,
  reference_format text NOT NULL DEFAULT 'Unité',
  unites_par_pack integer NOT NULL DEFAULT 1 CHECK (unites_par_pack > 0),
  prix_unitaire numeric(12,2) NOT NULL DEFAULT 0 CHECK (prix_unitaire >= 0),
  prix_pack numeric(12,2) NOT NULL DEFAULT 0 CHECK (prix_pack >= 0),
  sku_code_barres text,
  photo_url text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX produits_categorie_id_idx ON public.produits (categorie_id);
CREATE UNIQUE INDEX produits_sku_unique ON public.produits (sku_code_barres) WHERE sku_code_barres IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.produits TO authenticated;
GRANT ALL ON public.produits TO service_role;

ALTER TABLE public.produits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Approved users read produits" ON public.produits
  FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));

CREATE POLICY "Stock managers insert produits" ON public.produits
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot'));

CREATE POLICY "Stock managers update produits" ON public.produits
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'gestionnaire_entrepot'));

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER categories_touch_updated_at BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER produits_touch_updated_at BEFORE UPDATE ON public.produits
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();