import os
import aiohttp
import asyncio
import logging
import json
from typing import Dict, Any, Optional

# Use environment variables for Supabase credentials
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_API_KEY = os.getenv("SUPABASE_API_KEY")

if not SUPABASE_URL or not SUPABASE_API_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_API_KEY environment variables must be set")

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
    Executes device config first to satisfy foreign key dependencies
    """
    devid = data.get("devid")
    uplink_count = data.get("uplink_count")
    
    if not devid:
        logger.error("❌ No device ID provided")
        return

    logger.info(f"📦 Processing data for device {devid}")
    
    client = SupabaseClient()
    total_operations = 0
    success_count = 0
    
    async with aiohttp.ClientSession() as session:
        # Phase 1: Execute device config first (required for foreign keys)
        if data.get("device_config"):
            device_config_success = await client.upsert_device_config(session, devid, data["device_config"])
            total_operations += 1
            if device_config_success:
                success_count += 1
            else:
                logger.warning("⚠️ device_config upsert failed")
        
        # Phase 2: Execute dependent operations concurrently
        dependent_tasks = []
        task_names = []
        
        # Handle activity data
        if data.get("activity"):
            task = client.insert_activity(session, devid, uplink_count, data["activity"])
            dependent_tasks.append(task)
            task_names.append("activity")
        
        # Handle reboot data
        if data.get("reboot"):
            task = client.insert_reboot(session, devid, uplink_count, data["reboot"])
            dependent_tasks.append(task)
            task_names.append("reboot")
        
        # Handle temperature sensor data
        if data.get("temperature") is not None:
            temperature_data = {"temperature": data["temperature"]}
            task = client.insert_sensor_data(session, devid, uplink_count, "temperature", temperature_data)
            dependent_tasks.append(task)
            task_names.append("temperature")
        
        # Handle WiFi sensor data
        if data.get("wifi"):
            wifi_data = {"wifi_scans": data["wifi"]}
            task = client.insert_sensor_data(session, devid, uplink_count, "location", wifi_data)
            dependent_tasks.append(task)
            task_names.append("wifi")
        
        # Execute dependent tasks concurrently
        if dependent_tasks:
            total_operations += len(dependent_tasks)
            
            try:
                outcomes = await asyncio.gather(*dependent_tasks, return_exceptions=True)
                
                for name, outcome in zip(task_names, outcomes):
                    if isinstance(outcome, Exception):
                        logger.error(f"❌ {name} task failed with exception: {outcome}")
                    elif outcome:
                        success_count += 1
                    else:
                        logger.warning(f"⚠️ {name} task returned False")
                
            except Exception as e:
                logger.error(f"❌ Error executing dependent operations for {devid}: {e}")
        
        logger.info(f"📊 Completed {success_count}/{total_operations} operations for device {devid}")
        
        if total_operations == 0:
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