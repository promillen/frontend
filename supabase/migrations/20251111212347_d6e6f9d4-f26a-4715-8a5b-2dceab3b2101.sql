-- Drop the trigger temporarily to allow column type change
DROP TRIGGER IF EXISTS update_device_data_timestamp ON device_config;

-- Convert existing text values to numbers
UPDATE device_config 
SET application_mode = CASE 
  WHEN LOWER(application_mode) = 'none' OR application_mode = '0' THEN '0'
  WHEN LOWER(application_mode) LIKE '%cell%' OR LOWER(application_mode) LIKE '%tower%' OR application_mode = '1' THEN '1'
  WHEN LOWER(application_mode) LIKE '%gps%' OR LOWER(application_mode) LIKE '%gnss%' OR application_mode = '2' THEN '2'
  WHEN LOWER(application_mode) LIKE '%wifi%' OR LOWER(application_mode) LIKE '%wi-fi%' OR application_mode = '3' THEN '3'
  ELSE '0'
END
WHERE application_mode IS NOT NULL;

-- Change the column type to integer
ALTER TABLE device_config 
ALTER COLUMN application_mode TYPE integer 
USING CASE 
  WHEN application_mode ~ '^\d+$' THEN application_mode::integer
  ELSE 0
END;

-- Add constraint to ensure only valid values (0-3)
ALTER TABLE device_config
ADD CONSTRAINT application_mode_check CHECK (application_mode >= 0 AND application_mode <= 3);

-- Recreate the trigger
CREATE TRIGGER update_device_data_timestamp
BEFORE UPDATE ON device_config
FOR EACH ROW
EXECUTE FUNCTION update_device_data_timestamp();