-- Add proper location coordinates for existing devices
-- First, let's see what devices we have
INSERT INTO public.sensor_data (devid, data_type, data, uplink_count)
SELECT 
    devid,
    'location' as data_type,
    jsonb_build_object(
        'lat', 55.6761 + (random() - 0.5) * 0.02,
        'lng', 12.5683 + (random() - 0.5) * 0.02,
        'accuracy', 10 + random() * 20,
        'timestamp', extract(epoch from now())
    ) as data,
    COALESCE(last_uplink_count, 1) as uplink_count
FROM public.device_config
ON CONFLICT DO NOTHING;