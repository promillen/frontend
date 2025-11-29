-- Create device_activations table
CREATE TABLE IF NOT EXISTS public.device_activations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id text NOT NULL UNIQUE,
  activation_code text NOT NULL UNIQUE,
  claimed boolean DEFAULT false,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on device_activations
ALTER TABLE public.device_activations ENABLE ROW LEVEL SECURITY;

-- RLS policies for device_activations
-- Developers can see all activations
CREATE POLICY "Developers can manage device activations"
ON public.device_activations
FOR ALL
USING (has_role(auth.uid(), 'developer'));

-- Admins and moderators can see all activations
CREATE POLICY "Admins and moderators can view and unclaim devices"
ON public.device_activations
FOR ALL
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator')
);

-- Users can view their own claimed devices
CREATE POLICY "Users can view their claimed devices"
ON public.device_activations
FOR SELECT
USING (
  claimed = true AND 
  owner_id = auth.uid()
);

-- Update RLS policies for device_config to respect claimed status
DROP POLICY IF EXISTS "Users can view device config" ON public.device_config;
DROP POLICY IF EXISTS "device_config_select_auth_only" ON public.device_config;

CREATE POLICY "Users can view claimed devices, admins/mods/devs can view all"
ON public.device_config
FOR SELECT
USING (
  -- Developers, admins, and moderators can see all devices
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator') OR
  -- Users can only see devices they own (claimed)
  EXISTS (
    SELECT 1 FROM public.device_activations da
    WHERE da.device_id = device_config.devid
    AND da.owner_id = auth.uid()
    AND da.claimed = true
  )
);

-- Update RLS policies for locations
DROP POLICY IF EXISTS "Users can view locations for accessible devices" ON public.locations;

CREATE POLICY "Users can view locations for claimed devices"
ON public.locations
FOR SELECT
USING (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator') OR
  EXISTS (
    SELECT 1 FROM public.device_activations da
    WHERE da.device_id = locations.devid
    AND da.owner_id = auth.uid()
    AND da.claimed = true
  )
);

-- Update RLS policies for sensor_data
DROP POLICY IF EXISTS "Users can view sensor data" ON public.sensor_data;

CREATE POLICY "Users can view sensor data for claimed devices"
ON public.sensor_data
FOR SELECT
USING (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator') OR
  EXISTS (
    SELECT 1 FROM public.device_activations da
    WHERE da.device_id = sensor_data.devid
    AND da.owner_id = auth.uid()
    AND da.claimed = true
  )
);

-- Update RLS policies for activity
DROP POLICY IF EXISTS "Activity is viewable by everyone" ON public.activity;

CREATE POLICY "Users can view activity for claimed devices"
ON public.activity
FOR SELECT
USING (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator') OR
  EXISTS (
    SELECT 1 FROM public.device_activations da
    WHERE da.device_id = activity.devid
    AND da.owner_id = auth.uid()
    AND da.claimed = true
  )
);

-- Update RLS policies for reboot
DROP POLICY IF EXISTS "Users can view reboot data" ON public.reboot;

CREATE POLICY "Users can view reboot data for claimed devices"
ON public.reboot
FOR SELECT
USING (
  has_role(auth.uid(), 'developer') OR 
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'moderator') OR
  EXISTS (
    SELECT 1 FROM public.device_activations da
    WHERE da.device_id = reboot.devid
    AND da.owner_id = auth.uid()
    AND da.claimed = true
  )
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_device_activations_device_id ON public.device_activations(device_id);
CREATE INDEX IF NOT EXISTS idx_device_activations_activation_code ON public.device_activations(activation_code);
CREATE INDEX IF NOT EXISTS idx_device_activations_owner_id ON public.device_activations(owner_id);