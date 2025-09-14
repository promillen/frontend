import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface SensorProfile {
  id: string;
  name: string;
  description: string | null;
  application_type: 'geotracking' | 'agriculture' | 'environmental' | 'industrial' | 'custom';
  config: Record<string, any>;
  dashboard_layout: Array<Record<string, any>>;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface SensorDataType {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  unit: string | null;
  data_schema: Record<string, any>;
  visualization_config: Record<string, any>;
  created_at: string;
}

interface ApplicationContextType {
  currentProfile: SensorProfile | null;
  setCurrentProfile: (profile: SensorProfile | null) => void;
  sensorProfiles: SensorProfile[];
  sensorDataTypes: SensorDataType[];
  loading: boolean;
  refreshProfiles: () => Promise<void>;
}

const ApplicationContext = createContext<ApplicationContextType | undefined>(undefined);

export const useApplicationContext = () => {
  const context = useContext(ApplicationContext);
  if (context === undefined) {
    throw new Error('useApplicationContext must be used within an ApplicationProvider');
  }
  return context;
};

export const ApplicationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentProfile, setCurrentProfile] = useState<SensorProfile | null>(null);
  const [sensorProfiles, setSensorProfiles] = useState<SensorProfile[]>([]);
  const [sensorDataTypes, setSensorDataTypes] = useState<SensorDataType[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSensorProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('sensor_profiles')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const profiles: SensorProfile[] = (data || []).map(profile => ({
        ...profile,
        config: (profile.config as any) || {},
        dashboard_layout: Array.isArray(profile.dashboard_layout) 
          ? (profile.dashboard_layout as Record<string, any>[]) 
          : []
      }));
      
      setSensorProfiles(profiles);
      
      // Set default profile if none selected
      if (!currentProfile && profiles.length > 0) {
        const defaultProfile = profiles.find(p => p.application_type === 'geotracking') || profiles[0];
        setCurrentProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error fetching sensor profiles:', error);
    }
  };

  const fetchSensorDataTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('sensor_data_types')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      
      const dataTypes: SensorDataType[] = (data || []).map(dataType => ({
        ...dataType,
        data_schema: (dataType.data_schema as any) || {},
        visualization_config: (dataType.visualization_config as any) || {}
      }));
      
      setSensorDataTypes(dataTypes);
    } catch (error) {
      console.error('Error fetching sensor data types:', error);
    }
  };

  const refreshProfiles = async () => {
    setLoading(true);
    await Promise.all([fetchSensorProfiles(), fetchSensorDataTypes()]);
    setLoading(false);
  };

  useEffect(() => {
    refreshProfiles();
  }, []);

  const value: ApplicationContextType = {
    currentProfile,
    setCurrentProfile,
    sensorProfiles,
    sensorDataTypes,
    loading,
    refreshProfiles,
  };

  return (
    <ApplicationContext.Provider value={value}>
      {children}
    </ApplicationContext.Provider>
  );
};