# CoAP Server for Device Data Ingestion

This Python server receives device data via CoAP and stores it in Supabase using the normalized database schema.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables:
```bash
export SUPABASE_API_KEY="your_service_role_key_here"
```

Note: The Supabase URL is already configured for your project.

## Database Schema

The server splits incoming device data into these Supabase tables:

- **device_config**: Device configuration (heartbeat_interval, versions, etc.)
- **activity**: Device activity metrics (sleep, modem, gnss, wifi, other)
- **reboot**: Reboot information (reason, file, line)
- **sensor_data**: Sensor readings (temperature, WiFi scans, future sensor types)

## Data Flow

1. Device sends protobuf message via CoAP
2. Server parses the message and extracts different data types
3. Data is stored in appropriate tables concurrently
4. Database triggers update the `last_seen` timestamp in `device_config`
5. Frontend receives real-time updates via Supabase subscriptions

## Testing

Run the test script to verify database integration:

```bash
python test_supabase.py
```

## Deployment

Build and deploy with Docker:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
EXPOSE 5683/udp

CMD ["python", "main.py"]
```

## Security Notes

- Currently using the anon key for testing
- For production, use the service role key and implement proper device authentication
- Consider adding API rate limiting and device validation

## Future Extensions

The `sensor_data` table's flexible JSON structure supports:
- Accelerometer data
- GPS coordinates  
- Battery levels
- Custom sensor readings
- Any new sensor types

Just add new `data_type` values and corresponding JSON payloads.