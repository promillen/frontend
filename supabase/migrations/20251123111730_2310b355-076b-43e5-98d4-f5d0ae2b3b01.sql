-- Add application_mode column to device_config table
ALTER TABLE device_config 
ADD COLUMN IF NOT EXISTS application_mode integer;

-- Add comment for documentation
COMMENT ON COLUMN device_config.application_mode IS 'Application mode: 0=None, 1=Cell Tower, 2=GPS, 3=WiFi';