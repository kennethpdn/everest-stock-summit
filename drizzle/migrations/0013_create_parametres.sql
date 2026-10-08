CREATE TABLE public.parametres (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  devise text NOT NULL DEFAULT 'FCFA' CHECK (devise = 'FCFA'),
  fuseau_horaire text NOT NULL DEFAULT 'Africa/Porto-Novo',
  format_unites text NOT NULL DEFAULT 'unites' CHECK (format_unites IN ('unites','packs','unites_et_packs')),
  seuil_alerte_defaut integer NOT NULL DEFAULT 10 CHECK (seuil_alerte_defaut >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.parametres TO authenticated;
GRANT ALL ON public.parametres TO service_role;
ALTER TABLE public.parametres ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Approved users read parametres" ON public.parametres FOR SELECT TO authenticated USING (public.is_approved(auth.uid()));
CREATE POLICY "Admins update parametres" ON public.parametres FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.parametres (id) VALUES (true);
CREATE TRIGGER parametres_touch_updated_at BEFORE UPDATE ON public.parametres FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.audit_parametres() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.write_audit('permission', 'Paramètres modifiés',
    format('Fuseau %s, format %s, seuil par défaut %s → %s', NEW.fuseau_horaire, NEW.format_unites, OLD.seuil_alerte_defaut, NEW.seuil_alerte_defaut), 'Paramètres', NULL);
  RETURN NEW;
END $$;
CREATE TRIGGER parametres_audit AFTER UPDATE ON public.parametres FOR EACH ROW EXECUTE FUNCTION public.audit_parametres();

CREATE OR REPLACE FUNCTION public.default_seuil_alerte() RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT seuil_alerte_defaut FROM public.parametres LIMIT 1), 10)
$$;
REVOKE ALL ON FUNCTION public.default_seuil_alerte() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.default_seuil_alerte() TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.audit_parametres() FROM PUBLIC, anon;
ALTER TABLE public.stocks ALTER COLUMN seuil_alerte SET DEFAULT public.default_seuil_alerte();