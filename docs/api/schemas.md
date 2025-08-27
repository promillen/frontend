# Data Schemas & Formats

## Overview

This document defines the data schemas used throughout the IoT Device Management System, including Protobuf definitions, JSON schemas, and database table structures.

## Protobuf Schemas

### Device Uplink Message

```protobuf
syntax = "proto3";

package iot.uplink;

// Main uplink message from devices
message Uplink {
  string devid = 1;                    // Device identifier (4-32 chars)
  uint32 uplink_count = 2;             // Message sequence number
  oneof payload {
    Heartbeat heartbeat = 3;           // Device heartbeat
    Location location = 4;             // Location data
    SensorData sensor_data = 5;        // Sensor readings
  }
  string signature = 6;                // HMAC-SHA256 signature
}

// Device heartbeat message
message Heartbeat {
  int64 timestamp = 1;                 // Unix timestamp (seconds)
  uint32 battery_level = 2;            // Battery percentage (0-100)
  int32 signal_strength = 3;           // Signal strength (dBm)
  string firmware_version = 4;         // Device firmware version
}

// Location data from various sources
message Location {
  GNSS gnss = 1;                       // GPS/GLONASS coordinates
  repeated WiFiScan wifi = 2;          // Wi-Fi access points
  repeated CellularScan cells = 3;     // Cellular towers
  int64 timestamp = 4;                 // Measurement timestamp
}

// GNSS (GPS) coordinates
message GNSS {
  double latitude = 1;                 // Latitude (-90 to 90)
  double longitude = 2;                // Longitude (-180 to 180)
  float accuracy = 3;                  // Accuracy in meters
  int64 timestamp = 4;                 // Fix timestamp
  float altitude = 5;                  // Altitude in meters (optional)
  float speed = 6;                     // Speed in m/s (optional)
  float heading = 7;                   // Heading in degrees (optional)
}

// Wi-Fi access point scan
message WiFiScan {
  string bssid = 1;                    // MAC address (AA:BB:CC:DD:EE:FF)
  int32 rssi = 2;                      // Signal strength (dBm)
  uint32 channel = 3;                  // Wi-Fi channel (1-14)
  string ssid = 4;                     // Network name (optional)
}

// Cellular tower scan
message CellularScan {
  uint32 mcc = 1;                      // Mobile Country Code
  uint32 mnc = 2;                      // Mobile Network Code
  uint32 lac = 3;                      // Location Area Code
  uint32 cid = 4;                      // Cell ID
  int32 rssi = 5;                      // Signal strength (dBm)
  uint32 psc = 6;                      // Primary Scrambling Code (optional)
}

// Sensor data readings
message SensorData {
  float temperature = 1;               // Temperature in Celsius
  float humidity = 2;                  // Relative humidity (0-100%)
  float soil_moisture = 3;             // Soil moisture (0-100%)
  uint32 battery_level = 4;            // Battery percentage (0-100)
  int64 timestamp = 5;                 // Reading timestamp
  float pressure = 6;                  // Atmospheric pressure (hPa, optional)
  float light_level = 7;               // Light intensity (lux, optional)
  float ph_level = 8;                  // Soil pH level (optional)
}
```

## JSON Schemas

