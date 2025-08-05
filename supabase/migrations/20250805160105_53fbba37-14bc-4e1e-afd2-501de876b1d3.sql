-- Add dummy location data for existing devices around Copenhagen
INSERT INTO public.sensor_data (devid, data_type, data, uplink_count)
SELECT 
    devid,
    'location' as data_type,
    jsonb_build_object(
        'lat', 
        CASE 
            WHEN devid LIKE '%001' THEN 55.6761 + (random() - 0.5) * 0.1
            WHEN devid LIKE '%002' THEN 55.6761 + (random() - 0.5) * 0.1  
            WHEN devid LIKE '%003' THEN 55.6761 + (random() - 0.5) * 0.1
            ELSE 55.6761 + (random() - 0.5) * 0.1
        END,
        'lng',
        CASE 
            WHEN devid LIKE '%001' THEN 12.5683 + (random() - 0.5) * 0.1
            WHEN devid LIKE '%002' THEN 12.5683 + (random() - 0.5) * 0.1
            WHEN devid LIKE '%003' THEN 12.5683 + (random() - 0.5) * 0.1  
            ELSE 12.5683 + (random() - 0.5) * 0.1
        END,
        'accuracy', 10 + random() * 20,
        'timestamp', extract(epoch from now())
    ) as data,
    COALESCE(last_uplink_count, 1) as uplink_count
FROM public.device_config
WHERE NOT EXISTS (
    SELECT 1 FROM public.sensor_data 
    WHERE sensor_data.devid = device_config.devid 
    AND sensor_data.data_type = 'location'
);