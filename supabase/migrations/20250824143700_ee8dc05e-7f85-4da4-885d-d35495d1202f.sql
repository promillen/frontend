-- Ensure RLS is enabled on device_access
ALTER TABLE public.device_access ENABLE ROW LEVEL SECURITY;

-- Drop overlapping or outdated policies
DROP POLICY IF EXISTS "Admins and moderators can modify device access" ON public.device_access;
DROP POLICY IF EXISTS "Users can view device access" ON public.device_access;

-- Recreate single, precise policies per operation using (select auth.uid()) for perf

-- SELECT: Users can view their own device access; admins/moderators can view all
CREATE POLICY "Device access view policy"
ON public.device_access
FOR SELECT
TO public
USING (
  ((select auth.uid()) = user_id)
  OR public.has_role((select auth.uid()), 'admin')
  OR public.has_role((select auth.uid()), 'moderator')
);

-- INSERT: Only admins and moderators
CREATE POLICY "Device access insert limited to admins and moderators"
ON public.device_access
FOR INSERT
TO public
WITH CHECK (
  public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'moderator')
);

-- UPDATE: Only admins and moderators
CREATE POLICY "Device access update limited to admins and moderators"
ON public.device_access
FOR UPDATE
TO public
USING (
  public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'moderator')
)
WITH CHECK (
  public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'moderator')
);

-- DELETE: Only admins and moderators
CREATE POLICY "Device access delete limited to admins and moderators"
ON public.device_access
FOR DELETE
TO public
USING (
  public.has_role((select auth.uid()), 'admin') OR public.has_role((select auth.uid()), 'moderator')
);
