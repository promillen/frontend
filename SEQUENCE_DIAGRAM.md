# Live Log Streaming Sequence Diagram

## Mermaid Sequence Diagram (Copy & Paste)

```mermaid
sequenceDiagram
    participant IoT as IoT Device
    participant FlyCoAP as Fly.io CoAP Server<br/>(main.py)
    participant FlyWS as Fly.io WebSocket<br/>(port 8080)
    participant SupaEdge as Supabase Edge Function<br/>(device-logs)
    participant Frontend as Frontend WebSocket
    participant User as User Browser
    participant DB as Supabase Database

    Note over User,DB: Initial Setup Phase
    User->>Frontend: Open device logs page
    Frontend->>SupaEdge: Connect WebSocket<br/>wss://project.functions.supabase.co/device-logs?deviceId=ABC123
    SupaEdge->>FlyWS: Connect to Fly.io WebSocket<br/>wss://flyio-nbiot.fly.dev/ws?deviceId=ABC123<br/>Authorization: Bearer TOKEN
    FlyWS-->>SupaEdge: Connection established
    SupaEdge-->>Frontend: WebSocket connection ready
    Frontend-->>User: Show "Live Logs" tab ready

    Note over IoT,DB: Live Data Flow
    IoT->>FlyCoAP: Send CoAP uplink message<br/>coap://flyio-nbiot.fly.dev:5683/uplink
    
    Note over FlyCoAP: Parse protobuf message
    FlyCoAP->>FlyCoAP: Extract device data<br/>(config, activity, reboot, etc.)
    
    Note over FlyCoAP,DB: Parallel Operations
    par Store to Database
        FlyCoAP->>DB: Store device_config (upsert)
        FlyCoAP->>DB: Store activity data
        FlyCoAP->>DB: Store sensor_data (temperature)
        FlyCoAP->>DB: Store sensor_data (wifi scans)
        DB-->>FlyCoAP: Storage complete
    and Broadcast Live Log
        FlyCoAP->>FlyWS: Broadcast JSON log message<br/>{deviceId, timestamp, type, data}
        FlyWS->>SupaEdge: Forward message to connected clients
        SupaEdge->>SupaEdge: Filter by deviceId parameter
        SupaEdge->>Frontend: Send filtered message
        Frontend->>User: Display real-time log entry
    end
    
    FlyCoAP-->>IoT: Send downlink response<br/>(optional configuration)

    Note over User,DB: Error Handling
    alt WebSocket Connection Lost
        SupaEdge-xFlyWS: Connection dropped
        SupaEdge->>SupaEdge: Attempt reconnection
        SupaEdge->>FlyWS: Reconnect with exponential backoff
        FlyWS-->>SupaEdge: Connection restored
    else Database Storage Fails
        FlyCoAP-xDB: Storage error
        FlyCoAP->>FlyWS: Still broadcast live log<br/>(independent operation)
        FlyWS->>Frontend: Live log continues working
    end

    Note over User,DB: Cleanup Phase
    User->>Frontend: Close logs page or switch device
    Frontend->>SupaEdge: Close WebSocket connection
    SupaEdge->>FlyWS: Close Fly.io WebSocket connection
    FlyWS->>FlyWS: Remove from connection registry<br/>(WeakSet auto-cleanup)
```

## Alternative Text-Based Flow Diagram

```
┌─────────────┐    CoAP     ┌──────────────────┐    Store Data    ┌─────────────────┐
│ IoT Device  │────────────▶│  Fly.io Server   │─────────────────▶│ Supabase DB     │
└─────────────┘             │  (main.py)       │                  └─────────────────┘
                             └──────────────────┘
                                       │
                                       │ Broadcast JSON
                                       ▼
                             ┌──────────────────┐
                             │ WebSocket        │
                             │ (/ws endpoint)   │
                             └──────────────────┘
                                       │
                                       │ Relay Message
                                       ▼
                             ┌──────────────────┐    Filter by     ┌─────────────────┐
                             │ Supabase Edge    │   deviceId      │ Frontend        │
                             │ Function         │────────────────▶│ WebSocket       │
                             │ (device-logs)    │                  └─────────────────┘
                             └──────────────────┘                           │
                                                                           │
                                                                           ▼
                                                                 ┌─────────────────┐
                                                                 │ User Browser    │
                                                                 │ (Live Logs Tab) │
                                                                 └─────────────────┘
```

## Message Flow Details

### 1. CoAP Uplink Processing
```json
// Input: Protobuf CoAP message
// Output: Parsed device data + WebSocket broadcast

{
  "deviceId": "ABC123",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "type": "uplink",
  "message": "Received uplink #42",
  "data": {
    "uplink_count": 42,
    "temperature": 23.5,
    "activity": {
      "sleep": 3600,
      "modem": 45,
      "gnss": 120,
      "wifi": 30,
      "other": 60
    },
    "wifi_count": 3,
    "reboot": null
  }
}
```

### 2. Database Storage (Parallel)
```sql
-- device_config (upsert)
UPSERT INTO device_config (devid, heartbeat_interval, hw_version, ...)

-- activity (insert)
INSERT INTO activity (devid, uplink_count, sleep, modem, ...)

-- sensor_data (insert)
INSERT INTO sensor_data (devid, data_type, data)
VALUES ('ABC123', 'temperature', '{"temperature": 23.5}')
```

### 3. WebSocket Authentication
```http
GET wss://flyio-nbiot.fly.dev/ws?deviceId=ABC123
Authorization: Bearer your-secure-token
```

### 4. Error Recovery
- WebSocket disconnections trigger automatic reconnection
- Database failures don't affect live streaming
- Invalid device IDs are filtered out
- Token authentication prevents unauthorized access

## Performance Characteristics

- **Latency**: < 100ms from CoAP receipt to frontend display
- **Concurrency**: Handles multiple device connections simultaneously  
- **Memory**: WeakSet automatically cleans up closed connections
- **Reliability**: Database and live streaming operate independently

## Security Flow

```
[IoT Device] → [Fly.io:5683 UDP] → [Internal Processing] → [Fly.io:8080 WSS + Auth Token] → [Supabase Edge Function] → [Frontend WSS]
     │                                                              │
     └── No direct internet access to frontend ←────────────────────┘
```

The token-based authentication ensures only authorized Edge Functions can access the WebSocket stream, while the frontend connects through Supabase's secure infrastructure.