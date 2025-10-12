-- Adds the anchor_pin_id column to link generation jobs back to a specific pin.
ALTER TABLE public.generation_jobs
ADD COLUMN anchor_pin_id UUID REFERENCES public.pins(id) ON DELETE CASCADE;
