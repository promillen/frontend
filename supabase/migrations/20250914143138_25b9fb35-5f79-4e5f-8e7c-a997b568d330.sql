-- Revert database structure to before multi-application changes

-- Drop the trigger first
DROP TRIGGER IF EXISTS update_sensor_profiles_timestamp ON public.sensor_profiles;

-- Drop the function
DROP FUNCTION IF EXISTS public.update_sensor_profiles_timestamp();

-- Remove the sensor_profile_id column from device_config
ALTER TABLE public.device_config DROP COLUMN IF EXISTS sensor_profile_id;

-- Drop the new tables
DROP TABLE IF EXISTS public.sensor_profiles;
DROP TABLE IF EXISTS public.sensor_data_types;

-- Drop the application_type enum
DROP TYPE IF EXISTS public.application_type;