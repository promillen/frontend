import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import '../styles/map-clusters.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Maximize2, Minimize2, RefreshCw, MapPin } from 'lucide-react';
import LoadingSkeleton from './LoadingSkeleton';
import ErrorBoundary from './ErrorBoundary';

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
    last_seen?: string;
    battery_level?: number;
  };
}

const MapView = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markersCluster = useRef<L.MarkerClusterGroup | null>(null);
  const [locations, setLocations] = useState<LocationSensorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { toast } = useToast();

  // Create custom markers for different device states
  const createCustomIcon = (status: 'online' | 'warning' | 'offline') => {
    const colors = {
      online: '#10b981', // green
      warning: '#f59e0b', // yellow
      offline: '#ef4444', // red
    };

    return L.divIcon({
      className: 'custom-marker',
      html: `
        <div style="
          width: 24px;
          height: 24px;
          background-color: ${colors[status]};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            width: 8px;
            height: 8px;
            background-color: white;
            border-radius: 50%;
          "></div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12],
    });
  };

  const getDeviceStatus = (lastSeen: string): 'online' | 'warning' | 'offline' => {
    const lastSeenDate = new Date(lastSeen);
    const now = new Date();
    const diffMinutes = (now.getTime() - lastSeenDate.getTime()) / (1000 * 60);
    
    if (diffMinutes <= 30) return 'online';
    if (diffMinutes <= 120) return 'warning';
    return 'offline';
  };

  useEffect(() => {
    if (!mapRef.current || map.current) return;

    // Initialize map
    map.current = L.map(mapRef.current).setView([55.6761, 12.5683], 10); // Default to Copenhagen

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map.current);

    // Initialize marker cluster group
    markersCluster.current = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 80,
      iconCreateFunction: (cluster) => {
        const childCount = cluster.getChildCount();
        let className = 'marker-cluster-';
        
        if (childCount < 10) {
          className += 'small';
        } else if (childCount < 100) {
          className += 'medium';
        } else {
          className += 'large';
        }
        
        return L.divIcon({
          html: `<div class="cluster-inner">${childCount}</div>`,
          className: className,
          iconSize: [40, 40]
        });
      }
    });
    
    map.current.addLayer(markersCluster.current);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      markersCluster.current = null;
    };
  }, []);

  const fetchLocations = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase
        .from('sensor_data')
        .select(`
          *,
          device_config (
            devid,
            name,
            hw_version,
            sw_version,
            last_seen,
            battery_level
          )
        `)
        .eq('data_type', 'location')
        .order('created_at', { ascending: false });

      if (error) {
        setError('Failed to fetch device locations');
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
      setLastUpdate(new Date());
    } catch (err) {
      setError('Failed to fetch device locations');
      console.error('Error fetching locations:', err);
      toast({
        title: "Error",
        description: "Failed to fetch device locations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateMapMarkers = (locationData: LocationSensorData[]) => {
    if (!map.current || !markersCluster.current) return;

    // Clear existing markers
    markersCluster.current.clearLayers();

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

      const deviceConfig = location.device_config;
      const status = deviceConfig?.last_seen ? getDeviceStatus(deviceConfig.last_seen) : 'offline';
      const icon = createCustomIcon(status);

      const marker = L.marker([lat, lng], { icon })
        .bindPopup(`
          <div class="p-3 min-w-[250px]">
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-semibold text-lg">${deviceConfig?.name || location.devid}</h3>
              <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                ${status === 'online' ? 'bg-green-100 text-green-800' : 
                  status === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'}">
                ${status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>
            <div class="space-y-1 text-sm">
              <p><strong>Device ID:</strong> ${location.devid}</p>
              <p><strong>Location:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}</p>
              ${location.data.altitude ? `<p><strong>Altitude:</strong> ${location.data.altitude}m</p>` : ''}
              ${location.data.accuracy ? `<p><strong>Accuracy:</strong> ${location.data.accuracy}m</p>` : ''}
              ${deviceConfig?.battery_level ? `<p><strong>Battery:</strong> ${deviceConfig.battery_level}%</p>` : ''}
              <p><strong>Last Update:</strong> ${new Date(location.created_at).toLocaleString()}</p>
              ${deviceConfig ? `
                <p><strong>HW Version:</strong> ${deviceConfig.hw_version}</p>
                <p><strong>SW Version:</strong> ${deviceConfig.sw_version}</p>
              ` : ''}
            </div>
          </div>
        `);

      markersCluster.current.addLayer(marker);
    });

    // Fit map to show all markers
    if (markersCluster.current.getLayers().length > 0) {
      map.current.fitBounds(markersCluster.current.getBounds(), { padding: [20, 20] });
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const refreshData = () => {
    fetchLocations();
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

  if (loading) {
    return <LoadingSkeleton type="map" />;
  }

  if (error) {
    return (
      <Card className="p-6 text-center">
        <div className="space-y-4">
          <MapPin className="w-12 h-12 mx-auto text-muted-foreground" />
          <div>
            <h3 className="text-lg font-medium">Unable to load map</h3>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <Button onClick={refreshData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <ErrorBoundary>
      <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'w-full h-full'}`}>
        {/* Map Controls */}
        <div className="absolute top-4 right-4 z-[1000] flex gap-2">
          <Button variant="outline" size="sm" onClick={refreshData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </Button>
        </div>

        {/* Map Status */}
        {lastUpdate && (
          <div className="absolute bottom-4 left-4 z-[1000]">
            <Badge variant="outline" className="bg-white/90 backdrop-blur-sm">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </Badge>
          </div>
        )}

        {/* Map Container */}
        <div 
          ref={mapRef} 
          className={`w-full h-full ${isFullscreen ? 'h-screen' : 'min-h-[500px]'} rounded-lg`} 
        />

      </div>
    </ErrorBoundary>
  );
};

export default MapView;