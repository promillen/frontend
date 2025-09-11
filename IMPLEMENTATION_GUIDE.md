# Live Log Streaming Implementation Guide

## Overview
This guide implements real-time log streaming from your Fly.io CoAP server to your Lovable frontend via Supabase Edge Functions.

## Architecture Flow
```
IoT Device → Fly.io CoAP Server → WebSocket Broadcast → Supabase Edge Function → Frontend WebSocket
```

---

## Step 1: Update Fly.io Server Configuration

### 1.1 Update fly.toml
Replace your current `fly.toml` with:

```toml
# fly.toml app configuration
app = "flyio-nbiot"
primary_region = "arn"

[build]
  dockerfile = "Dockerfile"

# CoAP over UDP (uplinks)
[[services]]
  protocol = "udp"
  internal_port = 5683
  processes = ["app"]

  [[services.ports]]
    port = 5683

# HTTP/WebSocket relay
[[services]]
  protocol = "tcp"  
  internal_port = 8080
  processes = ["app"]

  [services.concurrency]
    type = "connections"
    soft_limit = 100
    hard_limit = 1000

  [[services.ports]]
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

[[vm]]
  memory = "256mb"
  cpu_kind = "shared"
  cpus = 1
```

### 1.2 Update main.py
Replace your `main.py` with this enhanced version:

