CREATE TYPE public.app_role AS ENUM ('admin', 'gestionnaire_entrepot', 'responsable_centre');
CREATE TYPE public.account_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.centres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL UNIQUE,
  adresse text,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centres TO authenticated;
GRANT ALL ON public.centres TO service_role;
ALTER TABLE public.centres ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nom_complet text NOT NULL,
  email text NOT NULL,
  statut public.account_status NOT NULL DEFAULT 'pending',
  role_souhaite public.app_role NOT NULL,
  centre_id uuid REFERENCES public.centres(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT responsable_requires_centre CHECK (role_souhaite <> 'responsable_centre' OR centre_id IS NOT NULL),
  CONSTRAINT signup_role_not_admin CHECK (role_souhaite <> 'admin' OR email = 'benineverestdistribution@gmail.com')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND statut = 'approved'
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_approved(uuid) TO service_role;

CREATE POLICY "Approved users can read active centres"
ON public.centres FOR SELECT TO authenticated
USING (actif = true AND public.is_approved(auth.uid()));

CREATE POLICY "Admins manage centres"
ON public.centres FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Admins read all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update profiles"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users read own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins read all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  requested_role public.app_role;
  requested_centre uuid;
  is_first_admin boolean;
BEGIN
  is_first_admin := lower(NEW.email) = 'benineverestdistribution@gmail.com';

  IF is_first_admin THEN
    requested_role := 'admin';
    requested_centre := NULL;
  ELSE
    requested_role := CASE NEW.raw_user_meta_data ->> 'role_souhaite'
      WHEN 'responsable_centre' THEN 'responsable_centre'::public.app_role
      ELSE 'gestionnaire_entrepot'::public.app_role
    END;
    requested_centre := CASE
      WHEN requested_role = 'responsable_centre'
      THEN NULLIF(NEW.raw_user_meta_data ->> 'centre_id', '')::uuid
      ELSE NULL
    END;
  END IF;

  INSERT INTO public.profiles (id, nom_complet, email, statut, role_souhaite, centre_id, reviewed_at, reviewed_by)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(trim(NEW.raw_user_meta_data ->> 'nom_complet'), ''), split_part(NEW.email, '@', 1)),
    lower(NEW.email),
    CASE WHEN is_first_admin THEN 'approved'::public.account_status ELSE 'pending'::public.account_status END,
    requested_role,
    requested_centre,
    CASE WHEN is_first_admin THEN now() ELSE NULL END,
    CASE WHEN is_first_admin THEN NEW.id ELSE NULL END
  );

  IF is_first_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.review_registration(_user_id uuid, _approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_profile public.profiles%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Accès administrateur requis';
  END IF;

  SELECT * INTO target_profile
  FROM public.profiles
  WHERE id = _user_id AND statut = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Inscription introuvable ou déjà traitée';
  END IF;

  UPDATE public.profiles
  SET statut = CASE WHEN _approve THEN 'approved'::public.account_status ELSE 'rejected'::public.account_status END,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = _user_id;

  DELETE FROM public.user_roles WHERE user_id = _user_id;
  IF _approve THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_user_id, target_profile.role_souhaite);
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_registration(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_registration(uuid, boolean) TO service_role;