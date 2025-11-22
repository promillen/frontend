import asyncio
import logging
import colorlog
import aiocoap.resource as resource
from aiocoap.numbers.contentformat import ContentFormat
import aiocoap
import os
import json
import time
import datetime
import random
from typing import Dict, Set
from collections import defaultdict
from aiohttp import web

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

# WebSocket auth token
LIVE_LOGS_TOKEN = os.getenv("LIVE_LOGS_TOKEN")

# deviceId -> set of WebSocketResponse
ws_clients: Dict[str, Set[web.WebSocketResponse]] = defaultdict(set)

def format_mac(mac: str) -> str:
    return ':'.join(mac[i:i+2] for i in range(0, len(mac), 2))

def utc_iso() -> str:
    return datetime.datetime.utcnow().isoformat(timespec="milliseconds") + "Z"

async def ws_broadcast(device_id: str, payload: dict):
    """Broadcast a dict payload to all WS clients for a device."""
    if not device_id or device_id not in ws_clients or not ws_clients[device_id]:
        return
    msg = json.dumps(payload, default=str)
    to_drop: Set[web.WebSocketResponse] = set()
    for ws in list(ws_clients[device_id]):
        if ws.closed:
            to_drop.add(ws)
            continue
        try:
            await ws.send_str(msg)
        except Exception as e:
            logger.warning(f"WS send failed to {device_id}: {e}")
            to_drop.add(ws)
    for ws in to_drop:
        ws_clients[device_id].discard(ws)

def ws_is_authorized(req: web.Request) -> bool:
    """Authorize via Authorization: Bearer <token> or ?token= query."""
    if LIVE_LOGS_TOKEN:
        auth = req.headers.get("Authorization", "")
        if auth.startswith("Bearer ") and auth.split(" ", 1)[1] == LIVE_LOGS_TOKEN:
            return True
        token = req.query.get("token")
        if token == LIVE_LOGS_TOKEN:
            return True
        return False
    # If no token set, allow (dev mode)
    return True

async def ws_handler(req: web.Request):
    if not ws_is_authorized(req):
        return web.Response(status=401, text="Unauthorized")
    device_id = req.query.get("deviceId")
    if not device_id:
        return web.Response(status=400, text="Missing deviceId")

    ws = web.WebSocketResponse(heartbeat=30)
    await ws.prepare(req)

    ws_clients[device_id].add(ws)
    logger.info(f"WS connected: deviceId={device_id}, total={len(ws_clients[device_id])}")

    # Initial message
    await ws.send_json({
        "type": "system",
        "message": "connected",
        "deviceId": device_id,
        "timestamp": utc_iso(),
        "source": "flyio/ws"
    })

    try:
        async for msg in ws:
            if msg.type == web.WSMsgType.TEXT:
                # Optional: handle client commands (e.g., ping)
                try:
                    data = json.loads(msg.data)
                    if data.get("type") == "ping":
                        await ws.send_json({
                            "type": "pong",
                            "timestamp": utc_iso(),
                            "deviceId": device_id
                        })
                except Exception:
                    # Ignore non-JSON
                    pass
            elif msg.type == web.WSMsgType.ERROR:
                logger.warning(f"WS error for {device_id}: {ws.exception()}")
                break
    finally:
        ws_clients[device_id].discard(ws)
        logger.info(f"WS disconnected: deviceId={device_id}, remaining={len(ws_clients[device_id])}")

    return ws

