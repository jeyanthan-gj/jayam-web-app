-- Add mobile_number to staff table if it doesn't exist
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS mobile_number TEXT;

-- Create custom users table if it doesn't exist (used instead of Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  birthday TEXT,
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Allow public (anon) access to users table since Flutter app doesn't use Supabase Auth sessions
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon read users" ON public.users;
CREATE POLICY "Allow anon read users"
  ON public.users FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert users" ON public.users;
CREATE POLICY "Allow anon insert users"
  ON public.users FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon update users" ON public.users;
CREATE POLICY "Allow anon update users"
  ON public.users FOR UPDATE TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow anon delete users" ON public.users;
CREATE POLICY "Allow anon delete users"
  ON public.users FOR DELETE TO anon, authenticated
  USING (true);

-- Fix RLS on all other tables to allow anon access (since Flutter uses anon key without Auth session)
-- Brands
DROP POLICY IF EXISTS "Anyone authenticated can view brands" ON public.brands;
CREATE POLICY "Anon can view brands"
  ON public.brands FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert brands" ON public.brands;
CREATE POLICY "Anon can insert brands"
  ON public.brands FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update brands" ON public.brands;
CREATE POLICY "Anon can update brands"
  ON public.brands FOR UPDATE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can delete brands" ON public.brands;
CREATE POLICY "Anon can delete brands"
  ON public.brands FOR DELETE TO anon, authenticated USING (true);

-- Models
DROP POLICY IF EXISTS "Anyone authenticated can view models" ON public.models;
CREATE POLICY "Anon can view models"
  ON public.models FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert models" ON public.models;
CREATE POLICY "Anon can insert models"
  ON public.models FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update models" ON public.models;
CREATE POLICY "Anon can update models"
  ON public.models FOR UPDATE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can delete models" ON public.models;
CREATE POLICY "Anon can delete models"
  ON public.models FOR DELETE TO anon, authenticated USING (true);

-- Variants
DROP POLICY IF EXISTS "Anyone authenticated can view variants" ON public.variants;
CREATE POLICY "Anon can view variants"
  ON public.variants FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert variants" ON public.variants;
CREATE POLICY "Anon can insert variants"
  ON public.variants FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update variants" ON public.variants;
CREATE POLICY "Anon can update variants"
  ON public.variants FOR UPDATE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can delete variants" ON public.variants;
CREATE POLICY "Anon can delete variants"
  ON public.variants FOR DELETE TO anon, authenticated USING (true);

-- Staff
DROP POLICY IF EXISTS "Admins can view all staff" ON public.staff;
CREATE POLICY "Anon can view staff"
  ON public.staff FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert staff" ON public.staff;
CREATE POLICY "Anon can insert staff"
  ON public.staff FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update staff" ON public.staff;
CREATE POLICY "Anon can update staff"
  ON public.staff FOR UPDATE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can delete staff" ON public.staff;
CREATE POLICY "Anon can delete staff"
  ON public.staff FOR DELETE TO anon, authenticated USING (true);

-- Attendance (allow staff to insert their own, all can view)
DROP POLICY IF EXISTS "Admins can view all attendance" ON public.attendance;
DROP POLICY IF EXISTS "Staff can view attendance" ON public.attendance;
CREATE POLICY "Anon can view attendance"
  ON public.attendance FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can insert attendance" ON public.attendance;
CREATE POLICY "Anon can insert attendance"
  ON public.attendance FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update attendance" ON public.attendance;
CREATE POLICY "Anon can update attendance"
  ON public.attendance FOR UPDATE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "Admins can delete attendance" ON public.attendance;
CREATE POLICY "Anon can delete attendance"
  ON public.attendance FOR DELETE TO anon, authenticated USING (true);