### Edge Function Request Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Sensor Data Ingestion Request",
  "type": "object",
  "required": ["devid"],
  "properties": {
    "devid": {
      "type": "string",
      "pattern": "^[a-zA-Z0-9_-]{4,32}$",
      "description": "Unique device identifier"
    },
    "uplink_count": {
      "type": "integer",
      "minimum": 0,
      "maximum": 4294967295,
      "description": "Message sequence number"
    },
    "location": {
      "$ref": "#/definitions/location"
    },
    "sensor_data": {
      "$ref": "#/definitions/sensorData"
    },
    "heartbeat": {
      "$ref": "#/definitions/heartbeat"
    }
  },
  "definitions": {
    "location": {
      "type": "object",
      "properties": {
        "gnss": {
          "$ref": "#/definitions/gnss"
        },
        "wifi": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/wifiScan"
          },
          "maxItems": 20
        },
        "cells": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/cellularScan"
          },
          "maxItems": 10
        },
        "timestamp": {
          "type": "string",
          "format": "date-time"
        }
      }
    },
    "gnss": {
      "type": "object",
      "required": ["latitude", "longitude"],
      "properties": {
        "latitude": {
          "type": "number",
          "minimum": -90,
          "maximum": 90
        },
        "longitude": {
          "type": "number",
          "minimum": -180,
          "maximum": 180
        },
        "accuracy": {
          "type": "number",
          "minimum": 0,
          "maximum": 1000
        },
        "timestamp": {
          "type": "string",
          "format": "date-time"
        },
        "altitude": {
          "type": "number",
          "minimum": -1000,
          "maximum": 10000
        },
        "speed": {
          "type": "number",
          "minimum": 0,
          "maximum": 200
        },
        "heading": {
          "type": "number",
          "minimum": 0,
          "maximum": 360
        }
      }
    },
    "wifiScan": {
      "type": "object",
      "required": ["bssid"],
      "properties": {
        "bssid": {
          "type": "string",
          "pattern": "^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"
        },
        "rssi": {
          "type": "integer",
          "minimum": -100,
          "maximum": -10
        },
        "channel": {
          "type": "integer",
          "minimum": 1,
          "maximum": 14
        },
        "ssid": {
          "type": "string",
          "maxLength": 32
        }
      }
    },
    "cellularScan": {
      "type": "object",
      "required": ["mcc", "mnc", "lac", "cid"],
      "properties": {
        "mcc": {
          "type": "integer",
          "minimum": 100,
          "maximum": 999
        },
        "mnc": {
          "type": "integer",
          "minimum": 0,
          "maximum": 999
        },
        "lac": {
          "type": "integer",
          "minimum": 1,
          "maximum": 65535
        },
        "cid": {
          "type": "integer",
          "minimum": 1,
          "maximum": 268435455
        },
        "rssi": {
          "type": "integer",
          "minimum": -120,
          "maximum": -30
        }
      }
    },
    "sensorData": {
      "type": "object",
      "properties": {
        "temperature": {
          "type": "number",
          "minimum": -50,
          "maximum": 85
        },
        "humidity": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        },
        "soil_moisture": {
          "type": "number",
          "minimum": 0,
          "maximum": 100
        },
        "battery_level": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100
        },
        "pressure": {
          "type": "number",
          "minimum": 800,
          "maximum": 1200
        },
        "light_level": {
          "type": "number",
          "minimum": 0,
          "maximum": 100000
        },
        "ph_level": {
          "type": "number",
          "minimum": 0,
          "maximum": 14
        },
        "timestamp": {
          "type": "string",
          "format": "date-time"
        }
      }
    },
    "heartbeat": {
      "type": "object",
      "required": ["timestamp"],
      "properties": {
        "timestamp": {
          "type": "string",
          "format": "date-time"
        },
        "battery_level": {
          "type": "integer",
          "minimum": 0,
          "maximum": 100
        },
        "signal_strength": {
          "type": "integer",
          "minimum": -120,
          "maximum": -30
        },
        "firmware_version": {
          "type": "string",
          "pattern": "^\\d+\\.\\d+\\.\\d+$"
        }
      }
    }
  }
}
```

### Edge Function Response Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Sensor Data Ingestion Response",
  "type": "object",
  "required": ["success"],
  "properties": {
    "success": {
      "type": "boolean"
    },
    "message": {
      "type": "string"
    },
    "data": {
      "type": "object",
      "properties": {
        "devid": {
          "type": "string"
        },
        "location": {
          "type": "object",
          "properties": {
            "latitude": {"type": "number"},
            "longitude": {"type": "number"},
            "accuracy": {"type": "number"},
            "source": {
              "type": "string",
              "enum": ["gnss", "here", "fallback"]
            }
          }
        },
        "processed_at": {
          "type": "string",
          "format": "date-time"
        }
      }
    },
    "error": {
      "type": "string"
    },
    "code": {
      "type": "string"
    },
    "details": {
      "type": "object"
    }
  }
}
```

## Database Schemas

### Core Tables

#### device_config
```sql
CREATE TABLE device_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devid TEXT UNIQUE NOT NULL,
    name TEXT,
    device_type TEXT,
    location_enabled BOOLEAN DEFAULT true,
    sensor_types TEXT[],
    last_seen TIMESTAMP WITH TIME ZONE,
    last_uplink_count INTEGER,
    device_data_updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    battery_level INTEGER,
    signal_strength INTEGER,
    firmware_version TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### sensor_data
```sql
CREATE TABLE sensor_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    devid TEXT NOT NULL,
    data_type TEXT NOT NULL,
    data JSONB NOT NULL,
    location GEOGRAPHY(POINT, 4326),
    accuracy REAL,
    uplink_count INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    inputs_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### profiles
