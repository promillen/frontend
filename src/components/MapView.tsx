import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationSensorData {
  id: string;
  devid: string;
  data_type: string;
  data: any; // JSONB data from Supabase
  created_at: string;
  device_config: {
    devid: string;
    name: string;
    hw_version: string;
    sw_version: string;
  };
}

const MapView = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<{ [key: string]: L.Marker }>({});
  const [locations, setLocations] = useState<LocationSensorData[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (!mapRef.current || map.current) return;

    // Initialize map
    map.current = L.map(mapRef.current).setView([55.6761, 12.5683], 10); // Default to Copenhagen

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map.current);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  const fetchLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('sensor_data')
        .select(`
          *,
          device_config (
            devid,
            name,
            hw_version,
            sw_version
          )
        `)
        .eq('data_type', 'location')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching locations:', error);
        toast({
          title: "Error",
          description: "Failed to fetch device locations",
          variant: "destructive",
        });
        return;
      }

      setLocations(data || []);
      updateMapMarkers(data || []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch device locations",
        variant: "destructive",
      });
    }
  };

  const updateMapMarkers = (locationData: LocationSensorData[]) => {
    if (!map.current) return;

    // Clear existing markers
    Object.values(markers.current).forEach(marker => {
      map.current?.removeLayer(marker);
    });
    markers.current = {};

    // Group locations by device and get latest location for each
    const latestLocations = locationData.reduce((acc, location) => {
      const deviceId = location.devid;
      if (!acc[deviceId] || new Date(location.created_at) > new Date(acc[deviceId].created_at)) {
        acc[deviceId] = location;
      }
      return acc;
    }, {} as { [key: string]: LocationSensorData });

    // Add markers for latest locations
    Object.values(latestLocations).forEach(location => {
      if (!location.data || typeof location.data !== 'object') return;
      
      // Handle both lat/lng and latitude/longitude formats
      const lat = location.data.lat || location.data.latitude;
      const lng = location.data.lng || location.data.longitude;
      
      if (!lat || !lng) return;

      const marker = L.marker([lat, lng])
        .addTo(map.current!)
        .bindPopup(`
          <div>
            <h3><strong>${location.device_config?.name || location.devid}</strong></h3>
            <p><strong>Device ID:</strong> ${location.devid}</p>
            <p><strong>Location:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
            ${location.data.altitude ? `<p><strong>Altitude:</strong> ${location.data.altitude}m</p>` : ''}
            ${location.data.accuracy ? `<p><strong>Accuracy:</strong> ${location.data.accuracy}m</p>` : ''}
            <p><strong>Last Update:</strong> ${new Date(location.created_at).toLocaleString()}</p>
            ${location.device_config ? `
              <p><strong>HW Version:</strong> ${location.device_config.hw_version}</p>
              <p><strong>SW Version:</strong> ${location.device_config.sw_version}</p>
            ` : ''}
          </div>
        `);

      markers.current[location.devid] = marker;
    });

    // Fit map to show all markers
    if (Object.keys(markers.current).length > 0) {
      const group = new L.FeatureGroup(Object.values(markers.current));
      map.current.fitBounds(group.getBounds(), { padding: [20, 20] });
    }
  };

  useEffect(() => {
    fetchLocations();

    // Set up real-time subscription for location updates
    const channel = supabase
      .channel('location-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sensor_data'
        },
        (payload) => {
          if (payload.new && payload.new.data_type === 'location') {
            console.log('New location data received, refreshing...');
            fetchLocations();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="w-full h-full">
      <div ref={mapRef} className="w-full h-full min-h-[500px] rounded-lg" />
    </div>
  );
};

export default MapView;