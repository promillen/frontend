# IoT Device Tracking Database

A comprehensive database schema designed for tracking IoT devices with NB-IoT connectivity, built on Supabase PostgreSQL with Row Level Security (RLS).

## Overview

This database is optimized for IoT device tracking applications that need to:
- Track device configuration and status
- Monitor device activity and power consumption
- Log reboot events and system diagnostics
- Store flexible sensor data (WiFi scans, temperature, etc.)
- Maintain message sequence integrity with uplink counters

## Database Schema

### 1. Device Configuration (`device_config`)

**Purpose**: Stores core device information with one entry per device. Acts as the master record for each IoT device.

```sql
CREATE TABLE public.device_config (
    devid TEXT PRIMARY KEY,                          -- Unique device identifier
    name TEXT,                                       -- Human-readable device name
    iccid TEXT,                                      -- SIM card ICCID
    heartbeat_interval INTEGER,                      -- Heartbeat frequency in seconds
    sw_version TEXT,                                 -- Software version
    hw_version TEXT,                                 -- Hardware version
    application_mode TEXT,                           -- Current application mode
    device_data_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),  -- Last config update
    last_seen TIMESTAMP WITH TIME ZONE,              -- Last communication from device
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() -- Device registration timestamp
);
```

**Key Features**:
- `devid` serves as the primary key linking all device data
- `device_data_updated_at` automatically updates when configuration changes
- `last_seen` is automatically calculated from any incoming message
- Uses UPSERT pattern: new data for existing devices updates the record

**Example Data**:
```json
{
  "devid": "DEV001",
  "name": "Warehouse Tracker #1",
  "iccid": "8944501234567890123",
  "heartbeat_interval": 3600,
  "sw_version": "1.2.3",
  "hw_version": "v2.1",
  "application_mode": "tracking",
  "device_data_updated_at": "2024-01-15T10:30:00Z",
  "last_seen": "2024-01-15T10:35:00Z",
  "created_at": "2024-01-10T09:00:00Z"
}
```

### 2. Activity Tracking (`activity`)

**Purpose**: Records power consumption data for each device uplink. Essential for battery life analysis and optimization.

```sql
CREATE TABLE public.activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devid TEXT NOT NULL REFERENCES public.device_config(devid) ON DELETE CASCADE,
    uplink_count INTEGER,                            -- Message sequence number
    sleep INTEGER,                                   -- Sleep mode power consumption
    modem INTEGER,                                   -- Modem power consumption
    gnss INTEGER,                                    -- GPS power consumption
    wifi INTEGER,                                    -- WiFi power consumption
    other INTEGER,                                   -- Other power consumption
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Key Features**:
- One record per device uplink message
- `uplink_count` helps detect lost messages
- Power values typically in microamps or milliamps
- Automatic timestamp for trend analysis

**Example Data**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "devid": "DEV001",
  "uplink_count": 1247,
  "sleep": 10,
  "modem": 250,
  "gnss": 180,
  "wifi": 120,
  "other": 15,
  "created_at": "2024-01-15T10:35:00Z"
}
```

### 3. Reboot Events (`reboot`)

**Purpose**: Tracks device restart events, both intentional and crash-related, for system health monitoring.

```sql
CREATE TABLE public.reboot (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devid TEXT NOT NULL REFERENCES public.device_config(devid) ON DELETE CASCADE,
    uplink_count INTEGER,                            -- Message sequence number
    reason TEXT NOT NULL,                            -- Reboot reason
    line INTEGER,                                    -- Crash line number (optional)
    file TEXT,                                       -- Crash file name (optional)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Key Features**:
- Distinguishes between intentional reboots and crashes
- `line` and `file` populated only for unexpected reboots
- Helps identify firmware stability issues

**Example Data**:
```json
// Intentional reboot
{
  "devid": "DEV001",
  "uplink_count": 1248,
  "reason": "scheduled_update",
  "line": null,
  "file": null
}

// Crash reboot
{
  "devid": "DEV001", 
  "uplink_count": 1249,
  "reason": "watchdog_timeout",
  "line": 245,
  "file": "main.c"
}
```

### 4. Sensor Data (`sensor_data`)

**Purpose**: Flexible storage for various sensor types using JSONB for efficient querying and indexing.

```sql
CREATE TABLE public.sensor_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devid TEXT NOT NULL REFERENCES public.device_config(devid) ON DELETE CASCADE,
    uplink_count INTEGER,                            -- Message sequence number
    data_type TEXT NOT NULL,                         -- Type of sensor data
    data JSONB NOT NULL,                             -- Sensor payload
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Supported Data Types**:

