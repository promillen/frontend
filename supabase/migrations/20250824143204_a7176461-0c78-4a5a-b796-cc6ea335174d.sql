-- Ensure RLS is enabled
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;

-- Drop overlapping policies if they exist
DROP POLICY IF EXISTS "Admins and moderators can modify activity" ON public.activity;
DROP POLICY IF EXISTS "Unified activity view and modify policy" ON public.activity;

-- Create a single policy per operation

-- 1) SELECT: Everyone can view activity
CREATE POLICY "Activity is viewable by everyone"
ON public.activity
FOR SELECT
TO public
USING (true);

-- 2) INSERT: Only admins and moderators can insert
CREATE POLICY "Activity insert limited to admins and moderators"
ON public.activity
FOR INSERT
TO public
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
);

-- 3) UPDATE: Only admins and moderators can update
CREATE POLICY "Activity update limited to admins and moderators"
ON public.activity
FOR UPDATE
TO public
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
);

-- 4) DELETE: Only admins and moderators can delete
CREATE POLICY "Activity delete limited to admins and moderators"
ON public.activity
FOR DELETE
TO public
USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
);