```python
import asyncio
import logging
import colorlog
import aiocoap.resource as resource
from aiocoap.numbers.contentformat import ContentFormat
import aiocoap
import sys
import os
import json
from datetime import datetime
import weakref
from aiohttp import web, WSMsgType
import aiohttp

from store_to_supabase import store_uplink_to_supabase
import uplink_pb2
import downlink_pb2

# Setup colored logging
handler = colorlog.StreamHandler()
handler.setFormatter(colorlog.ColoredFormatter(
    "%(log_color)s[%(asctime)s] %(levelname)s - %(message)s",
    datefmt="%H:%M:%S",
    log_colors={
        "DEBUG":    "cyan",
        "INFO":     "green", 
        "WARNING":  "yellow",
        "ERROR":    "red",
        "CRITICAL": "bold_red",
    }
))

logger = colorlog.getLogger()
logger.setLevel(logging.DEBUG)
logger.handlers.clear()
logger.addHandler(handler)

# WebSocket connections registry
websocket_connections = weakref.WeakSet()

def format_mac(mac: str) -> str:
    return ':'.join(mac[i:i+2] for i in range(0, len(mac), 2))

async def broadcast_log_message(message: dict):
    """Broadcast a log message to all connected WebSocket clients."""
    if not websocket_connections:
        return
        
    # Create a copy of connections to avoid modification during iteration
    connections = list(websocket_connections)
    
    for ws in connections:
        try:
            if not ws.closed:
                await ws.send_str(json.dumps(message))
        except Exception as e:
            logger.warning(f"Failed to send to WebSocket client: {e}")

class DataResource(resource.Resource):
    def __init__(self):
        super().__init__()

    async def render_post(self, request):
        try:
            timestamp = datetime.utcnow().isoformat() + 'Z'
            
            logging.info(f"Received payload: {request.payload.hex()}")
            uplink = uplink_pb2.Uplink()
            uplink.ParseFromString(request.payload)

            logging.info(f"Parsed DeviceConfig: {uplink}")

            # Extract values
            dev_id = heartbeat_interval = iccid = hw_version = sw_version = application_mode = None
            activity_sleep = activity_modem = activity_gnss = activity_wifi = activity_other = None
            reboot_file = reboot_line = reboot_reason = temperature = uplink_count = None
            wifi_list = []

            if uplink.HasField("heartbeat"):
                hb = uplink.heartbeat
                if hb.HasField("config"):
                    dev_id = hb.config.dev_id
                    heartbeat_interval = hb.config.heartbeat_interval
                    iccid = hb.config.iccid
                    hw_version = hb.config.hw_version
                    sw_version = hb.config.sw_version
                    application_mode = str(hb.config.location_mode)

                if hb.HasField("activity"):
                    activity_sleep = hb.activity.sleep
                    activity_modem = hb.activity.modem
                    activity_gnss = hb.activity.gnss
                    activity_wifi = hb.activity.wifi
                    activity_other = hb.activity.other

                if hb.HasField("reboot"):
                    reboot_file = hb.reboot.file
                    reboot_line = hb.reboot.line
                    reboot_reason = str(hb.reboot.reason)

                temperature = hb.modem_temperature

            if uplink.HasField("location"):
                for wifi in uplink.location.wifi:
                    wifi_list.append({
                        "mac": format_mac(wifi.mac.hex()),
                        "rssi": wifi.rssi
                    })

            uplink_count = uplink.uplink_count

            # Store to Supabase using new schema
            await store_uplink_to_supabase({
                "devid": dev_id,
                "uplink_count": uplink_count,
                "device_config": {
                    "heartbeat_interval": heartbeat_interval,
                    "iccid": iccid,
                    "hw_version": hw_version,
                    "sw_version": sw_version,
                    "application_mode": application_mode,
                } if any([heartbeat_interval, iccid, hw_version, sw_version, application_mode]) else None,
                "activity": {
                    "sleep": activity_sleep,
                    "modem": activity_modem,
                    "gnss": activity_gnss,
                    "wifi": activity_wifi,
                    "other": activity_other,
                } if any([activity_sleep, activity_modem, activity_gnss, activity_wifi, activity_other]) else None,
                "reboot": {
                    "reason": reboot_reason,
                    "file": reboot_file,
                    "line": reboot_line,
                } if any([reboot_reason, reboot_file, reboot_line]) else None,
                "temperature": temperature,
                "wifi": wifi_list if wifi_list else None
            })

            # Broadcast live log message to WebSocket clients
            if dev_id:
                log_message = {
                    "deviceId": dev_id,
                    "timestamp": timestamp,
                    "type": "uplink",
                    "message": f"Received uplink #{uplink_count or 0}",
                    "data": {
                        "uplink_count": uplink_count,
                        "temperature": temperature,
                        "activity": {
                            "sleep": activity_sleep,
                            "modem": activity_modem,
                            "gnss": activity_gnss,
                            "wifi": activity_wifi,
                            "other": activity_other,
                        } if any([activity_sleep, activity_modem, activity_gnss, activity_wifi, activity_other]) else None,
                        "wifi_count": len(wifi_list) if wifi_list else 0,
                        "reboot": {
                            "reason": reboot_reason,
                            "file": reboot_file,
                            "line": reboot_line,
                        } if any([reboot_reason, reboot_file, reboot_line]) else None
                    }
                }
                await broadcast_log_message(log_message)

            # Optional downlink
            downlink = downlink_pb2.Downlink()
            downlink.config.heartbeat_interval = 720
            downlink.config.location_mode = downlink_pb2.LocationMode.WIFI
            payload = downlink.SerializeToString()

            return aiocoap.Message(
                code=aiocoap.CONTENT,
                payload=payload,
                content_format=ContentFormat.OCTETSTREAM
            )

        except Exception as e:
            logging.error(f"Failed to parse or handle uplink: {e}")
            return aiocoap.Message(code=aiocoap.INTERNAL_SERVER_ERROR)

# WebSocket handler
async def websocket_handler(request):
    """Handle WebSocket connections for live log streaming."""
    
    # Verify authentication token
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    expected_token = os.getenv('LIVE_LOGS_TOKEN')
    
    if not expected_token:
        logger.error("LIVE_LOGS_TOKEN not configured")
        return web.Response(status=500, text="Server configuration error")
    
    if token != expected_token:
        logger.warning(f"Unauthorized WebSocket connection attempt")
        return web.Response(status=401, text="Unauthorized")
    
    # Get device ID from query params
    device_id = request.query.get('deviceId')
    if not device_id:
        return web.Response(status=400, text="deviceId query parameter required")
    
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    # Add to connections registry
    websocket_connections.add(ws)
    logger.info(f"WebSocket connected for device {device_id}")
    
    # Send initial connection confirmation
    await ws.send_str(json.dumps({
        "type": "connected",
        "deviceId": device_id,
        "timestamp": datetime.utcnow().isoformat() + 'Z'
    }))
    
    try:
        async for msg in ws:
            if msg.type == WSMsgType.ERROR:
                logger.error(f'WebSocket error: {ws.exception()}')
                break
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        logger.info(f"WebSocket disconnected for device {device_id}")
    
    return ws

async def health_check(request):
    """Health check endpoint."""
    return web.Response(text="OK")

async def setup_http_server():
    """Set up HTTP server for WebSocket endpoints."""
    app = web.Application()
    app.router.add_get('/ws', websocket_handler)
    app.router.add_get('/health', health_check)
    
    runner = web.AppRunner(app)
    await runner.setup()
    
    site = web.TCPSite(runner, '0.0.0.0', 8080)
    await site.start()
    
    logger.info("HTTP server running on http://0.0.0.0:8080")
    logger.info("WebSocket endpoint: ws://0.0.0.0:8080/ws")

async def setup_coap_server():
    """Set up CoAP server."""
    root = resource.Site()
    root.add_resource(['uplink'], DataResource())
    await aiocoap.Context.create_server_context(root, bind=('0.0.0.0', 5683))
    logger.info("CoAP server running on coap://0.0.0.0:5683/uplink")

async def main():
    """Main entry point - run both servers concurrently."""
    await asyncio.gather(
        setup_http_server(),
        setup_coap_server(),
        asyncio.get_running_loop().create_future()  # Run forever
    )

if __name__ == "__main__":
    asyncio.run(main())
```

