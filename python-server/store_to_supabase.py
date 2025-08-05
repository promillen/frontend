import os
import aiohttp
import asyncio
import logging
import json
from typing import Dict, Any, Optional

# Use your current Supabase project credentials
SUPABASE_URL = "https://cdwtsrzshpotkfbyyyjk.supabase.co"
SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkd3RzcnpzaHBvdGtmYnl5eWprIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NjQxNzMsImV4cCI6MjA2NDA0MDE3M30.n6qYEgtmWapgLOyuLva_o6-mBXnxkxIdbVFxxlSEcR4")

logger = logging.getLogger(__name__)

class SupabaseClient:
    def __init__(self):
        self.base_url = f"{SUPABASE_URL}/rest/v1"
        self.headers = {
            "apikey": SUPABASE_API_KEY,
            "Authorization": f"Bearer {SUPABASE_API_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        }

    async def upsert_device_config(self, session: aiohttp.ClientSession, devid: str, config_data: Dict[str, Any]) -> bool:
        """Upsert device configuration data"""
        try:
            # Prepare data for device_config table
            device_config = {
                "devid": devid,
                **{k: v for k, v in config_data.items() if v is not None}
            }
            
            url = f"{self.base_url}/device_config"
            headers = {**self.headers, "Prefer": "resolution=merge-duplicates"}
            
            async with session.post(url, headers=headers, json=device_config) as response:
                if response.status in [200, 201]:
                    logger.info(f"✅ Device config upserted for {devid}")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Device config upsert failed for {devid}: {response.status} - {error_text}")
                    return False
        except Exception as e:
            logger.error(f"❌ Device config upsert error for {devid}: {e}")
            return False

    async def insert_activity(self, session: aiohttp.ClientSession, devid: str, uplink_count: Optional[int], activity_data: Dict[str, Any]) -> bool:
        """Insert activity data"""
        try:
            activity = {
                "devid": devid,
                "uplink_count": uplink_count,
                **{k: v for k, v in activity_data.items() if v is not None}
            }
            
            url = f"{self.base_url}/activity"
            
            async with session.post(url, headers=self.headers, json=activity) as response:
                if response.status in [200, 201]:
                    logger.info(f"✅ Activity data inserted for {devid}")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Activity insert failed for {devid}: {response.status} - {error_text}")
                    return False
        except Exception as e:
            logger.error(f"❌ Activity insert error for {devid}: {e}")
            return False

    async def insert_reboot(self, session: aiohttp.ClientSession, devid: str, uplink_count: Optional[int], reboot_data: Dict[str, Any]) -> bool:
        """Insert reboot data"""
        try:
            reboot = {
                "devid": devid,
                "uplink_count": uplink_count,
                **{k: v for k, v in reboot_data.items() if v is not None}
            }
            
            url = f"{self.base_url}/reboot"
            
            async with session.post(url, headers=self.headers, json=reboot) as response:
                if response.status in [200, 201]:
                    logger.info(f"✅ Reboot data inserted for {devid}")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Reboot insert failed for {devid}: {response.status} - {error_text}")
                    return False
        except Exception as e:
            logger.error(f"❌ Reboot insert error for {devid}: {e}")
            return False

    async def insert_sensor_data(self, session: aiohttp.ClientSession, devid: str, uplink_count: Optional[int], data_type: str, data: Any) -> bool:
        """Insert sensor data"""
        try:
            sensor_data = {
                "devid": devid,
                "uplink_count": uplink_count,
                "data_type": data_type,
                "data": data
            }
            
            url = f"{self.base_url}/sensor_data"
            
            async with session.post(url, headers=self.headers, json=sensor_data) as response:
                if response.status in [200, 201]:
                    logger.info(f"✅ Sensor data ({data_type}) inserted for {devid}")
                    return True
                else:
                    error_text = await response.text()
                    logger.error(f"❌ Sensor data ({data_type}) insert failed for {devid}: {response.status} - {error_text}")
                    return False
        except Exception as e:
            logger.error(f"❌ Sensor data ({data_type}) insert error for {devid}: {e}")
            return False

async def store_uplink_to_supabase(data: Dict[str, Any]):
    """
    Store uplink data to Supabase using the new normalized schema
    """
    devid = data.get("devid")
    uplink_count = data.get("uplink_count")
    
    if not devid:
        logger.error("❌ No device ID provided")
        return

    logger.info(f"📦 Processing data for device {devid}")
    
    client = SupabaseClient()
    results = []
    
    async with aiohttp.ClientSession() as session:
        # Handle device config (upsert)
        if data.get("device_config"):
            task = client.upsert_device_config(session, devid, data["device_config"])
            results.append(("device_config", task))
        
        # Handle activity data
        if data.get("activity"):
            task = client.insert_activity(session, devid, uplink_count, data["activity"])
            results.append(("activity", task))
        
        # Handle reboot data
        if data.get("reboot"):
            task = client.insert_reboot(session, devid, uplink_count, data["reboot"])
            results.append(("reboot", task))
        
        # Handle temperature sensor data
        if data.get("temperature") is not None:
            temperature_data = {"temperature": data["temperature"]}
            task = client.insert_sensor_data(session, devid, uplink_count, "temperature", temperature_data)
            results.append(("temperature", task))
        
        # Handle WiFi sensor data
        if data.get("wifi"):
            wifi_data = {"wifi_scans": data["wifi"]}
            task = client.insert_sensor_data(session, devid, uplink_count, "location", wifi_data)
            results.append(("wifi", task))
        
        # Execute all tasks concurrently
        if results:
            tasks = [task for _, task in results]
            task_names = [name for name, _ in results]
            
            try:
                outcomes = await asyncio.gather(*tasks, return_exceptions=True)
                
                success_count = 0
                for name, outcome in zip(task_names, outcomes):
                    if isinstance(outcome, Exception):
                        logger.error(f"❌ {name} task failed with exception: {outcome}")
                    elif outcome:
                        success_count += 1
                    else:
                        logger.warning(f"⚠️ {name} task returned False")
                
                logger.info(f"📊 Completed {success_count}/{len(results)} operations for device {devid}")
                
            except Exception as e:
                logger.error(f"❌ Error executing batch operations for {devid}: {e}")
        else:
            logger.warning(f"⚠️ No data to store for device {devid}")

# For backward compatibility, keep the synchronous version
def store_uplink_to_supabase_sync(data: Dict[str, Any]):
    """Synchronous wrapper for the async function"""
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
    
    return loop.run_until_complete(store_uplink_to_supabase(data))