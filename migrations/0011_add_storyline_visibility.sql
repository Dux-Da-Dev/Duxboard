-- Add a boolean column to the storylines table to control visibility.
ALTER TABLE public.storylines
ADD COLUMN is_public BOOLEAN DEFAULT false NOT NULL;

-- Drop the old, restrictive SELECT policy.
DROP POLICY IF EXISTS "Users can view their own storylines." ON public.storylines;

-- Create a new policy that allows users to see their own private storylines
-- OR any storyline that is marked as public.
CREATE POLICY "Users can view their own storylines and public storylines."
ON public.storylines FOR SELECT
USING (
  auth.uid() = user_id OR is_public = true
);
