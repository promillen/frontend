import { useState, useEffect } from 'react';
import useLocalStorage from './useLocalStorage';
import { useToast } from '@/hooks/use-toast';

export interface ForwardingEndpoint {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  dataTypes: string[];
  headers?: Record<string, string>;
  method: 'POST' | 'PUT' | 'PATCH';
}

export const useDataForwarding = () => {
  const [endpoints, setEndpoints] = useLocalStorage<ForwardingEndpoint[]>('forwardingEndpoints', []);
  const [isForwarding, setIsForwarding] = useState(false);
  const { toast } = useToast();

  // Add new endpoint
  const addEndpoint = (endpoint: Omit<ForwardingEndpoint, 'id'>) => {
    const newEndpoint: ForwardingEndpoint = {
      ...endpoint,
      id: crypto.randomUUID()
    };
    setEndpoints(prev => [...prev, newEndpoint]);
    return newEndpoint.id;
  };

  // Update endpoint
  const updateEndpoint = (id: string, updates: Partial<ForwardingEndpoint>) => {
    setEndpoints(prev => 
      prev.map(endpoint => 
        endpoint.id === id 
          ? { ...endpoint, ...updates }
          : endpoint
      )
    );
  };

  // Delete endpoint
  const deleteEndpoint = (id: string) => {
    setEndpoints(prev => prev.filter(endpoint => endpoint.id !== id));
  };

  // Forward data to enabled endpoints
  const forwardData = async (deviceId: string, sensorData: Record<string, any>) => {
    const enabledEndpoints = endpoints.filter(endpoint => endpoint.enabled);
    
    if (enabledEndpoints.length === 0) {
      return;
    }

    setIsForwarding(true);

    const results = await Promise.allSettled(
      enabledEndpoints.map(async (endpoint) => {
        // Filter data based on selected data types
        const filteredData = Object.fromEntries(
          Object.entries(sensorData).filter(([dataType]) => 
            endpoint.dataTypes.includes(dataType)
          )
        );

        if (Object.keys(filteredData).length === 0) {
          return { endpoint: endpoint.name, status: 'skipped', reason: 'No matching data types' };
        }

        const payload = {
          deviceId,
          timestamp: new Date().toISOString(),
          data: filteredData
        };

        const response = await fetch(endpoint.url, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            ...endpoint.headers
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return { endpoint: endpoint.name, status: 'success' };
      })
    );

    // Process results
    const successful = results.filter(result => result.status === 'fulfilled').length;
    const failed = results.filter(result => result.status === 'rejected').length;

    if (successful > 0) {
      toast({
        title: "Data Forwarded",
        description: `Successfully forwarded data to ${successful} endpoint(s)${failed > 0 ? `, ${failed} failed` : ''}`,
      });
    }

    if (failed > 0 && successful === 0) {
      toast({
        title: "Forwarding Failed",
        description: `Failed to forward data to ${failed} endpoint(s)`,
        variant: "destructive",
      });
    }

    setIsForwarding(false);
  };

  // Get enabled endpoints
  const getEnabledEndpoints = () => {
    return endpoints.filter(endpoint => endpoint.enabled);
  };

  return {
    endpoints,
    isForwarding,
    addEndpoint,
    updateEndpoint,
    deleteEndpoint,
    forwardData,
    getEnabledEndpoints
  };
};