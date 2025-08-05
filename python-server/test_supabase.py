#!/usr/bin/env python3
"""
Test script to verify Supabase integration
"""
import asyncio
import logging
from store_to_supabase import store_uplink_to_supabase

# Setup logging
logging.basicConfig(level=logging.INFO)

async def test_device_config():
    """Test device configuration insertion"""
    print("🧪 Testing device config insertion...")
    
    test_data = {
        "devid": "test_device_001",
        "uplink_count": 42,
        "device_config": {
            "heartbeat_interval": 300,
            "iccid": "89461234567890123456",
            "hw_version": "v1.2.3",
            "sw_version": "v2.1.0",
            "application_mode": "WIFI"
        }
    }
    
    await store_uplink_to_supabase(test_data)

async def test_activity_data():
    """Test activity data insertion"""
    print("🧪 Testing activity data insertion...")
    
    test_data = {
        "devid": "test_device_001",
        "uplink_count": 43,
        "activity": {
            "sleep": 85,
            "modem": 10,
            "gnss": 3,
            "wifi": 2,
            "other": 0
        }
    }
    
    await store_uplink_to_supabase(test_data)

async def test_reboot_data():
    """Test reboot data insertion"""
    print("🧪 Testing reboot data insertion...")
    
    test_data = {
        "devid": "test_device_001",
        "uplink_count": 44,
        "reboot": {
            "reason": "WATCHDOG_RESET",
            "file": "main.c",
            "line": 123
        }
    }
    
    await store_uplink_to_supabase(test_data)

async def test_sensor_data():
    """Test sensor data insertion"""
    print("🧪 Testing sensor data insertion...")
    
    test_data = {
        "devid": "test_device_001",
        "uplink_count": 45,
        "temperature": 23.5,
        "wifi": [
            {"mac": "aa:bb:cc:dd:ee:ff", "rssi": -45},
            {"mac": "11:22:33:44:55:66", "rssi": -67},
            {"mac": "99:88:77:66:55:44", "rssi": -78}
        ]
    }
    
    await store_uplink_to_supabase(test_data)

async def test_combined_data():
    """Test combined data insertion (all types at once)"""
    print("🧪 Testing combined data insertion...")
    
    test_data = {
        "devid": "test_device_002",
        "uplink_count": 100,
        "device_config": {
            "heartbeat_interval": 600,
            "hw_version": "v1.3.0",
            "sw_version": "v2.2.0"
        },
        "activity": {
            "sleep": 80,
            "modem": 15,
            "gnss": 5
        },
        "temperature": 21.8,
        "wifi": [
            {"mac": "ab:cd:ef:12:34:56", "rssi": -52}
        ]
    }
    
    await store_uplink_to_supabase(test_data)

async def main():
    """Run all tests"""
    print("🚀 Starting Supabase integration tests...")
    
    try:
        await test_device_config()
        await asyncio.sleep(1)
        
        await test_activity_data()
        await asyncio.sleep(1)
        
        await test_reboot_data()
        await asyncio.sleep(1)
        
        await test_sensor_data()
        await asyncio.sleep(1)
        
        await test_combined_data()
        
        print("✅ All tests completed!")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())