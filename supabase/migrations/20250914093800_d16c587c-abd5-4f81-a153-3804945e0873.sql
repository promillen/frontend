-- Create enum for application types
CREATE TYPE public.application_type AS ENUM (
  'geotracking',
  'agriculture', 
  'environmental',
  'industrial',
  'custom'
);

-- Create sensor profiles table
CREATE TABLE public.sensor_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  application_type application_type NOT NULL DEFAULT 'custom',
  config JSONB NOT NULL DEFAULT '{}',
  dashboard_layout JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on sensor_profiles
ALTER TABLE public.sensor_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for sensor_profiles
CREATE POLICY "Users can view sensor profiles"
ON public.sensor_profiles
FOR SELECT
USING (true);

CREATE POLICY "Developers, admins, and moderators can manage sensor profiles"
ON public.sensor_profiles
FOR ALL
USING (has_role(auth.uid(), 'developer'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'developer'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Add sensor_profile_id to device_config
ALTER TABLE public.device_config 
ADD COLUMN sensor_profile_id UUID REFERENCES public.sensor_profiles(id) ON DELETE SET NULL;

-- Create data type registry table
CREATE TABLE public.sensor_data_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  unit TEXT,
  data_schema JSONB NOT NULL DEFAULT '{}',
  visualization_config JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sensor_data_types
ALTER TABLE public.sensor_data_types ENABLE ROW LEVEL SECURITY;

-- RLS policies for sensor_data_types
CREATE POLICY "Users can view sensor data types"
ON public.sensor_data_types
FOR SELECT
USING (true);

CREATE POLICY "Developers, admins, and moderators can manage sensor data types"
ON public.sensor_data_types
FOR ALL
USING (has_role(auth.uid(), 'developer'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role))
WITH CHECK (has_role(auth.uid(), 'developer'::app_role) OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));

-- Insert default sensor data types
INSERT INTO public.sensor_data_types (name, display_name, description, unit, data_schema, visualization_config) VALUES
('location', 'Location Data', 'GPS/GNSS location coordinates', 'coordinates', '{"lat": "number", "lng": "number", "accuracy": "number"}', '{"type": "map", "color": "#3b82f6"}'),
('temperature', 'Temperature', 'Temperature readings', '°C', '{"value": "number"}', '{"type": "line_chart", "color": "#ef4444", "range": {"min": -40, "max": 80}}'),
('humidity', 'Humidity', 'Relative humidity percentage', '%', '{"value": "number"}', '{"type": "line_chart", "color": "#06b6d4", "range": {"min": 0, "max": 100}}'),
('soil_moisture', 'Soil Moisture', 'Soil moisture content', '%', '{"value": "number"}', '{"type": "gauge", "color": "#10b981", "range": {"min": 0, "max": 100}}'),
('ph_level', 'pH Level', 'Soil or water pH measurement', 'pH', '{"value": "number"}', '{"type": "gauge", "color": "#f59e0b", "range": {"min": 0, "max": 14}}'),
('air_quality', 'Air Quality', 'Air quality index', 'AQI', '{"value": "number", "pm25": "number", "pm10": "number"}', '{"type": "multi_gauge", "color": "#8b5cf6"}'),
('pressure', 'Atmospheric Pressure', 'Barometric pressure', 'hPa', '{"value": "number"}', '{"type": "line_chart", "color": "#6366f1"}'),
('battery', 'Battery Level', 'Device battery percentage', '%', '{"value": "number"}', '{"type": "battery", "color": "#22c55e", "range": {"min": 0, "max": 100}}'),
('vibration', 'Vibration', 'Vibration sensor data', 'g', '{"x": "number", "y": "number", "z": "number"}', '{"type": "3d_chart", "color": "#ec4899"}'),
('flow_rate', 'Flow Rate', 'Liquid flow measurement', 'L/min', '{"value": "number"}', '{"type": "line_chart", "color": "#14b8a6"}');

-- Insert default sensor profiles
INSERT INTO public.sensor_profiles (name, description, application_type, config, dashboard_layout) VALUES
('Geotracking', 'Standard GPS/GNSS location tracking', 'geotracking', 
 '{"primary_sensors": ["location", "battery"], "update_interval": 300, "map_enabled": true}',
 '[{"type": "map", "size": "full", "sensors": ["location"]}, {"type": "chart_grid", "size": "half", "sensors": ["battery"]}]'),
 
('Agriculture Monitor', 'Soil and environmental monitoring for farming', 'agriculture',
 '{"primary_sensors": ["soil_moisture", "temperature", "humidity", "ph_level"], "update_interval": 600, "alerts_enabled": true}',
 '[{"type": "chart_grid", "size": "full", "sensors": ["soil_moisture", "temperature", "humidity", "ph_level"]}, {"type": "alerts", "size": "quarter"}]'),
 
('Environmental Station', 'Weather and air quality monitoring', 'environmental',
 '{"primary_sensors": ["temperature", "humidity", "pressure", "air_quality"], "update_interval": 300, "public_data": true}',
 '[{"type": "weather_widget", "size": "half", "sensors": ["temperature", "humidity", "pressure"]}, {"type": "air_quality_widget", "size": "half", "sensors": ["air_quality"]}]'),
 
('Industrial Monitor', 'Equipment and machinery monitoring', 'industrial',
 '{"primary_sensors": ["vibration", "temperature", "pressure"], "update_interval": 60, "maintenance_mode": true}',
 '[{"type": "status_grid", "size": "full", "sensors": ["vibration", "temperature", "pressure"]}, {"type": "maintenance_log", "size": "quarter"}]');

-- Create trigger for updating sensor_profiles timestamps
CREATE OR REPLACE FUNCTION public.update_sensor_profiles_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_sensor_profiles_updated_at
BEFORE UPDATE ON public.sensor_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_sensor_profiles_timestamp();