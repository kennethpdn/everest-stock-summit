ALTER TABLE public.profiles ADD COLUMN actif boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND statut = 'approved' AND actif)
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user(_user_id uuid, _role public.app_role, _centre uuid, _actif boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p public.profiles%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Accès administrateur requis'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = _user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Utilisateur introuvable'; END IF;
  IF p.statut <> 'approved' THEN RAISE EXCEPTION 'Le compte doit d’abord être approuvé'; END IF;
  IF _user_id = auth.uid() AND (_role <> 'admin' OR NOT _actif) THEN
    RAISE EXCEPTION 'Vous ne pouvez pas retirer votre propre rôle administrateur ni désactiver votre compte.';
  END IF;
  IF _role = 'responsable_centre' AND _centre IS NULL THEN
    RAISE EXCEPTION 'Un responsable de centre doit être assigné à un centre.';
  END IF;
  UPDATE public.profiles SET
    actif = _actif,
    centre_id = CASE WHEN _role = 'responsable_centre' THEN _centre ELSE NULL END,
    role_souhaite = CASE WHEN _role = 'admin' THEN role_souhaite ELSE _role END
  WHERE id = _user_id;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
     OR (SELECT count(*) FROM public.user_roles WHERE user_id = _user_id) <> 1 THEN
    DELETE FROM public.user_roles WHERE user_id = _user_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (_user_id, _role);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.admin_update_user(uuid, public.app_role, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_update_user(uuid, public.app_role, uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.audit_profiles()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.statut IS DISTINCT FROM OLD.statut THEN
    PERFORM public.write_audit('permission', 'Statut du compte', format('%s → %s', OLD.statut, NEW.statut), NEW.email, NULL);
  END IF;
  IF NEW.actif IS DISTINCT FROM OLD.actif THEN
    PERFORM public.write_audit('permission', CASE WHEN NEW.actif THEN 'Compte réactivé' ELSE 'Compte désactivé' END, NULL, NEW.email, NULL);
  END IF;
  IF NEW.centre_id IS DISTINCT FROM OLD.centre_id OR NEW.role_souhaite IS DISTINCT FROM OLD.role_souhaite THEN
    PERFORM public.write_audit('permission', 'Affectation modifiée', format('Rôle %s, centre %s', NEW.role_souhaite, COALESCE((SELECT nom FROM public.centres WHERE id = NEW.centre_id), '—')), NEW.email, NULL);
  END IF;
  RETURN NEW;
END $$;