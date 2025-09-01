-- Update user_roles RLS policies - only developers and admins can manage user roles
DROP POLICY IF EXISTS "Controlled user roles access" ON public.user_roles;

CREATE POLICY "Users can view their own roles, developers and admins can view all" 
ON public.user_roles 
FOR SELECT 
USING (
  (auth.uid() = user_id) OR 
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Only developers and admins can manage user roles" 
ON public.user_roles 
FOR ALL 
USING (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin')
)
WITH CHECK (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin')
);

-- Update profiles RLS policies
DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert and delete profiles" ON public.profiles;

CREATE POLICY "Users can view own profile, developers and admins can view all" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() = id) OR 
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Users can update own profile, developers and admins can update all" 
ON public.profiles 
FOR UPDATE 
USING (
  (auth.uid() = id) OR 
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin')
);

CREATE POLICY "Developers and admins can insert and delete profiles" 
ON public.profiles 
FOR ALL 
USING (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin')
)
WITH CHECK (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin')
);

-- Update device_access RLS policies - developers, admins, and moderators can manage
DROP POLICY IF EXISTS "Device access insert limited to admins and moderators" ON public.device_access;
DROP POLICY IF EXISTS "Device access update limited to admins and moderators" ON public.device_access;
DROP POLICY IF EXISTS "Device access delete limited to admins and moderators" ON public.device_access;

CREATE POLICY "Developers, admins, and moderators can manage device access" 
ON public.device_access 
FOR ALL 
USING (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator')
);

-- Update device_config RLS policies
DROP POLICY IF EXISTS "Admins and moderators can modify device config" ON public.device_config;

CREATE POLICY "Developers, admins, and moderators can modify device config" 
ON public.device_config 
FOR ALL 
USING (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator')
);

-- Update sensor_data RLS policies
DROP POLICY IF EXISTS "Admins and moderators can modify sensor data" ON public.sensor_data;

CREATE POLICY "Developers, admins, and moderators can modify sensor data" 
ON public.sensor_data 
FOR ALL 
USING (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator')
);

-- Update activity RLS policies
DROP POLICY IF EXISTS "Activity insert limited to admins and moderators" ON public.activity;
DROP POLICY IF EXISTS "Activity update limited to admins and moderators" ON public.activity;
DROP POLICY IF EXISTS "Activity delete limited to admins and moderators" ON public.activity;

CREATE POLICY "Developers, admins, and moderators can modify activity data" 
ON public.activity 
FOR ALL 
USING (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator')
);

-- Update reboot RLS policies
DROP POLICY IF EXISTS "Admins and moderators can modify reboot data" ON public.reboot;

CREATE POLICY "Developers, admins, and moderators can modify reboot data" 
ON public.reboot 
FOR ALL 
USING (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator')
)
WITH CHECK (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator')
);