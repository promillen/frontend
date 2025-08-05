-- Fix function search path security warnings by recreating with cascade
DROP FUNCTION IF EXISTS update_device_last_seen() CASCADE;
DROP FUNCTION IF EXISTS update_device_data_timestamp() CASCADE;

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

-- Recreate the triggers
CREATE TRIGGER update_last_seen_activity
    AFTER INSERT ON public.activity
    FOR EACH ROW EXECUTE FUNCTION update_device_last_seen();

CREATE TRIGGER update_last_seen_reboot
    AFTER INSERT ON public.reboot
    FOR EACH ROW EXECUTE FUNCTION update_device_last_seen();

CREATE TRIGGER update_last_seen_sensor
    AFTER INSERT ON public.sensor_data
    FOR EACH ROW EXECUTE FUNCTION update_device_last_seen();

CREATE TRIGGER update_device_data_timestamp
    BEFORE UPDATE OF name, iccid, heartbeat_interval, sw_version, hw_version, application_mode ON public.device_config
    FOR EACH ROW EXECUTE FUNCTION update_device_data_timestamp();