#### WiFi Scan Data (`data_type: "wifi"`)
```json
{
  "data_type": "wifi",
  "data": [
    {"mac": "aa:bb:cc:dd:ee:ff", "rssi": -45},
    {"mac": "11:22:33:44:55:66", "rssi": -67},
    {"mac": "99:88:77:66:55:44", "rssi": -78}
  ]
}
```

#### Temperature Data (`data_type: "temperature"`)
```json
{
  "data_type": "temperature",
  "data": {"value": 23.5, "unit": "celsius"}
}
```

#### GPS Location Data (`data_type: "location"`)
```json
{
  "data_type": "location",
  "data": {
    "latitude": 55.6761,
    "longitude": 12.5683,
    "accuracy": 5.2,
    "altitude": 12.0
  }
}
```

**JSONB Benefits**:
- Efficient storage and indexing
- Native JSON operators for queries
- Schema flexibility for future sensor types
- GIN indexes for fast searches

## Database Functions & Triggers

### Automatic Last Seen Updates

```sql
CREATE OR REPLACE FUNCTION update_device_last_seen()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.device_config 
    SET last_seen = now()
    WHERE devid = NEW.devid;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
```

**Triggers on**:
- `activity` table inserts
- `reboot` table inserts  
- `sensor_data` table inserts

### Device Configuration Updates

```sql
CREATE OR REPLACE FUNCTION update_device_data_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.device_data_updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
```

**Triggers on**: Updates to device configuration fields (excluding `last_seen`)

## Security & Access Control

### Row Level Security (RLS)

All tables have RLS enabled with these policies:

**Read Access**: All authenticated users can view data
```sql
CREATE POLICY "Authenticated users can view [table]" 
ON public.[table] 
FOR SELECT 
USING (true);
```

**Write Access**: Only admins and moderators can modify data
```sql
CREATE POLICY "Admins and moderators can manage [table]" 
ON public.[table] 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role));
```

### User Roles

The system uses the existing `user_roles` table with these roles:
- `admin`: Full access to all data and user management
- `moderator`: Can manage device data but not users
- `user`: Read-only access to device data

## Data Flow & Message Processing

### 1. Device Registration
```sql
-- Insert or update device configuration
INSERT INTO device_config (devid, name, iccid, sw_version, hw_version, application_mode)
VALUES ('DEV001', 'Tracker #1', '8944501234567890123', '1.2.3', 'v2.1', 'tracking')
ON CONFLICT (devid) DO UPDATE SET
    name = EXCLUDED.name,
    iccid = EXCLUDED.iccid,
    sw_version = EXCLUDED.sw_version,
    hw_version = EXCLUDED.hw_version,
    application_mode = EXCLUDED.application_mode;
```

### 2. Regular Uplink Processing
```sql
-- Insert activity data (triggers last_seen update)
INSERT INTO activity (devid, uplink_count, sleep, modem, gnss, wifi, other)
VALUES ('DEV001', 1247, 10, 250, 180, 120, 15);

-- Insert sensor data if present
INSERT INTO sensor_data (devid, uplink_count, data_type, data)
VALUES ('DEV001', 1247, 'temperature', '{"value": 23.5, "unit": "celsius"}');
```

### 3. Reboot Event Processing
```sql
-- Insert reboot event (triggers last_seen update)
INSERT INTO reboot (devid, uplink_count, reason, line, file)
VALUES ('DEV001', 1248, 'watchdog_timeout', 245, 'main.c');
```

## Useful Queries

### Device Health Dashboard
```sql
-- Get device overview with last activity
SELECT 
    dc.*,
    EXTRACT(EPOCH FROM (now() - dc.last_seen))/3600 as hours_since_last_seen,
    COUNT(a.id) as total_messages_today
FROM device_config dc
LEFT JOIN activity a ON dc.devid = a.devid 
    AND a.created_at >= CURRENT_DATE
GROUP BY dc.devid;
```

### Power Consumption Analysis
```sql
-- Average power consumption by device over last 24 hours
SELECT 
    devid,
    AVG(sleep + modem + gnss + wifi + other) as avg_total_power,
    AVG(modem) as avg_modem_power,
    AVG(gnss) as avg_gnss_power,
    COUNT(*) as message_count
FROM activity 
WHERE created_at >= now() - interval '24 hours'
GROUP BY devid
ORDER BY avg_total_power DESC;
```

### Message Loss Detection
```sql
-- Detect gaps in uplink_count sequence
WITH uplink_gaps AS (
    SELECT 
        devid,
        uplink_count,
        LAG(uplink_count) OVER (PARTITION BY devid ORDER BY uplink_count) as prev_count,
        uplink_count - LAG(uplink_count) OVER (PARTITION BY devid ORDER BY uplink_count) - 1 as gap_size
    FROM activity
    WHERE created_at >= now() - interval '7 days'
)
SELECT devid, prev_count, uplink_count, gap_size
FROM uplink_gaps 
WHERE gap_size > 0
ORDER BY devid, uplink_count;
```

