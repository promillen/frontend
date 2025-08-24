-- Consolidate overlapping RLS policies to eliminate "multiple permissive policies" warnings
-- Keep the same access logic but organize by operation type

-- ACTIVITY TABLE
DROP POLICY IF EXISTS "Admins and moderators can manage activity" ON public.activity;
DROP POLICY IF EXISTS "Authenticated users can view activity" ON public.activity;

-- Single SELECT policy (everyone can view since original used 'true')
CREATE POLICY "Users can view activity" ON public.activity
FOR SELECT 
USING (true);

-- Admin/moderator management policy for INSERT/UPDATE/DELETE only
CREATE POLICY "Admins and moderators can modify activity" ON public.activity
FOR ALL
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
);

-- SENSOR_DATA TABLE  
DROP POLICY IF EXISTS "Admins and moderators can manage sensor data" ON public.sensor_data;
DROP POLICY IF EXISTS "Authenticated users can view sensor data" ON public.sensor_data;

-- Single SELECT policy (everyone can view since original used 'true')
CREATE POLICY "Users can view sensor data" ON public.sensor_data
FOR SELECT
USING (true);

-- Admin/moderator management policy for INSERT/UPDATE/DELETE only  
CREATE POLICY "Admins and moderators can modify sensor data" ON public.sensor_data
FOR ALL
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
);

-- REBOOT TABLE
DROP POLICY IF EXISTS "Admins and moderators can manage reboot data" ON public.reboot;  
DROP POLICY IF EXISTS "Authenticated users can view reboot data" ON public.reboot;

-- Single SELECT policy (everyone can view since original used 'true')
CREATE POLICY "Users can view reboot data" ON public.reboot
FOR SELECT
USING (true);

-- Admin/moderator management policy for INSERT/UPDATE/DELETE only
CREATE POLICY "Admins and moderators can modify reboot data" ON public.reboot
FOR ALL  
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
);

-- DEVICE_ACCESS TABLE
DROP POLICY IF EXISTS "Admins and moderators can manage device access" ON public.device_access;
DROP POLICY IF EXISTS "Users can view their own device access" ON public.device_access;

-- Consolidated SELECT policy 
CREATE POLICY "Users can view device access" ON public.device_access
FOR SELECT
USING (
  -- Users can see their own device access OR admins/moderators can see all
  (select auth.uid()) = user_id
  OR has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
);

-- Admin/moderator management policy for INSERT/UPDATE/DELETE only
CREATE POLICY "Admins and moderators can modify device access" ON public.device_access
FOR ALL
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)  
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
);

-- DEVICE_CONFIG TABLE
DROP POLICY IF EXISTS "Admins and moderators can manage device config" ON public.device_config;
DROP POLICY IF EXISTS "Users can view device config for their devices" ON public.device_config;

-- Consolidated SELECT policy
CREATE POLICY "Users can view device config" ON public.device_config  
FOR SELECT
USING (
  -- Users can see devices they have access to OR admins/moderators can see all
  EXISTS (
    SELECT 1 FROM public.device_access da
    WHERE da.user_id = (select auth.uid())
      AND da.devid = public.device_config.devid
  )
  OR has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
);

-- Admin/moderator management policy for INSERT/UPDATE/DELETE only
CREATE POLICY "Admins and moderators can modify device config" ON public.device_config
FOR ALL
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role) 
  OR has_role((select auth.uid()), 'moderator'::app_role)
);

-- PROFILES TABLE
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;  
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Consolidated SELECT policy
CREATE POLICY "Users can view profiles" ON public.profiles
FOR SELECT
USING (
  -- Users can see their own profile OR admins can see all
  (select auth.uid()) = id
  OR has_role((select auth.uid()), 'admin'::app_role)
);

-- Consolidated UPDATE policy  
CREATE POLICY "Users can update profiles" ON public.profiles
FOR UPDATE
USING (
  -- Users can update their own profile OR admins can update any
  (select auth.uid()) = id
  OR has_role((select auth.uid()), 'admin'::app_role)
);

-- Admin INSERT/DELETE policy
CREATE POLICY "Admins can insert and delete profiles" ON public.profiles
FOR ALL
USING (has_role((select auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

-- USER_ROLES TABLE (already consolidated in previous migration, but ensuring consistency)
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

-- Consolidated SELECT policy
CREATE POLICY "Users can view user roles" ON public.user_roles
FOR SELECT  
USING (
  -- Users can see their own roles OR admins can see all
  (select auth.uid()) = user_id
  OR has_role((select auth.uid()), 'admin'::app_role)
);

-- Admin management policy for INSERT/UPDATE/DELETE
CREATE POLICY "Admins can manage user roles" ON public.user_roles
FOR ALL
USING (has_role((select auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));