
-- Fix: Change the view to use SECURITY INVOKER (default) explicitly
DROP VIEW IF EXISTS public.staff_public;
CREATE VIEW public.staff_public WITH (security_invoker = true) AS
  SELECT id, name, salary_date, created_at, updated_at
  FROM public.staff;