# TEST ENDPOINT FOR MOCK MESSAGES
async def test_handler(req: web.Request):
    """Generate test messages for a device"""
    device_id = req.query.get("deviceId", "test-device")
    msg_type = req.query.get("type", "random")
    count = int(req.query.get("count", "1"))
    
    logger.info(f"Generating {count} test messages of type '{msg_type}' for device {device_id}")
    
    for i in range(count):
        timestamp = utc_iso()
        uplink_count = random.randint(1, 999)
        
        if msg_type == "heartbeat" or (msg_type == "random" and random.choice([True, False, False])):
            await ws_broadcast(device_id, {
                "id": f"{device_id}-{uplink_count}-{int(time.time()*1000)}",
                "type": "heartbeat",
                "deviceId": device_id,
                "timestamp": timestamp,
                "message": "Heartbeat config received",
                "details": {
                    "heartbeat_interval": random.randint(300, 3600),
                    "iccid": f"8901234567890{random.randint(100000, 999999)}",
                    "hw_version": f"v{random.randint(1, 3)}.{random.randint(0, 9)}",
                    "sw_version": f"v{random.randint(1, 2)}.{random.randint(0, 9)}.{random.randint(0, 9)}",
                    "application_mode": random.choice(["WIFI", "GPS", "NONE"]),
                    "uplink_count": uplink_count
                }
            })
        
        elif msg_type == "activity" or (msg_type == "random" and random.choice([True, False])):
            await ws_broadcast(device_id, {
                "id": f"{device_id}-{uplink_count}-{int(time.time()*1000)}",
                "type": "activity",
                "deviceId": device_id,
                "timestamp": timestamp,
                "message": "Activity metrics received",
                "details": {
                    "sleep": random.randint(0, 100),
                    "modem": random.randint(0, 50),
                    "gnss": random.randint(0, 30),
                    "wifi": random.randint(0, 20),
                    "other": random.randint(0, 10),
                    "uplink_count": uplink_count
                }
            })
        
        elif msg_type == "temperature" or (msg_type == "random" and random.choice([True, False])):
            temp = random.randint(-10, 45)
            await ws_broadcast(device_id, {
                "id": f"{device_id}-{uplink_count}-{int(time.time()*1000)}",
                "type": "temperature",
                "deviceId": device_id,
                "timestamp": timestamp,
                "message": f"Temperature reading: {temp}°C",
                "details": {
                    "temperature": temp,
                    "uplink_count": uplink_count
                }
            })
        
        elif msg_type == "location" or (msg_type == "random" and random.choice([True, False])):
            wifi_count = random.randint(1, 8)
            wifi_scans = []
            for j in range(wifi_count):
                mac = ':'.join([f'{random.randint(0, 255):02x}' for _ in range(6)])
                wifi_scans.append({
                    "mac": mac,
                    "rssi": random.randint(-90, -30)
                })
            
            await ws_broadcast(device_id, {
                "id": f"{device_id}-{uplink_count}-{int(time.time()*1000)}",
                "type": "location",
                "deviceId": device_id,
                "timestamp": timestamp,
                "message": f"WiFi scan ({wifi_count} APs)",
                "details": {
                    "wifi_scans": wifi_scans,
                    "uplink_count": uplink_count
                }
            })
        
        elif msg_type == "reboot":
            await ws_broadcast(device_id, {
                "id": f"{device_id}-{uplink_count}-{int(time.time()*1000)}",
                "type": "reboot",
                "deviceId": device_id,
                "timestamp": timestamp,
                "message": "Reboot info received",
                "details": {
                    "reason": random.choice(["WATCHDOG", "POWER_ON", "SOFTWARE", "HARD_RESET"]),
                    "file": f"main.c",
                    "line": random.randint(100, 999),
                    "uplink_count": uplink_count
                }
            })
        
        else:  # default coap message
            await ws_broadcast(device_id, {
                "id": f"{device_id}-{uplink_count}-{int(time.time()*1000)}",
                "type": "coap",
                "deviceId": device_id,
                "timestamp": timestamp,
                "message": f"Received uplink #{uplink_count}",
                "raw": f"{''.join([f'{random.randint(0, 255):02x}' for _ in range(20)])}",
                "details": {
                    "uplink_count": uplink_count,
                    "bytes": random.randint(10, 50),
                    "source": "test/mock"
                }
            })
        
        # Small delay between messages if sending multiple
        if count > 1 and i < count - 1:
            await asyncio.sleep(0.5)
    
    return web.Response(text=f"Generated {count} test messages for {device_id}", 
                       headers={'Access-Control-Allow-Origin': '*'})

# HEALTH CHECK ENDPOINT
async def health_handler(req: web.Request):
    """Health check endpoint"""
    return web.json_response({
        "status": "healthy",
        "timestamp": utc_iso(),
        "websocket_clients": {device_id: len(clients) for device_id, clients in ws_clients.items()},
        "total_connections": sum(len(clients) for clients in ws_clients.values())
    }, headers={'Access-Control-Allow-Origin': '*'})

