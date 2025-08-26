-- Ensure RLS remains enabled
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;

-- Drop existing modify policies that reference auth.uid() directly
DROP POLICY IF EXISTS "Activity insert limited to admins and moderators" ON public.activity;
DROP POLICY IF EXISTS "Activity update limited to admins and moderators" ON public.activity;
DROP POLICY IF EXISTS "Activity delete limited to admins and moderators" ON public.activity;

-- Recreate modify policies using (select auth.uid()) to avoid per-row re-evaluation

-- INSERT
CREATE POLICY "Activity insert limited to admins and moderators"
ON public.activity
FOR INSERT
TO public
WITH CHECK (
  public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'moderator')
);

-- UPDATE
CREATE POLICY "Activity update limited to admins and moderators"
ON public.activity
FOR UPDATE
TO public
USING (
  public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'moderator')
)
WITH CHECK (
  public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'moderator')
);

-- DELETE
CREATE POLICY "Activity delete limited to admins and moderators"
ON public.activity
FOR DELETE
TO public
USING (
  public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'moderator')
);
