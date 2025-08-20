# Development Guide: Changing Data Structures

## Overview

This guide covers how to modify data structures in your IoT system, including device payloads, protobuf schemas, Python server processing, database tables, and frontend components.

## When You Need to Make Changes

### Common Scenarios
1. **Adding new sensor types** (e.g., air quality, pressure sensors)
2. **Modifying existing sensor data format** (e.g., adding accuracy field to temperature)
3. **Adding device metadata** (e.g., firmware version, location name)
4. **Changing location data structure** (e.g., adding altitude, speed)
5. **Adding new device configuration options**

## Step-by-Step Change Process

### 1. Device-Side Changes

**A. Update Protobuf Schema**
```protobuf
// Protobuf/uplink.proto
message Uplink {
  uint32 uplink_count = 1;
  Heartbeat heartbeat = 2;
  Location location = 3;
  
  // NEW: Add air quality data
  AirQuality air_quality = 4;
}

// NEW: Define air quality message
message AirQuality {
  float pm25 = 1;
  float pm10 = 2;
  int32 co2_ppm = 3;
  float temperature = 4;
  float humidity = 5;
}
```

**B. Regenerate Protobuf Files**
```bash
# Generate Python files
protoc --python_out=python-server/Protobuf uplink.proto downlink.proto

# Generate files for your device platform (C++, Java, etc.)
protoc --cpp_out=device/src uplink.proto
protoc --java_out=device/src uplink.proto
```

**C. Update Device Code**
```cpp
// Device code example (C++)
uplink.mutable_air_quality()->set_pm25(sensor_pm25);
uplink.mutable_air_quality()->set_pm10(sensor_pm10);
uplink.mutable_air_quality()->set_co2_ppm(sensor_co2);
```

### 2. Fly.io Python Server Changes

**A. Update Data Extraction**
```python
# python-server/main.py
async def render_post(self, request):
    try:
        uplink = uplink_pb2.Uplink()
        uplink.ParseFromString(request.payload)
        
        logger.info(f"Received payload: {request.payload.hex()}")
        
        dev_id = None
        uplink_count = uplink.uplink_count if uplink.uplink_count else None
        
        # Extract device config
        device_config = None
        if uplink.HasField("heartbeat") and uplink.heartbeat.HasField("config"):
            config = uplink.heartbeat.config
            dev_id = config.devid
            device_config = {
                "devid": config.devid,
                "temperature": config.temperature if config.temperature else None,
                "uplink_count": uplink_count
            }
            logger.info(f"Parsed DeviceConfig: devid: \"{config.devid}\" temperature: {config.temperature}")
        
        # Extract location data
        location_data = None
        if uplink.HasField("location"):
            location = uplink.location
            location_data = {}
            
            if location.wifi:
                location_data["wifi"] = [
                    {"mac": ap.mac, "rssi": ap.rssi} 
                    for ap in location.wifi
                ]
            
            if location.cells:
                location_data["cells"] = [
                    {
                        "mcc": cell.mcc,
                        "mnc": cell.mnc, 
                        "lac": cell.lac,
                        "cid": cell.cid,
                        "rssi": cell.rssi
                    }
                    for cell in location.cells
                ]
            
            if location.HasField("gnss"):
                gnss = location.gnss
                location_data["gnss"] = {
                    "latitude": gnss.latitude,
                    "longitude": gnss.longitude,
                    "accuracy": gnss.accuracy
                }
        
        # NEW: Extract air quality data
        air_quality_data = None
        if uplink.HasField("air_quality"):
            aq = uplink.air_quality
            air_quality_data = {
                "pm25": aq.pm25,
                "pm10": aq.pm10,
                "co2_ppm": aq.co2_ppm,
                "temperature": aq.temperature,
                "humidity": aq.humidity
            }
        
        # Store to Supabase
        await store_uplink_to_supabase({
            "devid": dev_id,
            "uplink_count": uplink_count,
            "device_config": device_config,
            "location": location_data,
            "air_quality": air_quality_data  # NEW
        })
        
        logger.info("Successfully stored to Supabase")
        return aiocoap.Message(code=aiocoap.CHANGED, payload=b"OK")
        
    except Exception as e:
        logger.error(f"Failed to parse or handle uplink: {e}")
        return aiocoap.Message(code=aiocoap.BAD_REQUEST, payload=b"Error")
```