class DataResource(resource.Resource):
    def __init__(self):
        super().__init__()

    async def render_post(self, request):
        try:
            raw_hex = request.payload.hex()
            logging.info(f"Received payload: {raw_hex}")
            uplink = uplink_pb2.Uplink()
            uplink.ParseFromString(request.payload)

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
            timestamp = utc_iso()

            # Broadcast a base COAP message
            if dev_id:
                await ws_broadcast(dev_id, {
                    "id": f"{dev_id}-{uplink_count}-{int(time.time()*1000)}",
                    "type": "coap",
                    "deviceId": dev_id,
                    "timestamp": timestamp,
                    "message": f"Received uplink #{uplink_count}",
                    "raw": raw_hex,
                    "details": {
                        "uplink_count": uplink_count,
                        "bytes": len(request.payload),
                        "source": "coap/uplink"
                    }
                })

                # Broadcast per-section messages for easier reading
                if any([heartbeat_interval, iccid, hw_version, sw_version, application_mode]):
                    await ws_broadcast(dev_id, {
                        "type": "heartbeat",
                        "deviceId": dev_id,
                        "timestamp": timestamp,
                        "message": "Heartbeat config received",
                        "details": {
                            "heartbeat_interval": heartbeat_interval,
                            "iccid": iccid,
                            "hw_version": hw_version,
                            "sw_version": sw_version,
                            "application_mode": application_mode,
                            "uplink_count": uplink_count
                        }
                    })

                if any([activity_sleep, activity_modem, activity_gnss, activity_wifi, activity_other]):
                    await ws_broadcast(dev_id, {
                        "type": "activity",
                        "deviceId": dev_id,
                        "timestamp": timestamp,
                        "message": "Activity metrics received",
                        "details": {
                            "sleep": activity_sleep,
                            "modem": activity_modem,
                            "gnss": activity_gnss,
                            "wifi": activity_wifi,
                            "other": activity_other,
                            "uplink_count": uplink_count
                        }
                    })

                if any([reboot_reason, reboot_file, reboot_line]):
                    await ws_broadcast(dev_id, {
                        "type": "reboot",
                        "deviceId": dev_id,
                        "timestamp": timestamp,
                        "message": "Reboot info received",
                        "details": {
                            "reason": reboot_reason,
                            "file": reboot_file,
                            "line": reboot_line,
                            "uplink_count": uplink_count
                        }
                    })

                if temperature is not None:
                    await ws_broadcast(dev_id, {
                        "type": "temperature",
                        "deviceId": dev_id,
                        "timestamp": timestamp,
                        "message": f"Temperature reading: {temperature}°C",
                        "details": {
                            "temperature": temperature,
                            "uplink_count": uplink_count
                        }
                    })

                if wifi_list:
                    await ws_broadcast(dev_id, {
                        "type": "location",
                        "deviceId": dev_id,
                        "timestamp": timestamp,
                        "message": f"WiFi scan ({len(wifi_list)} APs)",
                        "details": {
                            "wifi_scans": wifi_list,
                            "uplink_count": uplink_count
                        }
                    })

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

            downlink = downlink_pb2.Downlink()
            downlink.config.heartbeat_interval = 1100
            # Explicitly use the new protobuf enum mapping: 0=NONE, 1=GNSS, 2=WIFI
            downlink.config.location_mode = 2
            payload = downlink.SerializeToString()

            return aiocoap.Message(
                code=aiocoap.CONTENT,
                payload=payload,
                content_format=ContentFormat.OCTETSTREAM
            )

        except Exception as e:
            logging.error(f"Failed to parse or handle uplink: {e}")
            return aiocoap.Message(code=aiocoap.INTERNAL_SERVER_ERROR)

async def start_coap_server():
    root = resource.Site()
    root.add_resource(['uplink'], DataResource())
    await aiocoap.Context.create_server_context(root, bind=('0.0.0.0', 5683))
    logger.info("CoAP server running on coap://0.0.0.0:5683/uplink")

async def start_http_server():
    app = web.Application()
    app.router.add_get("/ws", ws_handler)
    app.router.add_get("/test", test_handler)  # Test endpoint
    app.router.add_get("/health", health_handler)  # Health check
    port = int(os.getenv("PORT", "8080"))
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "0.0.0.0", port)
    await site.start()
    logger.info(f"HTTP server running on http://0.0.0.0:{port}")
    logger.info(f"WebSocket endpoint: ws://0.0.0.0:{port}/ws")
    logger.info(f"Test endpoint: http://0.0.0.0:{port}/test")
    logger.info(f"Health check: http://0.0.0.0:{port}/health")

async def main():
    await asyncio.gather(
        start_coap_server(),
        start_http_server(),
        asyncio.get_running_loop().create_future()
    )

if __name__ == "__main__":
    asyncio.run(main())