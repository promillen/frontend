-- Add last_uplink_count column to device_config table
ALTER TABLE public.device_config 
ADD COLUMN last_uplink_count integer;

-- Update the trigger function to also update last_uplink_count when device data is inserted
CREATE OR REPLACE FUNCTION public.update_device_last_seen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
    UPDATE public.device_config 
    SET 
        last_seen = now(),
        last_uplink_count = COALESCE(NEW.uplink_count, last_uplink_count)
    WHERE devid = NEW.devid;
    RETURN NEW;
END;
$function$;