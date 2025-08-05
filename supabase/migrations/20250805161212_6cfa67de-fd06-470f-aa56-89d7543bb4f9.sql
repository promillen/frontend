-- Add battery_level to device_config table
ALTER TABLE public.device_config ADD COLUMN battery_level INTEGER;

-- Add comment to explain the battery level field
COMMENT ON COLUMN public.device_config.battery_level IS 'Battery level as percentage (0-100)';