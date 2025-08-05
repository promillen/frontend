-- Add some dummy battery levels to existing devices
UPDATE public.device_config 
SET battery_level = FLOOR(20 + random() * 80)  -- Random battery level between 20-100%
WHERE battery_level IS NULL;