**B. Update Supabase Storage Function**
```python
# python-server/store_to_supabase.py
import json
import hmac
import hashlib
import aiohttp
import os
from colorlog import getLogger

logger = getLogger(__name__)

async def store_uplink_to_supabase(data):
    """Store uplink data to Supabase via Edge Function"""
    
    supabase_url = os.getenv('SUPABASE_URL', 'https://cdwtsrzshpotkfbyyyjk.supabase.co')
    edge_function_url = f"{supabase_url}/functions/v1/ingest-sensor-data"
    secret = os.getenv('FLY_INGEST_SECRET', 'your-secret-key')
    
    try:
        # Store device config if present
        if data.get("device_config"):
            await send_to_supabase(data["device_config"], "device_config", edge_function_url, secret)
        
        # Store location data if present
        if data.get("location"):
            payload = {
                "devid": data["devid"],
                "data_type": "location",
                "data": data["location"],
                "uplink_count": data.get("uplink_count")
            }
            await send_to_supabase(payload, "sensor_data", edge_function_url, secret)
        
        # NEW: Handle air quality data
        if data.get("air_quality"):
            payload = {
                "devid": data["devid"],
                "data_type": "air_quality",
                "data": data["air_quality"],
                "uplink_count": data.get("uplink_count")
            }
            await send_to_supabase(payload, "sensor_data", edge_function_url, secret)
            
    except Exception as e:
        logger.error(f"Error storing to Supabase: {e}")
        raise

async def send_to_supabase(payload, data_type, url, secret):
    """Send data to Supabase Edge Function with HMAC signature"""
    
    # Generate HMAC signature
    payload_json = json.dumps(payload, sort_keys=True)
    signature = hmac.new(
        secret.encode(),
        payload_json.encode(),
        hashlib.sha256
    ).hexdigest()
    
    headers = {
        'Content-Type': 'application/json',
        'X-Signature': f'sha256={signature}'
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, data=payload_json, headers=headers) as response:
            if response.status == 200:
                logger.info(f"Successfully sent {data_type} to Supabase")
            else:
                error_text = await response.text()
                logger.error(f"Failed to send {data_type} to Supabase: {response.status} - {error_text}")
                raise Exception(f"Supabase request failed: {response.status}")
```

**C. Deploy Updated Server**
```bash
cd python-server
flyctl deploy -a your-app
```

### 3. Supabase Edge Function Changes

