ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS signup_role_not_admin;
ALTER TABLE public.profiles ADD CONSTRAINT signup_role_not_admin CHECK (
  role_souhaite <> 'admin'::public.app_role
  OR lower(email) IN ('benineverestdistribution@gmail.com', 'padononoukenneth370@gmail.com')
);