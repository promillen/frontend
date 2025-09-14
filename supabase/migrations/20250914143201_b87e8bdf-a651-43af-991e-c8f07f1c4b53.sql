-- Revert database structure to before multi-application changes
-- Use CASCADE to handle dependencies properly

-- Drop the new tables with CASCADE to handle dependencies
DROP TABLE IF EXISTS public.sensor_profiles CASCADE;
DROP TABLE IF EXISTS public.sensor_data_types CASCADE;

-- Remove the sensor_profile_id column from device_config
ALTER TABLE public.device_config DROP COLUMN IF EXISTS sensor_profile_id;

-- Drop the application_type enum
DROP TYPE IF EXISTS public.application_type;