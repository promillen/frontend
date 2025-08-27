-- Insert dummy historical location data for testing device movement tracking

-- First, insert some device configurations if they don't exist
INSERT INTO device_config (devid, name, hw_version, sw_version, battery_level)
VALUES 
  ('device_001', 'Copenhagen Tracker', 'v2.1', 'v1.4.2', 85),
  ('device_002', 'Mobile Unit Alpha', 'v2.0', 'v1.3.8', 92),
  ('device_003', 'Fleet Tracker Beta', 'v2.1', 'v1.4.1', 78),
  ('device_004', 'Harbor Monitor', 'v1.9', 'v1.2.5', 68),
  ('device_005', 'City Patrol Unit', 'v2.2', 'v1.5.0', 95),
  ('device_006', 'Delivery Tracker', 'v2.0', 'v1.4.0', 82)
ON CONFLICT (devid) DO UPDATE SET
  name = EXCLUDED.name,
  hw_version = EXCLUDED.hw_version,
  sw_version = EXCLUDED.sw_version,
  battery_level = EXCLUDED.battery_level;

-- Insert historical location data for device movement simulation
-- Device 001: Movement around Copenhagen city center
INSERT INTO sensor_data (devid, data_type, data, uplink_count, created_at)
VALUES 
  -- 7 days ago
  ('device_001', 'location', '{"lat": 55.6761, "lng": 12.5683, "accuracy": 5, "altitude": 10}', 1001, NOW() - INTERVAL '7 days'),
  ('device_001', 'location', '{"lat": 55.6790, "lng": 12.5725, "accuracy": 4, "altitude": 12}', 1002, NOW() - INTERVAL '7 days' + INTERVAL '2 hours'),
  ('device_001', 'location', '{"lat": 55.6820, "lng": 12.5780, "accuracy": 6, "altitude": 8}', 1003, NOW() - INTERVAL '6 days'),
  ('device_001', 'location', '{"lat": 55.6845, "lng": 12.5820, "accuracy": 3, "altitude": 15}', 1004, NOW() - INTERVAL '5 days'),
  ('device_001', 'location', '{"lat": 55.6810, "lng": 12.5750, "accuracy": 5, "altitude": 11}', 1005, NOW() - INTERVAL '3 days'),
  ('device_001', 'location', '{"lat": 55.6785, "lng": 12.5700, "accuracy": 4, "altitude": 9}', 1006, NOW() - INTERVAL '1 day'),
  ('device_001', 'location', '{"lat": 55.6761, "lng": 12.5683, "accuracy": 3, "altitude": 10}', 1007, NOW() - INTERVAL '2 hours'),
  
  -- Device 002: Movement from Copenhagen to suburbs
  ('device_002', 'location', '{"lat": 55.6761, "lng": 12.5683, "accuracy": 4, "altitude": 12}', 2001, NOW() - INTERVAL '7 days'),
  ('device_002', 'location', '{"lat": 55.6900, "lng": 12.6200, "accuracy": 6, "altitude": 18}', 2002, NOW() - INTERVAL '6 days'),
  ('device_002', 'location', '{"lat": 55.7100, "lng": 12.6800, "accuracy": 5, "altitude": 25}', 2003, NOW() - INTERVAL '5 days'),
  ('device_002', 'location', '{"lat": 55.7300, "lng": 12.7200, "accuracy": 7, "altitude": 30}', 2004, NOW() - INTERVAL '3 days'),
  ('device_002', 'location', '{"lat': 55.7450, "lng": 12.7500, "accuracy": 4, "altitude": 35}', 2005, NOW() - INTERVAL '1 day'),
  ('device_002', 'location', '{"lat": 55.7500, "lng": 12.7600, "accuracy": 5, "altitude": 40}', 2006, NOW() - INTERVAL '3 hours'),

  -- Device 003: Harbor patrol route
  ('device_003', 'location', '{"lat": 55.6650, "lng": 12.5900, "accuracy": 3, "altitude": 2}', 3001, NOW() - INTERVAL '7 days'),
  ('device_003', 'location', '{"lat": 55.6680, "lng": 12.5950, "accuracy": 4, "altitude": 3}', 3002, NOW() - INTERVAL '6 days' + INTERVAL '3 hours'),
  ('device_003', 'location', '{"lat": 55.6710, "lng": 12.6000, "accuracy": 5, "altitude": 1}', 3003, NOW() - INTERVAL '5 days'),
  ('device_003', 'location', '{"lat": 55.6740, "lng": 12.6050, "accuracy": 3, "altitude": 4}', 3004, NOW() - INTERVAL '3 days'),
  ('device_003', 'location', '{"lat": 55.6720, "lng": 12.6020, "accuracy": 4, "altitude": 2}', 3005, NOW() - INTERVAL '1 day'),
  ('device_003', 'location', '{"lat": 55.6695, "lng": 12.5980, "accuracy": 3, "altitude": 3}', 3006, NOW() - INTERVAL '4 hours'),

  -- Device 004: Airport to city route
  ('device_004', 'location', '{"lat": 55.6180, "lng": 12.6560, "accuracy": 8, "altitude": 5}', 4001, NOW() - INTERVAL '30 days'),
  ('device_004', 'location', '{"lat": 55.6300, "lng": 12.6200, "accuracy": 6, "altitude": 8}', 4002, NOW() - INTERVAL '25 days'),
  ('device_004', 'location', '{"lat": 55.6500, "lng": 12.5900, "accuracy": 5, "altitude": 12}', 4003, NOW() - INTERVAL '20 days'),
  ('device_004', 'location', '{"lat": 55.6650, "lng": 12.5700, "accuracy": 4, "altitude": 15}', 4004, NOW() - INTERVAL '15 days'),
  ('device_004', 'location', '{"lat": 55.6761, "lng": 12.5683, "accuracy": 3, "altitude": 10}', 4005, NOW() - INTERVAL '10 days'),
  ('device_004', 'location', '{"lat": 55.6780, "lng": 12.5650, "accuracy": 4, "altitude": 11}', 4006, NOW() - INTERVAL '5 hours'),

  -- Device 005: City patrol zigzag pattern  
  ('device_005', 'location', '{"lat": 55.6800, "lng": 12.5600, "accuracy": 4, "altitude": 20}', 5001, NOW() - INTERVAL '24 hours'),
  ('device_005', 'location', '{"lat": 55.6820, "lng": 12.5650, "accuracy": 3, "altitude": 18}', 5002, NOW() - INTERVAL '20 hours'),
  ('device_005', 'location', '{"lat": 55.6850, "lng": 12.5700, "accuracy": 5, "altitude": 22}', 5003, NOW() - INTERVAL '16 hours'),
  ('device_005', 'location', '{"lat": 55.6830, "lng": 12.5750, "accuracy": 4, "altitude": 19}', 5004, NOW() - INTERVAL '12 hours'),
  ('device_005', 'location', '{"lat": 55.6810, "lng": 12.5800, "accuracy": 3, "altitude": 17}', 5005, NOW() - INTERVAL '8 hours'),
  ('device_005', 'location', '{"lat": 55.6790, "lng": 12.5750, "accuracy": 4, "altitude": 20}', 5006, NOW() - INTERVAL '4 hours'),
  ('device_005', 'location', '{"lat": 55.6800, "lng": 12.5700, "accuracy": 3, "altitude": 21}', 5007, NOW() - INTERVAL '1 hour'),

  -- Device 006: Delivery route with many stops
  ('device_006', 'location', '{"lat": 55.6600, "lng": 12.5400, "accuracy": 6, "altitude": 25}', 6001, NOW() - INTERVAL '12 hours'),
  ('device_006', 'location', '{"lat": 55.6650, "lng": 12.5500, "accuracy": 5, "altitude": 28}', 6002, NOW() - INTERVAL '10 hours'),
  ('device_006', 'location', '{"lat": 55.6700, "lng": 12.5600, "accuracy": 4, "altitude": 30}', 6003, NOW() - INTERVAL '8 hours'),
  ('device_006', 'location', '{"lat": 55.6750, "lng": 12.5650, "accuracy": 5, "altitude": 32}', 6004, NOW() - INTERVAL '6 hours'),
  ('device_006', 'location', '{"lat": 55.6800, "lng": 12.5700, "accuracy": 3, "altitude": 28}', 6005, NOW() - INTERVAL '4 hours'),
  ('device_006', 'location', '{"lat": 55.6820, "lng": 12.5750, "accuracy": 4, "altitude": 26}', 6006, NOW() - INTERVAL '2 hours'),
  ('device_006', 'location', '{"lat": 55.6850, "lng": 12.5800, "accuracy": 3, "altitude": 24}', 6007, NOW() - INTERVAL '30 minutes');