**A. Update Edge Function**
```javascript
// supabase/functions/ingest-sensor-data/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const body = await req.text()
    const payload = JSON.parse(body)
    
    // Verify HMAC signature
    const signature = req.headers.get('X-Signature')
    const secret = Deno.env.get('FLY_INGEST_SECRET')
    
    if (!await verifyHMAC(signature, body, secret)) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    console.log('HMAC signature verified successfully')

    // Handle device config updates
    if (payload.devid && payload.temperature !== undefined) {
      const { error: configError } = await supabaseClient
        .from('device_config')
        .upsert({
          devid: payload.devid,
          last_seen: new Date().toISOString(),
          last_uplink_count: payload.uplink_count,
          temperature: payload.temperature
        })

      if (configError) {
        console.error('Error updating device config:', configError)
      } else {
        console.log(`Updated device config for ${payload.devid}`)
      }
    }

    // Handle sensor data
    if (payload.data_type && payload.data) {
      let processedData = payload.data

      // Process location data with HERE API
      if (payload.data_type === 'location' && (payload.data.wifi || payload.data.cells)) {
        try {
          const hereApiKey = Deno.env.get('HERE_API_KEY')
          if (hereApiKey) {
            const locationResult = await getLocationFromHERE(payload.data, hereApiKey)
            if (locationResult) {
              processedData = {
                ...payload.data,
                latitude: locationResult.latitude,
                longitude: locationResult.longitude,
                accuracy: locationResult.accuracy,
                source: 'here'
              }
              console.log(`HERE API returned location: ${locationResult.latitude}, ${locationResult.longitude}`)
            }
          }
        } catch (error) {
          console.error('HERE API error:', error)
        }
      }

      // Store sensor data
      const { error: sensorError } = await supabaseClient
        .from('sensor_data')
        .insert({
          devid: payload.devid,
          data_type: payload.data_type,
          data: processedData,
          uplink_count: payload.uplink_count
        })

      if (sensorError) {
        console.error('Error storing sensor data:', sensorError)
        return new Response('Database error', { status: 500, headers: corsHeaders })
      }

      console.log(`Stored sensor_data: ${payload.data_type} for device ${payload.devid}`)
    }

    // NEW: Handle air quality data
    if (payload.data_type === 'air_quality' && payload.data) {
      const { error: airQualityError } = await supabaseClient
        .from('sensor_data')
        .insert({
          devid: payload.devid,
          data_type: 'air_quality',
          data: payload.data,
          uplink_count: payload.uplink_count
        })

      if (airQualityError) {
        console.error('Error storing air quality data:', airQualityError)
        return new Response('Database error', { status: 500, headers: corsHeaders })
      }

      console.log(`Stored air quality data for device ${payload.devid}`)
    }

    return new Response('OK', { headers: corsHeaders })

  } catch (error) {
    console.error('Error processing request:', error)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})

async function verifyHMAC(signature: string | null, body: string, secret: string | undefined): Promise<boolean> {
  if (!signature || !secret) {
    return false
  }

  const expectedSignature = `sha256=${await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret + body)).then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''))}`
  
  return signature === expectedSignature
}

async function getLocationFromHERE(locationData: any, apiKey: string) {
  try {
    const body: any = {}

    if (locationData.wifi && locationData.wifi.length > 0) {
      body.wlan = locationData.wifi.map((ap: any) => ({
        mac: ap.mac,
        rss: ap.rssi
      }))
    }

    if (locationData.cells && locationData.cells.length > 0) {
      body.lte = locationData.cells.map((cell: any) => ({
        mcc: cell.mcc,
        mnc: cell.mnc,
        lac: cell.lac,
        cid: cell.cid,
        rss: cell.rssi
      }))
    }

    const response = await fetch('https://positioning.hereapi.com/v2/locate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    })

    if (response.ok) {
      const result = await response.json()
      if (result.location) {
        return {
          latitude: result.location.lat,
          longitude: result.location.lng,
          accuracy: result.location.accuracy
        }
      }
    }

    return null
  } catch (error) {
    console.error('HERE API request failed:', error)
    return null
  }
}
```

**B. Deploy Edge Function**
Edge functions are deployed automatically when you save changes to the codebase.

### 4. Database Schema Changes

**A. Create Migration**
Use the Supabase migration tool to add new columns or tables:

```sql
-- Add new sensor data types to existing enum (if using enums)
ALTER TYPE sensor_data_type ADD VALUE 'air_quality';

-- Or if using text field, no schema change needed
-- The sensor_data table already supports flexible JSONB data

-- Optionally add specific columns to device_config for frequently accessed data
ALTER TABLE device_config 
ADD COLUMN air_quality_pm25 REAL,
ADD COLUMN air_quality_co2 INTEGER;
```

**B. Update RLS Policies (if needed)**
```sql
-- Usually no changes needed as existing policies cover new data types
-- But verify access controls work as expected
```

### 5. Frontend Changes

**A. Add New Data Type Handling**
```typescript
// src/types/sensor.ts
export interface AirQualityData {
  pm25: number;
  pm10: number;
  co2_ppm: number;
  temperature: number;
  humidity: number;
}

export interface SensorData {
  id: string;
  devid: string;
  data_type: string;
  data: any;
  uplink_count?: number;
  created_at: string;
  air_quality?: AirQualityData;
}
```

**B. Create New Components**
```typescript
// src/components/AirQualityCard.tsx
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface AirQualityCardProps {
  data: AirQualityData;
  timestamp: string;
}

export const AirQualityCard = ({ data, timestamp }: AirQualityCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Air Quality</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">PM2.5</p>
            <p className="text-2xl font-bold">{data.pm25} μg/m³</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">CO2</p>
            <p className="text-2xl font-bold">{data.co2_ppm} ppm</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
```

