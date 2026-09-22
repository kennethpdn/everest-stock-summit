CREATE TABLE IF NOT EXISTS public.admin_bootstrap_emails (
  email text PRIMARY KEY,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.admin_bootstrap_emails TO service_role;

ALTER TABLE public.admin_bootstrap_emails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read bootstrap emails"
ON public.admin_bootstrap_emails
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

GRANT SELECT ON public.admin_bootstrap_emails TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  requested_role public.app_role;
  requested_centre uuid;
  is_first_admin boolean;
BEGIN
  is_first_admin := lower(NEW.email) = 'benineverestdistribution@gmail.com'
    OR EXISTS (
      SELECT 1 FROM public.admin_bootstrap_emails b
      WHERE lower(b.email) = lower(NEW.email)
    );

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
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.promote_bootstrap_admins()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  n integer := 0;
  r record;
BEGIN
  FOR r IN
    SELECT p.id FROM public.profiles p
    JOIN public.admin_bootstrap_emails b ON lower(b.email) = lower(p.email)
  LOOP
    UPDATE public.profiles
    SET statut = 'approved'::public.account_status,
        role_souhaite = 'admin'::public.app_role,
        centre_id = NULL,
        reviewed_at = now(),
        reviewed_by = r.id
    WHERE id = r.id;

    DELETE FROM public.user_roles WHERE user_id = r.id;
    INSERT INTO public.user_roles (user_id, role) VALUES (r.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$function$;

REVOKE ALL ON FUNCTION public.promote_bootstrap_admins() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.promote_bootstrap_admins() TO service_role;