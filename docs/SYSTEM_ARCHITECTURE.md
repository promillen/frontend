# IoT Device Management System - Architecture & Security

## Overview

This system handles IoT device data ingestion, processing, and real-time monitoring through multiple channels with robust security mechanisms.

## System Architecture

### System Architecture Diagram

```mermaid
flowchart TD
    A[IoT Device] -->|CoAP/UDP| B[Fly.io Server]
    B -->|HTTP/HTTPS + HMAC| C[Supabase Edge Function<br/>ingest-sensor-data]
    
    C --> D{Data Type}
    D -->|Location Data| E[HERE Positioning API]
    D -->|Other Sensors| F[Direct Processing]
    
    E --> G[Supabase Database]
    F --> G
    
    G --> H[Real-time Updates<br/>WebSocket Subscriptions]
    H --> I[Frontend Dashboard]
    
    G --> J[(Tables)]
    J --> K[device_config]
    J --> L[sensor_data]
    J --> M[activity]
    J --> N[reboot]
    
    I --> O[Device List & Filters]
    I --> P[Interactive Map]
    I --> Q[Real-time Monitoring]
    I --> R[User Management]
```

### Data Flow Sequence

```mermaid
sequenceDiagram
    participant Device as IoT Device
    participant Fly as Fly.io Server
    participant Edge as Edge Function
    participant HERE as HERE API
    participant DB as Supabase DB
    participant UI as Frontend

    Note over Device, UI: Location Data Flow
    Device->>Fly: CoAP/UDP: location payload
    Fly->>Edge: POST /ingest-sensor-data<br/>+ HMAC signature
    Edge->>Edge: Verify HMAC
    
    alt WiFi/Cell Data Available
        Edge->>HERE: Position request
        HERE-->>Edge: Coordinates + accuracy
    else GNSS Data Only
        Edge->>HERE: Process raw GNSS
        HERE-->>Edge: Calculated position
    end
    
    Edge->>DB: INSERT sensor_data<br/>type: location
    DB-->>UI: Real-time update
    UI->>UI: Update map markers

    Note over Device, UI: Other Sensor Data Flow  
    Device->>Fly: CoAP/UDP: soil sensor payload<br/>(temp, humidity, NPK, pH, etc.)
    Fly->>Edge: POST /ingest-sensor-data<br/>+ HMAC signature
    Edge->>Edge: Verify HMAC
    Edge->>DB: INSERT sensor_data<br/>type: soil_data<br/>data: {temp, humidity, npk, ph}
    DB-->>UI: Real-time updates
    UI->>UI: Update dashboards
```

## Security Architecture

### 1. HMAC (Hash-based Message Authentication Code)

**What is HMAC?**
- HMAC is a cryptographic mechanism that provides both data integrity and authenticity
- It combines a secret key with the message content to create a unique signature
- Uses SHA-256 hashing algorithm in our implementation

**How it works in our system:**

```javascript
// Signature Generation (Client/Device side)
const secret = "FLY_INGEST_SECRET"
const messageBody = JSON.stringify(payload)
const signature = hmac_sha256(secret, messageBody)
const hexSignature = signature.toString('hex')

// HTTP Header
X-Signature: sha256=${hexSignature}
```

**Verification Process:**
1. Client calculates HMAC-SHA256 of the request body using shared secret
2. Client sends the signature in the `X-Signature` header
3. Server receives the request and extracts the signature
4. Server recalculates HMAC-SHA256 of the received body using the same secret
5. Server compares calculated signature with received signature
6. Request is accepted only if signatures match exactly

### 2. X-Signature Header Format

```
X-Signature: sha256=<hex_encoded_hmac_sha256_signature>
```

**Example:**
```
X-Signature: sha256=a3d2c1b4e5f6789abc123def456789abc123def456789abc123def456789abc123
```

### 3. Security Layers

#### Layer 1: Network Security
- **HTTPS/TLS**: All HTTP communications are encrypted
- **HMAC Verification**: Prevents tampering and unauthorized requests
- **Content-Type Validation**: Only accepts `application/json`

#### Layer 2: Authentication & Authorization
- **JWT Tokens**: User authentication via Supabase Auth
- **Row Level Security (RLS)**: Database-level access control
- **Role-based Access**: Admin, Moderator, User roles with different permissions

#### Layer 3: Data Validation
- **Schema Validation**: JSON payloads validated against expected structure
- **Input Sanitization**: All inputs cleaned and validated
- **Rate Limiting**: Built-in Supabase edge function rate limiting

## Step-by-Step Workflows

### Workflow 1: Sensor Data Ingestion (via Fly.io → Edge Function)

#### Prerequisites
- Device configured to send CoAP messages to Fly.io
- Fly.io configured with shared secret (`FLY_INGEST_SECRET`)
- HERE API key configured in Supabase secrets (for location data)

#### Step-by-Step Process

