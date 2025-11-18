-- Rename application_mode to location_mode in device_config table
ALTER TABLE device_config 
RENAME COLUMN application_mode TO location_mode;

COMMENT ON COLUMN device_config.location_mode IS 'Location mode: 0=NONE, 1=CELL_TOWER, 2=GNSS, 3=WIFI';