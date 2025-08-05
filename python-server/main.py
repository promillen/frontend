import asyncio
import logging
import colorlog
import aiocoap.resource as resource
from aiocoap.numbers.contentformat import ContentFormat
import aiocoap
import sys
import os

from store_to_supabase import store_uplink_to_supabase

sys.path.append('Protobuf')

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

def format_mac(mac: str) -> str:
    return ':'.join(mac[i:i+2] for i in range(0, len(mac), 2))

class DataResource(resource.Resource):
    def __init__(self):
        super().__init__()

    async def render_post(self, request):
        try:
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

async def main():
    root = resource.Site()
    root.add_resource(['uplink'], DataResource())
    await aiocoap.Context.create_server_context(root, bind=('0.0.0.0', 5683))

    logging.info("CoAP server running on coap://0.0.0.0:5683/uplink")
    await asyncio.get_running_loop().create_future()

if __name__ == "__main__":
    asyncio.run(main())