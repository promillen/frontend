-- Drop existing tables to start fresh
DROP TABLE IF EXISTS public.location_data;
DROP TABLE IF EXISTS public.devices;

-- Create device_config table (one entry per device)
CREATE TABLE public.device_config (
    devid TEXT PRIMARY KEY,
    name TEXT,
    iccid TEXT,
    heartbeat_interval INTEGER,
    sw_version TEXT,
    hw_version TEXT,
    application_mode TEXT,
    device_data_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create activity table (one entry per uplink)
CREATE TABLE public.activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devid TEXT NOT NULL REFERENCES public.device_config(devid) ON DELETE CASCADE,
    uplink_count INTEGER,
    sleep INTEGER,
    modem INTEGER,
    gnss INTEGER,
    wifi INTEGER,
    other INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create reboot table (one entry per reboot event)
CREATE TABLE public.reboot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devid TEXT NOT NULL REFERENCES public.device_config(devid) ON DELETE CASCADE,
    uplink_count INTEGER,
    reason TEXT NOT NULL,
    line INTEGER,
    file TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sensor_data table (flexible structure for different sensor types)
CREATE TABLE public.sensor_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devid TEXT NOT NULL REFERENCES public.device_config(devid) ON DELETE CASCADE,
    uplink_count INTEGER,
    data_type TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.device_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reboot ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_data ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for device_config
CREATE POLICY "Authenticated users can view device config" 
ON public.device_config 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and moderators can manage device config" 
ON public.device_config 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Create RLS policies for activity
CREATE POLICY "Authenticated users can view activity" 
ON public.activity 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and moderators can manage activity" 
ON public.activity 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Create RLS policies for reboot
CREATE POLICY "Authenticated users can view reboot data" 
ON public.reboot 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and moderators can manage reboot data" 
ON public.reboot 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Create RLS policies for sensor_data
CREATE POLICY "Authenticated users can view sensor data" 
ON public.sensor_data 
FOR SELECT 
USING (true);

CREATE POLICY "Admins and moderators can manage sensor data" 
ON public.sensor_data 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Create function to update last_seen based on latest activity from any table
CREATE OR REPLACE FUNCTION update_device_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.device_config 
    SET last_seen = now()
    WHERE devid = NEW.devid;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to update last_seen
CREATE TRIGGER update_last_seen_activity
    AFTER INSERT ON public.activity
    FOR EACH ROW EXECUTE FUNCTION update_device_last_seen();

CREATE TRIGGER update_last_seen_reboot
    AFTER INSERT ON public.reboot
    FOR EACH ROW EXECUTE FUNCTION update_device_last_seen();

CREATE TRIGGER update_last_seen_sensor
    AFTER INSERT ON public.sensor_data
    FOR EACH ROW EXECUTE FUNCTION update_device_last_seen();

-- Create function to update device_data_updated_at
CREATE OR REPLACE FUNCTION update_device_data_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.device_data_updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for device_data_updated_at (excluding last_seen updates)
CREATE TRIGGER update_device_data_timestamp
    BEFORE UPDATE OF name, iccid, heartbeat_interval, sw_version, hw_version, application_mode ON public.device_config
    FOR EACH ROW EXECUTE FUNCTION update_device_data_timestamp();

-- Create indexes for better performance
CREATE INDEX idx_activity_devid ON public.activity(devid);
CREATE INDEX idx_activity_created_at ON public.activity(created_at);
CREATE INDEX idx_reboot_devid ON public.reboot(devid);
CREATE INDEX idx_sensor_data_devid ON public.sensor_data(devid);
CREATE INDEX idx_sensor_data_type ON public.sensor_data(data_type);
CREATE INDEX idx_sensor_data_created_at ON public.sensor_data(created_at);