1. **Device Sends CoAP Message**
   ```javascript
   const payload = {
     devid: "device_001",
     wifi: [
       { mac: "AA:BB:CC:DD:EE:FF", rssi: -45 },
       { mac: "11:22:33:44:55:66", rssi: -67 }
     ],
     cells: [
       { mcc: 310, mnc: 410, lac: 12345, cid: 67890, rssi: -78 }
     ],
     gnss: {
       raw_satellite_data: "...", // Raw GNSS measurements
       timestamp: 1234567890
     }
   }
   ```

2. **Generate HMAC Signature**
   ```bash
   # Using openssl (example)
   echo -n '{"devid":"device_001",...}' | openssl dgst -sha256 -hmac "your_secret_here"
   ```

3. **Fly.io Forwards to Edge Function**
   ```bash
   # Fly.io automatically forwards to Supabase Edge Function
   curl -X POST https://cdwtsrzshpotkfbyyyjk.supabase.co/functions/v1/ingest-sensor-data \
     -H "Content-Type: application/json" \
     -H "X-Signature: sha256=calculated_signature_here" \
     -d '{"devid":"device_001","wifi":[...],"cells":[...]}'
   ```

4. **Edge Function Processing**
   - Verify HMAC signature
   - Extract device ID and sensor data
   - Determine positioning method:
     - **WiFi/Cell available**: Call HERE Positioning API
     - **GNSS only**: Process raw satellite data via HERE
     - **No location data**: Skip positioning

5. **HERE API Integration**
   ```javascript
   // WiFi/Cell positioning
   const response = await fetch('https://positioning.hereapi.com/v2/locate', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       wlan: formattedWifiData,
       gsm: formattedCellData
     })
   })
   
   // GNSS processing (if raw satellite data available)
   const response = await fetch('https://positioning.hereapi.com/v2/gnss', {
     method: 'POST',
     body: gnssRawData
   })
   ```

6. **Database Storage**
   ```sql
   INSERT INTO sensor_data (devid, data_type, data, uplink_count)
   VALUES (
     'device_001',
     'location',
     '{"lat": 37.7749, "lng": -122.4194, "accuracy": 10, "source": "here"}',
     123
   )
   ```

7. **Real-time Notification**
   - Supabase automatically notifies subscribed clients
   - Frontend receives real-time update
   - Map markers updated immediately

## Updated Sequence Diagrams

### Sensor Data Flow (via Fly.io)

```mermaid
sequenceDiagram
    participant Device
    participant Fly as Fly.io Server
    participant EdgeFunc as Edge Function
    participant HERE as HERE Positioning API
    participant DB as Supabase Database
    participant Frontend

    Note over Device, Frontend: Geolocation Data Flow
    Device->>Fly: CoAP/UDP: {wifi: [...], cells: [...], gnss: {raw satellite data}}
    Fly->>EdgeFunc: POST /ingest-sensor-data<br/>{wifi: [...], cells: [...], gnss: {raw satellite data}}
    EdgeFunc->>EdgeFunc: Verify HMAC signature
    
    alt Has WiFi/Cell data
        EdgeFunc->>HERE: Request position with WiFi/Cell data
        HERE-->>EdgeFunc: {lat, lng, accuracy, source: "here"}
    else Has raw GNSS data only
        EdgeFunc->>HERE: Process raw GNSS satellite data
        HERE-->>EdgeFunc: {lat, lng, accuracy, source: "gnss"}
    end
    
    EdgeFunc->>DB: INSERT sensor_data<br/>{data_type: "location", data: {lat, lng, accuracy, source}}
    DB-->>Frontend: Real-time notification
    Frontend->>Frontend: Update map markers

    Note over Device, Frontend: Other Sensor Data Flow
    Device->>Fly: CoAP/UDP: {temperature: 23.5, soil_humidity: 65.2}
    Fly->>EdgeFunc: POST /ingest-sensor-data<br/>{temperature: 23.5, soil_humidity: 65.2}
    EdgeFunc->>EdgeFunc: Verify HMAC signature
    EdgeFunc->>DB: INSERT sensor_data<br/>{data_type: "temperature", data: {value: 23.5, unit: "celsius"}}
    EdgeFunc->>DB: INSERT sensor_data<br/>{data_type: "soil_humidity", data: {value: 65.2, unit: "percent"}}
    DB-->>Frontend: Real-time notifications
    Frontend->>Frontend: Update sensor dashboards
```

### Workflow 2: Other Sensor Data (Temperature, Humidity, etc.)

1. **Device Sends Sensor Data**
   ```json
   {
     "devid": "soil_sensor_001",
     "temperature": 23.5,
     "soil_humidity": 65.2,
     "ph_level": 6.8,
     "timestamp": 1705123456
   }
   ```

2. **Edge Function Processing**
   - Verify HMAC signature
   - Parse sensor readings
   - Create separate sensor_data entries for each measurement