**C. Update Dashboard Components**
```typescript
// src/components/DeviceList.tsx
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LocationCard } from './LocationCard';
import { SoilDataCard } from './SoilDataCard';
import { AirQualityCard } from './AirQualityCard';
import { GenericSensorCard } from './GenericSensorCard';

interface DeviceListProps {
  searchTerm: string;
}

export const DeviceList = ({ searchTerm }: DeviceListProps) => {
  const [devices, setDevices] = useState<any[]>([]);
  const [sensorData, setSensorData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDevices();
    fetchSensorData();
    
    const subscription = supabase
      .channel('device-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'device_config'
      }, () => {
        fetchDevices();
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'sensor_data'
      }, () => {
        fetchSensorData();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchDevices = async () => {
    const { data, error } = await supabase
      .from('device_config')
      .select('*')
      .order('last_seen', { ascending: false });

    if (error) {
      console.error('Error fetching devices:', error);
    } else {
      setDevices(data || []);
    }
    setLoading(false);
  };

  const fetchSensorData = async () => {
    const { data, error } = await supabase
      .from('sensor_data')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error fetching sensor data:', error);
    } else {
      setSensorData(data || []);
    }
  };

  const renderSensorData = (sensorData: any) => {
    switch (sensorData.data_type) {
      case 'location':
        return <LocationCard data={sensorData.data} timestamp={sensorData.created_at} />;
      case 'soil_data':
        return <SoilDataCard data={sensorData.data} timestamp={sensorData.created_at} />;
      case 'air_quality':  // NEW
        return <AirQualityCard data={sensorData.data} timestamp={sensorData.created_at} />;
      default:
        return <GenericSensorCard data={sensorData} />;
    }
  };

  const filteredDevices = devices.filter(device =>
    device.devid.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div>Loading devices...</div>;
  }

  return (
    <div className="space-y-4">
      {filteredDevices.map((device) => (
        <Card key={device.devid}>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>{device.devid}</CardTitle>
              <Badge variant={device.last_seen > new Date(Date.now() - 24*60*60*1000).toISOString() ? "default" : "secondary"}>
                {device.last_seen > new Date(Date.now() - 24*60*60*1000).toISOString() ? "Online" : "Offline"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Last Seen</p>
                <p className="font-medium">{new Date(device.last_seen).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uplink Count</p>
                <p className="font-medium">{device.last_uplink_count || 'N/A'}</p>
              </div>
              {device.temperature && (
                <div>
                  <p className="text-sm text-muted-foreground">Temperature</p>
                  <p className="font-medium">{device.temperature}°C</p>
                </div>
              )}
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Recent Sensor Data</h4>
              <div className="space-y-2">
                {sensorData
                  .filter(data => data.devid === device.devid)
                  .slice(0, 3)
                  .map((data, index) => (
                    <div key={index}>
                      {renderSensorData(data)}
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
```

## Testing Your Changes

### 1. Local Testing

**A. Test Protobuf Changes**
```python
# Test script
import uplink_pb2

# Create test message
uplink = uplink_pb2.Uplink()
uplink.uplink_count = 123
uplink.air_quality.pm25 = 15.5
uplink.air_quality.co2_ppm = 400

# Serialize and test
payload = uplink.SerializeToString()
print(f"Payload size: {len(payload)} bytes")
```

**B. Test Python Server Locally**
```bash
cd python-server
python main.py
# Test with sample CoAP messages
```

**C. Test Edge Function Locally**
```bash
# Use Supabase CLI
supabase functions serve ingest-sensor-data

# Test with curl
curl -X POST http://localhost:54321/functions/v1/ingest-sensor-data \
  -H "Content-Type: application/json" \
  -d '{"devid":"test","air_quality":{"pm25":15.5,"co2_ppm":400}}'
```

### 2. Staging Environment

**A. Deploy to Staging Fly.io App**
```bash
flyctl deploy -a your-app-staging
```

**B. Test with Real Device**
- Configure device to send to staging server
- Monitor logs for successful processing
- Verify data appears in database

### 3. Production Deployment

**A. Deploy in Order**
1. Database changes first (via migration tool)
2. Edge function changes (automatic)
3. Fly.io server updates
4. Frontend updates
5. Device firmware updates (last)

