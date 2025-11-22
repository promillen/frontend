-- Update location_mode column comment to match device protobuf definition
COMMENT ON COLUMN device_config.location_mode IS '0=NONE, 1=GNSS, 2=WIFI';