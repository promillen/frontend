# System Architecture Overview

## Architecture Diagram

```mermaid
graph TB
    subgraph "IoT Devices"
        D1[Device 1<br/>CoAP Client]
        D2[Device 2<br/>CoAP Client]
        D3[Device N<br/>CoAP Client]
    end
    
    subgraph "Fly.io Infrastructure"
        FS[Python CoAP Server<br/>UDP:5683]
        FS --> |HTTPS POST| SF
    end
    
    subgraph "Supabase Backend"
        SF[Edge Function<br/>ingest-sensor-data]
        DB[(PostgreSQL<br/>Database)]
        AUTH[Auth Service]
        SF --> DB
        SF --> HERE[HERE Location API]
    end
    
    subgraph "Frontend"
        WEB[React Dashboard]
        WEB --> AUTH
        WEB --> DB
    end
    
    D1 --> |CoAP/UDP| FS
    D2 --> |CoAP/UDP| FS
    D3 --> |CoAP/UDP| FS
    
    style FS fill:#e1f5fe
    style SF fill:#e8f5e8
    style DB fill:#fff3e0
    style WEB fill:#f3e5f5
```

## Component Overview

### IoT Devices
- **Protocol**: CoAP over UDP
- **Port**: 5683
- **Authentication**: HMAC-SHA256 signatures
- **Data Format**: Protobuf serialization
- **Capabilities**:
  - GNSS positioning
  - Wi-Fi scanning
  - Cellular tower detection
  - Sensor data collection

### Fly.io Ingestion Layer
- **Runtime**: Python 3.11+ with aiocoap
- **Scaling**: Auto-scaling based on load
- **Security**: HMAC signature generation and forwarding
- **Processing**:
  - CoAP message parsing
  - Protobuf deserialization
  - HTTPS relay to Supabase

### Supabase Backend
- **Edge Functions**: Deno runtime for data processing
- **Database**: PostgreSQL with Row Level Security
- **Authentication**: JWT tokens with role-based access
- **External APIs**: HERE Location Services integration

### Frontend Dashboard
- **Framework**: React with TypeScript
- **UI Library**: Tailwind CSS with shadcn/ui
- **Mapping**: Leaflet with clustering
- **Real-time**: Supabase subscriptions

## Data Flow Sequence

```mermaid
sequenceDiagram
    participant Device as IoT Device
    participant Fly as Fly.io Server
    participant Edge as Edge Function
    participant HERE as HERE API
    participant DB as Database
    participant Web as Dashboard
    
    Device->>Fly: CoAP POST /ingest
    Note over Device,Fly: Protobuf payload with HMAC
    
    Fly->>Fly: Parse CoAP & Protobuf
    Fly->>Fly: Generate HMAC signature
    
    Fly->>Edge: HTTPS POST with X-Signature
    Note over Fly,Edge: JSON payload + HMAC header
    
    Edge->>Edge: Verify HMAC signature
    Edge->>Edge: Process location data
    
    alt GNSS available
        Edge->>DB: Insert location (GNSS)
    else Wi-Fi/Cell data available
        Edge->>HERE: Location query
        HERE->>Edge: Coordinates response
        Edge->>DB: Insert location (HERE)
    end
    
    Edge->>Fly: 200 OK response
    Fly->>Device: CoAP ACK
    
    DB->>Web: Real-time subscription
    Web->>Web: Update device markers
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Devices** | CoAP/UDP, Protobuf | Efficient IoT communication |
| **Ingestion** | Python, aiocoap, Fly.io | Protocol translation & scaling |
| **Processing** | Deno, TypeScript, Supabase | Serverless data processing |
| **Storage** | PostgreSQL, RLS | Secure data persistence |
| **API** | HERE Location Services | Location resolution |
| **Frontend** | React, TypeScript, Tailwind | User interface |
| **Mapping** | Leaflet.js | Interactive maps |

## Scalability Considerations

### Horizontal Scaling
- **Fly.io**: Auto-scaling based on CoAP request volume
- **Supabase**: Managed PostgreSQL with connection pooling
- **Edge Functions**: Automatic scaling per request

### Performance Optimizations
- **Connection Pooling**: PostgreSQL connections managed by Supabase
- **Caching**: Edge Function responses cached where appropriate
- **Clustering**: Map markers clustered for performance
- **Real-time**: Efficient WebSocket subscriptions

### Resource Management
- **Memory**: Python server optimized for low memory usage
- **CPU**: Asynchronous processing in all layers
- **Network**: CoAP chosen for minimal bandwidth usage
- **Storage**: Database indexes on frequently queried columns

## Security Architecture

### Authentication & Authorization
- **Device Level**: HMAC-SHA256 with shared secrets
- **API Level**: JWT tokens with role verification
- **Database Level**: Row Level Security policies
- **Network Level**: HTTPS/TLS encryption

### Data Protection
- **In Transit**: TLS 1.3 for all HTTPS communications
- **At Rest**: Supabase managed encryption
- **Processing**: Signature verification at every layer
- **Access Control**: Role-based permissions (admin/manager/user)

## Monitoring & Observability

### Application Metrics
- **Device Health**: Last seen timestamps and heartbeats
- **Ingestion Rate**: CoAP messages per second
- **Processing Time**: Edge function execution duration
- **Error Rates**: Failed requests and retries

### Infrastructure Metrics
- **Fly.io**: CPU, memory, and network utilization
- **Supabase**: Database performance and connection counts
- **HERE API**: Request quotas and response times

### Alerting
- **Device Offline**: No data received within threshold
- **High Error Rate**: Processing failures above 5%
- **API Limits**: Approaching HERE API quotas
- **System Health**: Infrastructure component failures