-- Drop old storyline_pins SELECT policy
DROP POLICY IF EXISTS "Users can view storyline_pins for their own storylines." ON public.storyline_pins;

-- Create new storyline_pins SELECT policy
CREATE POLICY "Users can view storyline_pins for public or owned storylines."
ON public.storyline_pins FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.storylines
    WHERE storylines.id = storyline_pins.storyline_id AND (storylines.user_id = auth.uid() OR storylines.is_public = true)
  )
);

-- Drop old pins SELECT policy
DROP POLICY IF EXISTS "Users can view their own pins." ON public.pins;

-- Create new pins SELECT policy
CREATE POLICY "Users can view their own pins or pins in public storylines."
ON public.pins FOR SELECT
USING (
  auth.uid() = user_id OR EXISTS (
    SELECT 1
    FROM public.storyline_pins
    INNER JOIN public.storylines ON storyline_pins.storyline_id = storylines.id
    WHERE storyline_pins.pin_id = pins.id AND storylines.is_public = true
  )
);
