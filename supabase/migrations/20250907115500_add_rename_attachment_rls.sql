-- Add RLS policy to allow users to update their own files.
CREATE POLICY "Users can update their own files"
ON public.files
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add RLS policy to allow admins to update any file.
CREATE POLICY "Admins can update any file"
ON public.files
FOR UPDATE
USING (public.is_admin());
