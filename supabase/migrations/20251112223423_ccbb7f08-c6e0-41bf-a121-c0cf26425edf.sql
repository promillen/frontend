-- Create locations table for device GPS data
CREATE TABLE public.locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  devid text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  accuracy double precision,
  location_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add index for faster queries by device and time
CREATE INDEX idx_locations_devid_created_at ON public.locations(devid, created_at DESC);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view locations for devices they have access to
CREATE POLICY "Users can view locations for accessible devices"
ON public.locations
FOR SELECT
USING (
  (EXISTS (
    SELECT 1
    FROM device_access da
    WHERE da.user_id = auth.uid() AND da.devid = locations.devid
  ))
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'developer'::app_role)
);

-- RLS Policy: Only developers, admins, and moderators can insert locations
-- (This allows edge functions with proper auth to insert data)
CREATE POLICY "Developers, admins, and moderators can insert locations"
ON public.locations
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'developer'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);