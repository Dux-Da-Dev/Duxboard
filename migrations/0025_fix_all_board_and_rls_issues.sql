-- This migration provides a definitive fix for all board creation and RLS issues.

-- Step 1: Create the get_or_create_user_board function.
-- This function ensures that every user has a board, creating one if it doesn't exist.
CREATE OR REPLACE FUNCTION public.get_or_create_user_board(p_user_id uuid)
RETURNS UUID AS $$
DECLARE
  board_id UUID;
BEGIN
  -- Try to find an existing board for the user
  SELECT id INTO board_id
  FROM public.boards
  WHERE owner_id = p_user_id
  LIMIT 1;

  -- If no board is found, create one
  IF board_id IS NULL THEN
    INSERT INTO public.boards (owner_id, name)
    VALUES (p_user_id, 'My Board')
    RETURNING id INTO board_id;
  END IF;

  RETURN board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Programmatically drop all existing policies on the target tables.
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Drop policies for 'pins'
    FOR policy_record IN
        SELECT policyname FROM pg_policies WHERE tablename = 'pins'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.pins;';
    END LOOP;

    -- Drop policies for 'boards'
    FOR policy_record IN
        SELECT policyname FROM pg_policies WHERE tablename = 'boards'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.boards;';
    END LOOP;

    -- Drop policies for 'board_members'
    FOR policy_record IN
        SELECT policyname FROM pg_policies WHERE tablename = 'board_members'
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || policy_record.policyname || '" ON public.board_members;';
    END LOOP;
END;
$$;

-- Step 3: Create simple, non-recursive, owner-based policies.
-- This will restore core functionality and eliminate any recursion errors.

-- Policies for boards
CREATE POLICY "Users can manage their own boards" ON public.boards
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- Policies for board_members
CREATE POLICY "Users can manage their own board membership" ON public.board_members
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies for pins
CREATE POLICY "Users can manage their own pins" ON public.pins
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);