## Handling Breaking Changes

### Backward Compatibility Strategies

**1. Versioned Protobuf Fields**
```protobuf
message Uplink {
  uint32 uplink_count = 1;
  
  // Legacy fields (keep for compatibility)
  float temperature = 2 [deprecated = true];
  
  // New structured data
  SensorReading sensor_data = 3;
}
```

**2. Gradual Migration**
```python
# Support both old and new formats
if uplink.HasField("temperature"):  # Legacy
    temperature = uplink.temperature
elif uplink.HasField("sensor_data"):  # New format
    temperature = uplink.sensor_data.temperature
```

**3. Database Migration Strategy**
```sql
-- Add new columns without removing old ones
ALTER TABLE sensor_data 
ADD COLUMN data_v2 JSONB;

-- Migrate data gradually
UPDATE sensor_data 
SET data_v2 = migrate_data_format(data)
WHERE data_v2 IS NULL;
```

## Monitoring Changes

### 1. Deployment Monitoring
```bash
# Monitor Fly.io deployment
flyctl logs -a your-app | grep -E "(ERROR|SUCCESS|DEPLOYED)"

# Check Edge Function logs
# View in Supabase dashboard
```

### 2. Data Quality Checks
```sql
-- Verify new data is being received
SELECT 
  data_type, 
  COUNT(*) as count,
  MIN(created_at) as first_seen,
  MAX(created_at) as last_seen
FROM sensor_data 
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY data_type;

-- Check for parsing errors
SELECT devid, data, created_at
FROM sensor_data 
WHERE data_type = 'air_quality'
AND data IS NULL
ORDER BY created_at DESC;
```

### 3. Device Health Monitoring
```sql
-- Monitor devices sending new data format
SELECT 
  devid,
  COUNT(*) as message_count,
  COUNT(CASE WHEN data_type = 'air_quality' THEN 1 END) as air_quality_count
FROM sensor_data 
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY devid
ORDER BY message_count DESC;
```

## Rollback Procedures

### 1. Quick Rollback
```bash
# Rollback Fly.io deployment
flyctl releases rollback -a your-app

# Rollback database changes (if needed)
# Use Supabase dashboard to revert migration
```

### 2. Data Recovery
```sql
-- If data corruption occurs, restore from backup
-- Supabase handles automatic backups

-- Manual data cleanup if needed
DELETE FROM sensor_data 
WHERE data_type = 'air_quality' 
AND created_at > '2024-01-20 14:00:00';
```

## Best Practices

### 1. Version Control
- Tag releases with semantic versioning
- Keep protobuf schemas in version control
- Document breaking changes in CHANGELOG.md

### 2. Testing
- Always test changes in staging first
- Use automated tests for critical paths
- Monitor error rates after deployment

### 3. Documentation
- Update API documentation
- Add examples for new data types
- Document migration procedures

### 4. Communication
- Notify device operators of changes
- Provide migration timelines
- Maintain backward compatibility when possible

## Common Pitfalls

### 1. Protobuf Field Numbers
```protobuf
// ❌ DON'T reuse field numbers
message Uplink {
  uint32 uplink_count = 1;
  // Don't reuse number 2 if it was used before
  AirQuality air_quality = 3;  // Skip to 3
}
```

### 2. Database Migration Order
```sql
-- ❌ Wrong order - add column first
ALTER TABLE sensor_data DROP COLUMN old_field;
ALTER TABLE sensor_data ADD COLUMN new_field TEXT;

-- ✅ Correct order - add first, migrate, then drop
ALTER TABLE sensor_data ADD COLUMN new_field TEXT;
-- Deploy code changes
-- Migrate data
-- Then optionally drop old column
```

### 3. HMAC Signature Changes
```python
# ❌ Don't change payload structure without updating HMAC
# Both Fly.io and Edge Function must use same structure
```

### 4. Edge Function Timeouts
```javascript
// ✅ Handle timeouts for external API calls
const response = await fetch(url, {
  signal: AbortSignal.timeout(5000)  // 5 second timeout
});
```

This guide ensures smooth evolution of your IoT data pipeline while maintaining system reliability and data integrity.
