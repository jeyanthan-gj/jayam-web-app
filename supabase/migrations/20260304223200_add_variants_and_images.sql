-- Add missing columns to existing tables
ALTER TABLE public.brands ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.models ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Create variants table for detailed model options
CREATE TABLE IF NOT EXISTS public.variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES public.models(id) ON DELETE CASCADE,
  ram_rom TEXT NOT NULL,
  color TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  stock_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for variants
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;

-- Variants policies
CREATE POLICY "Anyone authenticated can view variants"
  ON public.variants FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert variants"
  ON public.variants FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update variants"
  ON public.variants FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete variants"
  ON public.variants FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Update trigger for variants
CREATE TRIGGER update_variants_updated_at 
  BEFORE UPDATE ON public.variants 
  FOR EACH ROW 
  EXECUTE FUNCTION public.update_updated_at_column();
