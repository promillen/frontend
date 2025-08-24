-- Fix RLS policies to use (select auth.uid()) for better performance
-- and keep existing behavior unchanged.

-- USER ROLES
DROP POLICY IF EXISTS "Admins can manage user roles" ON public.user_roles;
CREATE POLICY "Admins can manage user roles"
ON public.user_roles
FOR ALL
USING (has_role((select auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all user roles" ON public.user_roles;
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
USING (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING ((select auth.uid()) = user_id);

-- PROFILES
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles"
ON public.profiles
FOR ALL
USING (has_role((select auth.uid()), 'admin'::app_role))
WITH CHECK (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role((select auth.uid()), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING ((select auth.uid()) = id);

-- ACTIVITY
DROP POLICY IF EXISTS "Admins and moderators can manage activity" ON public.activity;
CREATE POLICY "Admins and moderators can manage activity"
ON public.activity
FOR ALL
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Authenticated users can view activity" ON public.activity;
CREATE POLICY "Authenticated users can view activity"
ON public.activity
FOR SELECT
USING (true);

-- REBOOT
DROP POLICY IF EXISTS "Admins and moderators can manage reboot data" ON public.reboot;
CREATE POLICY "Admins and moderators can manage reboot data"
ON public.reboot
FOR ALL
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Authenticated users can view reboot data" ON public.reboot;
CREATE POLICY "Authenticated users can view reboot data"
ON public.reboot
FOR SELECT
USING (true);

-- SENSOR DATA
DROP POLICY IF EXISTS "Admins and moderators can manage sensor data" ON public.sensor_data;
CREATE POLICY "Admins and moderators can manage sensor data"
ON public.sensor_data
FOR ALL
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Authenticated users can view sensor data" ON public.sensor_data;
CREATE POLICY "Authenticated users can view sensor data"
ON public.sensor_data
FOR SELECT
USING (true);

-- DEVICE ACCESS
DROP POLICY IF EXISTS "Admins and moderators can manage device access" ON public.device_access;
CREATE POLICY "Admins and moderators can manage device access"
ON public.device_access
FOR ALL
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Users can view their own device access" ON public.device_access;
CREATE POLICY "Users can view their own device access"
ON public.device_access
FOR SELECT
USING ((select auth.uid()) = user_id);

-- DEVICE CONFIG
DROP POLICY IF EXISTS "Admins and moderators can manage device config" ON public.device_config;
CREATE POLICY "Admins and moderators can manage device config"
ON public.device_config
FOR ALL
USING (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
)
WITH CHECK (
  has_role((select auth.uid()), 'admin'::app_role)
  OR has_role((select auth.uid()), 'moderator'::app_role)
);

DROP POLICY IF EXISTS "Users can view device config for their devices" ON public.device_config;
CREATE POLICY "Users can view device config for their devices"
ON public.device_config
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.device_access da
    WHERE da.user_id = (select auth.uid())
      AND da.devid = public.device_config.devid
  )
);
