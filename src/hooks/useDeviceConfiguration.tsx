import { useState } from 'react';
import useLocalStorage from './useLocalStorage';

export interface DeviceDataConfig {
  deviceId: string;
  enabledDataTypes: string[];
  forwardingEnabled: boolean;
  selectedEndpoints: string[];
}

export const useDeviceConfiguration = () => {
  const [deviceConfigs, setDeviceConfigs] = useLocalStorage<DeviceDataConfig[]>('deviceConfigurations', []);

  // Get configuration for a specific device
  const getDeviceConfig = (deviceId: string): DeviceDataConfig => {
    const existing = deviceConfigs.find(config => config.deviceId === deviceId);
    return existing || {
      deviceId,
      enabledDataTypes: ['location'], // Default to location
      forwardingEnabled: false,
      selectedEndpoints: []
    };
  };

  // Update configuration for a specific device
  const updateDeviceConfig = (deviceId: string, updates: Partial<Omit<DeviceDataConfig, 'deviceId'>>) => {
    setDeviceConfigs(prev => {
      const existing = prev.find(config => config.deviceId === deviceId);
      if (existing) {
        return prev.map(config => 
          config.deviceId === deviceId 
            ? { ...config, ...updates }
            : config
        );
      } else {
        return [...prev, {
          deviceId,
          enabledDataTypes: ['location'],
          forwardingEnabled: false,
          selectedEndpoints: [],
          ...updates
        }];
      }
    });
  };

  // Toggle data type for a device
  const toggleDataType = (deviceId: string, dataType: string) => {
    const config = getDeviceConfig(deviceId);
    const newDataTypes = config.enabledDataTypes.includes(dataType)
      ? config.enabledDataTypes.filter(dt => dt !== dataType)
      : [...config.enabledDataTypes, dataType];
    
    updateDeviceConfig(deviceId, { enabledDataTypes: newDataTypes });
  };

  // Toggle endpoint for a device
  const toggleEndpoint = (deviceId: string, endpointId: string) => {
    const config = getDeviceConfig(deviceId);
    const newEndpoints = config.selectedEndpoints.includes(endpointId)
      ? config.selectedEndpoints.filter(id => id !== endpointId)
      : [...config.selectedEndpoints, endpointId];
    
    updateDeviceConfig(deviceId, { selectedEndpoints: newEndpoints });
  };

  // Toggle forwarding for a device
  const toggleForwarding = (deviceId: string) => {
    const config = getDeviceConfig(deviceId);
    updateDeviceConfig(deviceId, { forwardingEnabled: !config.forwardingEnabled });
  };

  return {
    deviceConfigs,
    getDeviceConfig,
    updateDeviceConfig,
    toggleDataType,
    toggleEndpoint,
    toggleForwarding
  };
};