### 1.3 Update requirements.txt
Add aiohttp to your `requirements.txt`:

```
aiocoap
aiohttp
colorlog
# ... your other dependencies
```

---

## Step 2: Set Environment Variables

### 2.1 Set Fly.io Environment Variables
```bash
# Generate a secure token
flyctl secrets set LIVE_LOGS_TOKEN="your-secure-token-here"

# Set your existing Supabase credentials
flyctl secrets set SUPABASE_URL="https://cdwtsrzshpotkfbyyyjk.supabase.co"
flyctl secrets set SUPABASE_API_KEY="your-service-role-key"
```

---

## Step 3: Configure Supabase Secrets

Set these secrets in your Supabase project (already done via Lovable):

1. **FLYIO_WS_URL**: `wss://flyio-nbiot.fly.dev/ws`
2. **FLYIO_WS_TOKEN**: `your-secure-token-here` (same as LIVE_LOGS_TOKEN)

---

## Step 4: Deploy and Test

### 4.1 Deploy to Fly.io
```bash
# Deploy your updated server
flyctl deploy

# Check logs
flyctl logs
```

### 4.2 Test WebSocket Connection
```bash
# Test the WebSocket endpoint
curl -I "https://flyio-nbiot.fly.dev/health"

# Should return HTTP 200 OK
```

### 4.3 Test Live Logs in Frontend
1. Open your Lovable app
2. Navigate to a device's logs page
3. Click "Live Logs" tab
4. Send a CoAP message to your device
5. Verify real-time logs appear

---

## Step 5: Frontend Integration (Already Done)

The Supabase Edge Function `device-logs` is already configured to:
- Connect to your Fly.io WebSocket
- Filter messages by deviceId
- Relay to frontend WebSocket

---

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check Fly.io logs: `flyctl logs`
   - Verify LIVE_LOGS_TOKEN is set
   - Ensure port 8080 is exposed in fly.toml

2. **No Live Messages**
   - Verify CoAP server receives messages
   - Check WebSocket broadcast logic
   - Confirm device ID matches query parameter

3. **Edge Function Errors**
   - Check Supabase function logs
   - Verify FLYIO_WS_URL and FLYIO_WS_TOKEN secrets
   - Test direct WebSocket connection

### Testing Commands

```bash
# Test CoAP endpoint
echo "test" | nc -u flyio-nbiot.fly.dev 5683

# Test HTTP health
curl https://flyio-nbiot.fly.dev/health

# Check Fly logs
flyctl logs --app flyio-nbiot

# Test WebSocket (with auth)
wscat -c "wss://flyio-nbiot.fly.dev/ws?deviceId=test" \
  -H "Authorization: Bearer your-token"
```

---

## Security Considerations

1. **Token Security**: Keep LIVE_LOGS_TOKEN secure and rotate regularly
2. **CORS**: WebSocket endpoint uses token auth instead of CORS
3. **Rate Limiting**: Consider adding rate limiting for WebSocket connections
4. **Device ID Validation**: Validate device IDs to prevent unauthorized access

---

## Performance Notes

1. **Memory Usage**: WeakSet automatically cleans up closed connections
2. **Concurrent Connections**: Limited by Fly.io instance resources
3. **Message Broadcasting**: Asynchronous to avoid blocking CoAP processing
4. **Error Recovery**: Failed WebSocket sends don't affect CoAP operation

---

## Next Steps

1. Monitor Fly.io logs for WebSocket activity
2. Test with real IoT device messages
3. Consider adding message filtering by log level
4. Implement connection monitoring and alerts