### WiFi Location Analysis
```sql
-- Find devices that have seen specific WiFi networks
SELECT DISTINCT 
    s.devid,
    dc.name,
    wifi_data.mac,
    wifi_data.rssi,
    s.created_at
FROM sensor_data s
JOIN device_config dc ON s.devid = dc.devid
CROSS JOIN LATERAL jsonb_array_elements(s.data) as wifi_data
WHERE s.data_type = 'wifi'
    AND wifi_data->>'mac' = 'aa:bb:cc:dd:ee:ff'
ORDER BY s.created_at DESC;
```

### Reboot Frequency Analysis
```sql
-- Reboot patterns by device
SELECT 
    devid,
    COUNT(*) as total_reboots,
    COUNT(*) FILTER (WHERE line IS NOT NULL) as crash_reboots,
    COUNT(*) FILTER (WHERE line IS NULL) as planned_reboots,
    STRING_AGG(DISTINCT reason, ', ') as reboot_reasons
FROM reboot 
WHERE created_at >= now() - interval '30 days'
GROUP BY devid
ORDER BY total_reboots DESC;
```

## Performance Optimizations

### Indexes
```sql
-- Activity table indexes
CREATE INDEX idx_activity_devid ON activity(devid);
CREATE INDEX idx_activity_created_at ON activity(created_at);

-- Sensor data indexes  
CREATE INDEX idx_sensor_data_devid ON sensor_data(devid);
CREATE INDEX idx_sensor_data_type ON sensor_data(data_type);
CREATE INDEX idx_sensor_data_created_at ON sensor_data(created_at);

-- JSONB indexes for sensor data
CREATE INDEX idx_sensor_data_gin ON sensor_data USING gin(data);

-- Reboot table indexes
CREATE INDEX idx_reboot_devid ON reboot(devid);
```

### Partitioning Considerations

For high-volume deployments, consider partitioning large tables by time:

```sql
-- Example: Partition activity table by month
CREATE TABLE activity_y2024m01 PARTITION OF activity
FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
```

## Data Retention

Implement automated cleanup for old data:

```sql
-- Delete activity data older than 1 year
DELETE FROM activity WHERE created_at < now() - interval '1 year';

-- Archive sensor data older than 6 months to separate table
CREATE TABLE sensor_data_archive AS
SELECT * FROM sensor_data WHERE created_at < now() - interval '6 months';

DELETE FROM sensor_data WHERE created_at < now() - interval '6 months';
```

## Integration Examples

### REST API Endpoints

**Device Status**:
```http
GET /api/devices/{devid}/status
```

**Power Consumption**:
```http
GET /api/devices/{devid}/power?hours=24
```

**Sensor Data**:
```http
GET /api/devices/{devid}/sensors?type=temperature&limit=100
```

### Webhook Processing

Process incoming IoT messages through Supabase Edge Functions:

```typescript
// Handle incoming device data
const deviceData = await supabase
  .from('device_config')
  .upsert({
    devid: payload.devid,
    name: payload.name,
    sw_version: payload.sw_version,
    // ... other fields
  });

// Insert activity data
const activity = await supabase
  .from('activity')
  .insert({
    devid: payload.devid,
    uplink_count: payload.uplink_count,
    sleep: payload.power.sleep,
    modem: payload.power.modem,
    // ... other power fields
  });
```

## Monitoring & Alerts

### Key Metrics to Track

1. **Device Health**:
   - Time since last message
   - Reboot frequency
   - Message loss percentage

2. **Power Consumption**:
   - Average daily power usage
   - Power consumption trends
   - Battery level projections

3. **Data Quality**:
   - Missing uplink sequences
   - Invalid sensor readings
   - Failed message processing

### Alert Conditions

```sql
-- Devices offline for more than 2 hours
SELECT devid, name, last_seen 
FROM device_config 
WHERE last_seen < now() - interval '2 hours';

-- High crash rate devices
SELECT devid, COUNT(*) as crashes
FROM reboot 
WHERE line IS NOT NULL 
    AND created_at >= now() - interval '24 hours'
GROUP BY devid 
HAVING COUNT(*) > 3;
```

---

## Development Setup

This project is built with:
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

### Local Development

```sh
# Install dependencies
npm i

# Start development server
npm run dev
```

### Deployment

Deploy via [Lovable](https://lovable.dev/projects/458a931f-d2bc-422b-b5b4-33cb24cd5b10) by clicking Share → Publish.

## Conclusion

This database schema provides a robust foundation for IoT device tracking with flexible sensor data storage, comprehensive power monitoring, automatic device health tracking, strong security controls, and optimized query performance.
