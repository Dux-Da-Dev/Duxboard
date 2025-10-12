-- Adds a 'scale' column to the pins table to store resize information.
ALTER TABLE public.pins
ADD COLUMN scale NUMERIC DEFAULT 1.0 NOT NULL;
