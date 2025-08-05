-- Fix function search path security warnings
DROP FUNCTION IF EXISTS update_device_last_seen();
DROP FUNCTION IF EXISTS update_device_data_timestamp();

-- Recreate functions with secure search path
CREATE OR REPLACE FUNCTION update_device_last_seen()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.device_config 
    SET last_seen = now()
    WHERE devid = NEW.devid;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION update_device_data_timestamp()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.device_data_updated_at = now();
    RETURN NEW;
END;
$$;