-- Update all existing devices to have sensor_type = 0 (not configured)
UPDATE device_config SET sensor_type = 0;