# Database Schema Reference

## Core Tables

### device_config
Stores IoT device configuration and metadata.

```sql
CREATE TABLE device_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users,
  device_name TEXT,
  device_type TEXT,
  location JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### sensor_data
Stores time-series sensor readings from devices.

```sql
CREATE TABLE sensor_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id TEXT NOT NULL,
  sensor_type TEXT NOT NULL,
  data JSONB NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Row Level Security (RLS)

### Policies
- Users can only access their own devices
- Sensor data is filtered by device ownership
- Admin users have full access

## Indexes

### Performance Indexes
```sql
CREATE INDEX idx_sensor_data_device_timestamp ON sensor_data(device_id, timestamp DESC);
CREATE INDEX idx_device_config_user_id ON device_config(user_id);
```

For detailed schema information, see [System Architecture](../SYSTEM_ARCHITECTURE.md).