3. **Multiple Database Inserts**
   ```sql
   INSERT INTO sensor_data (devid, data_type, data) VALUES
   ('soil_sensor_001', 'temperature', '{"value": 23.5, "unit": "celsius"}'),
   ('soil_sensor_001', 'soil_humidity', '{"value": 65.2, "unit": "percent"}'),
   ('soil_sensor_001', 'ph_level', '{"value": 6.8, "unit": "ph"}')
   ```

### Workflow 3: CoAP Data Ingestion (Python Server)

1. **Device Connection**
   - Device connects to CoAP server on port 5683/UDP
   - Sends protobuf-encoded data to `/uplink` endpoint

2. **Python Server Processing**
   ```python
   # Parse protobuf message
   uplink_data = parse_protobuf(coap_payload)
   
   # Extract different data types
   device_config = extract_device_config(uplink_data)
   activity_data = extract_activity(uplink_data)
   reboot_data = extract_reboot_info(uplink_data)
   sensor_readings = extract_sensor_data(uplink_data)
   ```

3. **Concurrent Database Operations**
   ```python
   await asyncio.gather(
       upsert_device_config(device_config),
       insert_activity(activity_data),
       insert_reboot(reboot_data),
       insert_sensor_data(sensor_readings)
   )
   ```

### Workflow 4: User Authentication & Authorization

1. **User Registration/Login**
   ```javascript
   const { data, error } = await supabase.auth.signInWithPassword({
     email: 'user@example.com',
     password: 'secure_password'
   })
   ```

2. **Automatic Profile Creation**
   - Database trigger creates profile entry
   - Assigns default 'user' role
   - Sets up initial permissions

3. **Role-based Access Control**
   ```sql
   -- Admin: Full access to all data
   -- Moderator: Can manage devices and sensor data
   -- User: Can only view devices they have access to
   
   SELECT * FROM device_config 
   WHERE EXISTS (
     SELECT 1 FROM device_access 
     WHERE user_id = auth.uid() 
     AND devid = device_config.devid
   )
   ```

## Database Schema & Security

### Row Level Security (RLS) Policies

**device_config table:**
- Admins/Moderators: Full access
- Users: Can only view devices they have access to (via device_access table)

**sensor_data table:**
- Admins/Moderators: Full access
- Authenticated users: Read-only access to all sensor data

**user_roles table:**
- Admins: Full access
- Users: Can only view their own roles

### Real-time Subscriptions

```javascript
// Frontend subscribes to real-time updates
const subscription = supabase
  .channel('sensor-updates')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'sensor_data'
  }, (payload) => {
    // Update UI with new sensor data
    updateSensorDisplay(payload.new)
  })
  .subscribe()
```

## Security Best Practices Implemented

1. **Never store secrets in code** - All sensitive data in Supabase secrets
2. **HMAC verification** - Prevents unauthorized data injection
3. **HTTPS/TLS encryption** - All network traffic encrypted
4. **Row Level Security** - Database-level access control
5. **JWT authentication** - Secure user sessions
6. **Input validation** - All inputs sanitized and validated
7. **Rate limiting** - Built-in protection against abuse
8. **Audit logging** - All database changes logged with timestamps

## Extending the System

### Adding New Sensor Types

1. **Define new data_type** in sensor_data table
2. **Update Edge Function** to handle new sensor format
3. **Create Frontend Components** to display new sensor data
4. **Add Real-time Subscriptions** for immediate updates

### Example: Adding Air Quality Sensor

```javascript
// Edge function handles new sensor type
if (payload.air_quality) {
  await supabase.from('sensor_data').insert({
    devid: payload.devid,
    data_type: 'air_quality',
    data: {
      pm25: payload.air_quality.pm25,
      pm10: payload.air_quality.pm10,
      co2: payload.air_quality.co2,
      unit: 'ppm'
    }
  })
}
```

## Testing & Debugging

### HMAC Signature Testing

```bash
# Generate test signature
SECRET="your_secret_here"
PAYLOAD='{"devid":"test_device","temperature":25.0}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)

# Test API call
curl -X POST https://your-project.supabase.co/functions/v1/ingest-sensor-data \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=$SIGNATURE" \
  -d "$PAYLOAD"
```

### Monitoring & Logs

- **Edge Function Logs**: Available in Supabase dashboard
- **Database Logs**: Query postgres_logs for database operations
- **Real-time Debugging**: Use browser dev tools to monitor WebSocket connections

## Future Enhancements

1. **Device Authentication**: Individual device certificates
2. **Data Encryption**: End-to-end encryption for sensitive sensor data
3. **Advanced Analytics**: Time-series analysis and predictions
4. **Mobile Apps**: React Native apps for field technicians
5. **Alert System**: Real-time notifications for anomalies
6. **Data Export**: CSV/JSON export functionality
7. **Device Provisioning**: Automated device onboarding