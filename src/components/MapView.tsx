
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

interface LocationData {
  id: string;
  device_id: string;
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  temperature?: number;
  battery_level?: number;
  signal_strength?: number;
  timestamp: string;
  devices: {
    dev_id: string;
    name: string;
    hw_version: string;
    sw_version: string;
  };
}

const MapView = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<{ [key: string]: L.Marker }>({});
  const [locations, setLocations] = useState<LocationData[]>([]);
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
        .from('location_data')
        .select(`
          *,
          devices (
            dev_id,
            name,
            hw_version,
            sw_version
          )
        `)
        .order('timestamp', { ascending: false });

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

  const updateMapMarkers = (locationData: LocationData[]) => {
    if (!map.current) return;

    // Clear existing markers
    Object.values(markers.current).forEach(marker => {
      map.current?.removeLayer(marker);
    });
    markers.current = {};

    // Group locations by device and get latest location for each
    const latestLocations = locationData.reduce((acc, location) => {
      const deviceId = location.device_id;
      if (!acc[deviceId] || new Date(location.timestamp) > new Date(acc[deviceId].timestamp)) {
        acc[deviceId] = location;
      }
      return acc;
    }, {} as { [key: string]: LocationData });

    // Add markers for latest locations
    Object.values(latestLocations).forEach(location => {
      const marker = L.marker([location.latitude, location.longitude])
        .addTo(map.current!)
        .bindPopup(`
          <div>
            <h3><strong>${location.devices.name || location.devices.dev_id}</strong></h3>
            <p><strong>Device ID:</strong> ${location.devices.dev_id}</p>
            <p><strong>Location:</strong> ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}</p>
            ${location.altitude ? `<p><strong>Altitude:</strong> ${location.altitude}m</p>` : ''}
            ${location.temperature ? `<p><strong>Temperature:</strong> ${location.temperature}°C</p>` : ''}
            ${location.battery_level ? `<p><strong>Battery:</strong> ${location.battery_level}%</p>` : ''}
            ${location.signal_strength ? `<p><strong>Signal:</strong> ${location.signal_strength}dBm</p>` : ''}
            <p><strong>Last Update:</strong> ${new Date(location.timestamp).toLocaleString()}</p>
            <p><strong>HW Version:</strong> ${location.devices.hw_version}</p>
            <p><strong>SW Version:</strong> ${location.devices.sw_version}</p>
          </div>
        `);

      markers.current[location.device_id] = marker;
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
          table: 'location_data'
        },
        () => {
          console.log('New location data received, refreshing...');
          fetchLocations();
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
