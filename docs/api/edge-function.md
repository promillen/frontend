# Edge Function API Specification

## Overview

The `ingest-sensor-data` Edge Function processes IoT device data sent via the Fly.io CoAP server. It handles location data processing, HMAC signature verification, and database storage.

**Base URL**: `https://cdwtsrzshpotkfbyyyjk.supabase.co/functions/v1/`  
**Function Path**: `/ingest-sensor-data`  
**Method**: `POST`

## Authentication

The Edge Function uses HMAC-SHA256 signature verification for authentication. Each request must include a signature header calculated from the request body.

### Required Headers

```http
Content-Type: application/json
X-Signature: sha256=<hex-encoded-hmac-signature>
```

### Signature Calculation

```python
import hmac
import hashlib
import json

def calculate_signature(secret_key: str, payload: dict) -> str:
    message = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    signature = hmac.new(
        secret_key.encode('utf-8'),
        message,
        hashlib.sha256
    ).hexdigest()
    return f"sha256={signature}"
```

## Request Schema

### Location Data Request

```json
{
  "devid": "string",
  "uplink_count": "integer",
  "location": {
    "gnss": {
      "latitude": "number",
      "longitude": "number",
      "accuracy": "number",
      "timestamp": "string (ISO 8601)"
    },
    "wifi": [
      {
        "bssid": "string (MAC address)",
        "rssi": "integer",
        "channel": "integer"
      }
    ],
    "cells": [
      {
        "mcc": "integer",
        "mnc": "integer",
        "lac": "integer",
        "cid": "integer",
        "rssi": "integer"
      }
    ]
  }
}
```

### Sensor Data Request

```json
{
  "devid": "string",
  "uplink_count": "integer",
  "sensor_data": {
    "temperature": "number",
    "humidity": "number",
    "soil_moisture": "number",
    "battery_level": "number",
    "timestamp": "string (ISO 8601)"
  }
}
```

## Response Schema

### Success Response

```json
{
  "success": true,
  "message": "Data processed successfully",
  "data": {
    "devid": "string",
    "location": {
      "latitude": "number",
      "longitude": "number",
      "accuracy": "number",
      "source": "gnss|here|fallback"
    },
    "processed_at": "string (ISO 8601)"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": "string",
  "code": "string",
  "details": "object (optional)"
}
```

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INVALID_SIGNATURE` | 401 | HMAC signature verification failed |
| `MISSING_DEVICE_ID` | 400 | Device ID not provided in payload |
| `INVALID_PAYLOAD` | 400 | Request body format is invalid |
| `LOCATION_PROCESSING_FAILED` | 500 | Error processing location data |
| `DATABASE_ERROR` | 500 | Database insertion failed |
| `EXTERNAL_API_ERROR` | 502 | HERE API request failed |

## Location Processing Logic

The Edge Function processes location data using the following priority:

1. **GNSS (Primary)**: If valid GNSS coordinates are available
2. **HERE API (Secondary)**: If Wi-Fi or cellular data is available
3. **Fallback**: Previous known location or default coordinates

### GNSS Processing

GNSS data is considered valid if:
- Latitude is between -90 and 90
- Longitude is between -180 and 180
- Accuracy is less than 100 meters (configurable)

### HERE API Integration

When GNSS is unavailable, the function uses HERE's positioning API:

```json
{
  "wlan": [
    {
      "mac": "aa:bb:cc:dd:ee:ff",
      "rss": -45
    }
  ],
  "cell": [
    {
      "mcc": 310,
      "mnc": 410,
      "lac": 1234,
      "cid": 5678,
      "rss": -75
    }
  ]
}
```

## Rate Limiting

The Edge Function implements rate limiting:

- **Per Device**: 100 requests per minute
- **Global**: 10,000 requests per minute
- **Burst**: Up to 200 requests in 10 seconds

Rate limit headers are included in responses:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1699123456
```

## Data Validation

### Device ID Format
- Must be alphanumeric string
- Length: 4-32 characters
- Pattern: `^[a-zA-Z0-9_-]+$`

### Location Data Validation
- **GNSS Coordinates**: Valid lat/lng ranges
- **Wi-Fi BSSID**: Valid MAC address format
- **Cellular**: Valid MCC/MNC/LAC/CID ranges
- **RSSI Values**: Typically -30 to -100 dBm

### Sensor Data Validation
- **Temperature**: -50°C to 85°C
- **Humidity**: 0% to 100%
- **Battery**: 0% to 100%
- **Timestamps**: ISO 8601 format

## Example Requests

### Location Update with GNSS

```bash
curl -X POST \
  https://cdwtsrzshpotkfbyyyjk.supabase.co/functions/v1/ingest-sensor-data \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=abc123..." \
  -d '{
    "devid": "device_001",
    "uplink_count": 42,
    "location": {
      "gnss": {
        "latitude": 37.7749,
        "longitude": -122.4194,
        "accuracy": 5.0,
        "timestamp": "2024-01-15T14:30:00Z"
      }
    }
  }'
```

### Location Update with Wi-Fi

```bash
curl -X POST \
  https://cdwtsrzshpotkfbyyyjk.supabase.co/functions/v1/ingest-sensor-data \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=def456..." \
  -d '{
    "devid": "device_002",
    "uplink_count": 43,
    "location": {
      "wifi": [
        {
          "bssid": "aa:bb:cc:dd:ee:ff",
          "rssi": -45,
          "channel": 6
        },
        {
          "bssid": "11:22:33:44:55:66", 
          "rssi": -67,
          "channel": 11
        }
      ]
    }
  }'
```

## Performance Considerations

### Response Times
- **GNSS Processing**: < 100ms average
- **HERE API Processing**: < 500ms average
- **Database Insert**: < 50ms average

### Timeout Configuration
- **Function Timeout**: 30 seconds
- **HERE API Timeout**: 5 seconds
- **Database Timeout**: 10 seconds

### Retry Logic
- **HERE API**: 3 retries with exponential backoff
- **Database**: 2 retries with 100ms delay
- **Failed requests**: Logged for manual review

## Monitoring & Logging

### Log Levels
- **INFO**: Successful processing
- **WARN**: Fallback processing used
- **ERROR**: Processing failures
- **DEBUG**: Detailed request/response data

### Metrics Tracked
- Request count by device
- Processing time percentiles
- Error rates by type
- HERE API usage and quotas
- Database performance metrics

### Example Log Entry

```json
{
  "timestamp": "2024-01-15T14:30:00Z",
  "level": "INFO",
  "message": "Location processed successfully",
  "data": {
    "devid": "device_001",
    "location_source": "gnss",
    "processing_time_ms": 85,
    "uplink_count": 42
  }
}
```