```sql
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### user_roles
```sql
CREATE TYPE app_role AS ENUM ('admin', 'manager', 'user');

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id),
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

### Indexes

```sql
-- Performance indexes
CREATE INDEX idx_sensor_data_devid_timestamp ON sensor_data(devid, timestamp DESC);
CREATE INDEX idx_sensor_data_location ON sensor_data USING GIST(location);
CREATE INDEX idx_sensor_data_data_type ON sensor_data(data_type);
CREATE INDEX idx_sensor_data_created_at ON sensor_data(created_at);
CREATE INDEX idx_device_config_devid ON device_config(devid);
CREATE INDEX idx_device_config_last_seen ON device_config(last_seen DESC);

-- Unique constraints
CREATE UNIQUE INDEX idx_user_roles_user_role ON user_roles(user_id, role);
```

## HERE API Schemas

### Positioning Request

```json
{
  "wlan": [
    {
      "mac": "string",     // MAC address (required)
      "rss": "integer",    // Signal strength in dBm (optional)
      "channel": "integer" // Channel number (optional)
    }
  ],
  "cell": [
    {
      "mcc": "integer",    // Mobile Country Code (required)
      "mnc": "integer",    // Mobile Network Code (required)
      "lac": "integer",    // Location Area Code (required)
      "cid": "integer",    // Cell ID (required)
      "rss": "integer"     // Signal strength in dBm (optional)
    }
  ]
}
```

### Positioning Response

```json
{
  "location": {
    "lat": 37.7749,
    "lng": -122.4194,
    "accuracy": 50
  },
  "fallback": "ipv4"
}
```

## Data Validation Rules

### Device ID Validation
- **Format**: Alphanumeric with hyphens/underscores
- **Length**: 4-32 characters
- **Pattern**: `^[a-zA-Z0-9_-]+$`
- **Case**: Preserved as provided

### Location Data Validation
- **Latitude**: -90 to 90 degrees
- **Longitude**: -180 to 180 degrees
- **Accuracy**: 0-1000 meters (reasonable GPS accuracy)
- **BSSID**: Valid MAC address format
- **RSSI**: -100 to -10 dBm (typical Wi-Fi/cellular range)

### Sensor Data Validation
- **Temperature**: -50°C to 85°C (typical sensor range)
- **Humidity**: 0-100% relative humidity
- **Battery**: 0-100% charge level
- **Pressure**: 800-1200 hPa (typical atmospheric range)
- **Light**: 0-100,000 lux
- **pH**: 0-14 (standard pH scale)

### Timestamp Validation
- **Format**: ISO 8601 (YYYY-MM-DDTHH:MM:SS.sssZ)
- **Range**: Not more than 24 hours in the past or future
- **Timezone**: UTC preferred, local timezone accepted

## Error Response Schemas

### Validation Error
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "field": "latitude",
    "value": 91.5,
    "message": "Latitude must be between -90 and 90"
  }
}
```

### Authentication Error
```json
{
  "success": false,
  "error": "HMAC signature verification failed",
  "code": "INVALID_SIGNATURE",
  "details": {
    "expected_signature": "sha256=abc123...",
    "received_signature": "sha256=def456..."
  }
}
```

### Rate Limit Error
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "window": "1 minute",
    "retry_after": 45
  }
}
```

## Schema Versioning

### Protobuf Versioning
- **Backward Compatibility**: New fields added with default values
- **Field Numbers**: Never reused, always increment
- **Deprecation**: Mark fields as deprecated before removal
- **Version Header**: Include version in message when needed

### JSON Schema Versioning
- **Semantic Versioning**: Follow semver for schema versions
- **Migration Path**: Provide clear upgrade instructions
- **Validation**: Test compatibility between versions
- **Documentation**: Maintain changelog for schema changes

### Database Schema Versioning
- **Migrations**: Use Supabase migration system
- **Rollback**: Ensure migrations can be safely rolled back
- **Data Migration**: Include data transformation scripts
- **Testing**: Validate migrations on production-like data