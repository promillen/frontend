import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import useLocalStorage from './useLocalStorage';

export interface DataTypeConfig {
  dataType: string;
  enabled: boolean;
  label: string;
}

export const useDataTypeSelection = () => {
  const [availableDataTypes, setAvailableDataTypes] = useState<string[]>([]);
  const [selectedDataTypes, setSelectedDataTypes] = useLocalStorage<DataTypeConfig[]>('selectedDataTypes', []);
  const [loading, setLoading] = useState(true);

  // Fetch available data types from the database
  const fetchAvailableDataTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('sensor_data')
        .select('data_type')
        .order('data_type');

      if (error) {
        console.error('Error fetching data types:', error);
        return;
      }

      const uniqueTypes = [...new Set(data?.map(item => item.data_type) || [])];
      setAvailableDataTypes(uniqueTypes);

      // Initialize selectedDataTypes if empty
      if (selectedDataTypes.length === 0) {
        const initialConfig = uniqueTypes.map(type => ({
          dataType: type,
          enabled: type === 'location', // Enable location by default
          label: formatDataTypeLabel(type)
        }));
        setSelectedDataTypes(initialConfig);
      }
    } catch (error) {
      console.error('Error fetching data types:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format data type labels for display
  const formatDataTypeLabel = (dataType: string): string => {
    return dataType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Update data type selection
  const updateDataTypeSelection = (dataType: string, enabled: boolean) => {
    setSelectedDataTypes(prev => 
      prev.map(config => 
        config.dataType === dataType 
          ? { ...config, enabled }
          : config
      )
    );
  };

  // Get enabled data types
  const getEnabledDataTypes = () => {
    return selectedDataTypes.filter(config => config.enabled).map(config => config.dataType);
  };

  useEffect(() => {
    fetchAvailableDataTypes();
  }, []);

  return {
    availableDataTypes,
    selectedDataTypes,
    loading,
    updateDataTypeSelection,
    getEnabledDataTypes,
    refreshDataTypes: fetchAvailableDataTypes
  };
};