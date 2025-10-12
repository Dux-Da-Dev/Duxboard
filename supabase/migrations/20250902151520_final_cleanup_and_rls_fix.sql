-- This migration corrects the RLS policy for the documents storage bucket
-- to allow users to access files they own via the public.files table.

-- 1. Drop the old, faulty policy that checks for direct ownership.
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;

-- 2. Drop any other potentially conflicting SELECT policies on the documents bucket.
DROP POLICY IF EXISTS "Users can view documents for accessible pins" ON storage.objects;

-- 3. Create the single, correct policy for viewing/downloading documents.
-- This policy allows a user to access a file if they are the owner of the
-- corresponding record in the public.files table.
CREATE POLICY "Users can view their own documents via the files table"
ON storage.objects FOR SELECT USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1
    FROM public.files
    WHERE files.storage_path = storage.objects.name
      AND files.user_id = auth.uid()
  )
);

--
-- RLS policies for public.files table
--

-- Ensure RLS is enabled on the files table
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- 1. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own files, and admins can view all" ON public.files;
DROP POLICY IF EXISTS "Authenticated users can insert their own files" ON public.files;
DROP POLICY IF EXISTS "Users can delete their own files, and admins can delete any" ON public.files;

-- 2. Create SELECT policy
-- Allows users to see their own files, and admins to see all files.
CREATE POLICY "Users can view their own files, and admins can view all"
ON public.files FOR SELECT
USING (
  (user_id = auth.uid()) OR
  ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
);

-- 3. Create INSERT policy
-- Allows any authenticated user to insert a file for themselves.
CREATE POLICY "Authenticated users can insert their own files"
ON public.files FOR INSERT
WITH CHECK (
  user_id = auth.uid()
);

-- 4. Create DELETE policy
-- Allows users to delete their own files, and admins to delete any file.
CREATE POLICY "Users can delete their own files, and admins can delete any"
ON public.files FOR DELETE
USING (
  (user_id = auth.uid()) OR
  ((SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin')
);
