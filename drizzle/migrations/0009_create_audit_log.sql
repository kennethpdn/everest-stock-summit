CREATE TABLE public.journal_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categorie text NOT NULL CHECK (categorie IN ('connexion','stock','permission')),
  action text NOT NULL,
  description text,
  auteur_id uuid,
  auteur_nom text,
  cible text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX journal_audit_created_idx ON public.journal_audit (created_at DESC);
GRANT SELECT ON public.journal_audit TO authenticated;
GRANT ALL ON public.journal_audit TO service_role;
ALTER TABLE public.journal_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read audit" ON public.journal_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.write_audit(_categorie text, _action text, _description text, _cible text, _details jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_nom text;
BEGIN
  SELECT nom_complet INTO v_nom FROM public.profiles WHERE id = auth.uid();
  INSERT INTO public.journal_audit (categorie, action, description, auteur_id, auteur_nom, cible, details)
  VALUES (_categorie, _action, _description, auth.uid(), COALESCE(v_nom, CASE WHEN auth.uid() IS NULL THEN 'Système' END), _cible, _details);
END $$;
REVOKE ALL ON FUNCTION public.write_audit(text,text,text,text,jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_connexion()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  PERFORM public.write_audit('connexion', 'Connexion', 'Connexion réussie', (SELECT email FROM public.profiles WHERE id = auth.uid()), NULL);
END $$;
REVOKE ALL ON FUNCTION public.log_connexion() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_connexion() TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_stocks()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_prod text; v_lieu text;
BEGIN
  SELECT nom INTO v_prod FROM public.produits WHERE id = NEW.produit_id;
  SELECT COALESCE((SELECT nom FROM public.centres WHERE id = NEW.centre_id), 'Entrepôt central') INTO v_lieu;
  IF TG_OP = 'INSERT' THEN
    PERFORM public.write_audit('stock', 'Création de stock', format('%s unité(s)', NEW.quantite_unites), v_prod || ' — ' || v_lieu, jsonb_build_object('quantite', NEW.quantite_unites, 'seuil', NEW.seuil_alerte));
  ELSIF NEW.quantite_unites IS DISTINCT FROM OLD.quantite_unites OR NEW.seuil_alerte IS DISTINCT FROM OLD.seuil_alerte THEN
    PERFORM public.write_audit('stock', 'Modification de stock',
      format('Quantité %s → %s, seuil %s → %s', OLD.quantite_unites, NEW.quantite_unites, OLD.seuil_alerte, NEW.seuil_alerte),
      v_prod || ' — ' || v_lieu,
      jsonb_build_object('avant', OLD.quantite_unites, 'apres', NEW.quantite_unites));
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER stocks_audit AFTER INSERT OR UPDATE ON public.stocks FOR EACH ROW EXECUTE FUNCTION public.audit_stocks();

CREATE OR REPLACE FUNCTION public.audit_user_roles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_email text;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  SELECT email INTO v_email FROM public.profiles WHERE id = r.user_id;
  PERFORM public.write_audit('permission', CASE WHEN TG_OP = 'DELETE' THEN 'Rôle retiré' ELSE 'Rôle attribué' END, r.role::text, v_email, NULL);
  RETURN NULL;
END $$;
CREATE TRIGGER user_roles_audit AFTER INSERT OR DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles();

CREATE OR REPLACE FUNCTION public.audit_profiles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.statut IS DISTINCT FROM OLD.statut THEN
    PERFORM public.write_audit('permission', 'Statut du compte', format('%s → %s', OLD.statut, NEW.statut), NEW.email, NULL);
  END IF;
  IF NEW.centre_id IS DISTINCT FROM OLD.centre_id OR NEW.role_souhaite IS DISTINCT FROM OLD.role_souhaite THEN
    PERFORM public.write_audit('permission', 'Affectation modifiée', format('Rôle %s, centre %s', NEW.role_souhaite, COALESCE((SELECT nom FROM public.centres WHERE id = NEW.centre_id), '—')), NEW.email, NULL);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_audit AFTER UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.audit_profiles();

REVOKE ALL ON FUNCTION public.audit_stocks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_user_roles() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.audit_profiles() FROM PUBLIC, anon, authenticated;