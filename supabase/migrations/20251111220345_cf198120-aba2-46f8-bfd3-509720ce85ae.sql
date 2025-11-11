-- Add sensor_type column to device_config table
ALTER TABLE public.device_config 
ADD COLUMN sensor_type integer DEFAULT 0;

COMMENT ON COLUMN public.device_config.sensor_type IS '0 = tracker, 1 = soil sensor';