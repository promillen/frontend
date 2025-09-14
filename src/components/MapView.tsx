import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import MapTileSelector, { TILE_LAYERS } from './MapTileSelector';
import DeviceFilter from './DeviceFilter';
import TimeRangeSelector, { TIME_RANGES } from './TimeRangeSelector';
import DeviceLogViewer from './DeviceLogViewer';
import { Button } from './ui/button';
import { Activity } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

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
    battery_level?: number;
  };
}

interface MapViewProps {
  activeTileLayer?: string;
  selectedDevices?: string[];
  activeTimeRange?: string;
  externalControls?: boolean;
}

const MapView = ({ 
  activeTileLayer: externalActiveTileLayer,
  selectedDevices: externalSelectedDevices,
  activeTimeRange: externalActiveTimeRange,
  externalControls = false
}: MapViewProps = {}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const markers = useRef<{ [key: string]: L.Marker }>({});
  const trails = useRef<{ [key: string]: L.Polyline }>({});
  const currentTileLayer = useRef<L.TileLayer | null>(null);
  
  const [locations, setLocations] = useState<LocationSensorData[]>([]);
  const [internalActiveTileLayer, setInternalActiveTileLayer] = useState('cartodb_voyager');
  const [internalSelectedDevices, setInternalSelectedDevices] = useState<string[]>([]);
  const [allDevices, setAllDevices] = useState<string[]>([]);
  const [internalActiveTimeRange, setInternalActiveTimeRange] = useState('none');
  const [selectedDeviceForLogs, setSelectedDeviceForLogs] = useState<string | null>(null);
  const [isLogViewerOpen, setIsLogViewerOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<'tile' | 'filter' | 'time' | null>(null);
  
  // Use external state if provided, otherwise use internal state
  const activeTileLayer = externalControls ? externalActiveTileLayer! : internalActiveTileLayer;
  const selectedDevices = externalControls ? externalSelectedDevices! : internalSelectedDevices;
  const activeTimeRange = externalControls ? externalActiveTimeRange! : internalActiveTimeRange;
  
  const { toast } = useToast();
  const { role: userRole, canModifyData } = useUserRole();

  useEffect(() => {
    if (!mapRef.current || map.current) return;

    // Initialize map
    map.current = L.map(mapRef.current).setView([55.6761, 12.5683], 10); // Default to Copenhagen

    // Add initial tile layer
    const initialLayer = TILE_LAYERS.find(layer => layer.id === activeTileLayer);
    if (initialLayer) {
      currentTileLayer.current = L.tileLayer(initialLayer.url, {
        attribution: initialLayer.attribution
      }).addTo(map.current);
    }

    // Fix for map sizing issues - invalidate size after container is ready
    const handleResize = () => {
      if (map.current) {
        map.current.invalidateSize();
      }
    };

    // Initial resize
    setTimeout(handleResize, 100);

    // Add resize observer to handle container size changes
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(handleResize, 50);
    });

    if (mapRef.current) {
      resizeObserver.observe(mapRef.current);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      resizeObserver.disconnect();
    };
  }, []);

  const changeTileLayer = (layerId: string) => {
    if (!map.current) return;

    const layer = TILE_LAYERS.find(l => l.id === layerId);
    if (!layer) return;

    // Remove current tile layer
    if (currentTileLayer.current) {
      map.current.removeLayer(currentTileLayer.current);
    }

    // Add new tile layer
    currentTileLayer.current = L.tileLayer(layer.url, {
      attribution: layer.attribution
    }).addTo(map.current);

    // Update internal state only if not using external controls
    if (!externalControls) {
      setInternalActiveTileLayer(layerId);
    }
  };

  const fetchLocations = async (timeRangeHours = 0) => {
    try {
      let query = supabase
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

      // Apply time range filter
      if (timeRangeHours > 0) {
        const cutoffTime = new Date(Date.now() - timeRangeHours * 60 * 60 * 1000).toISOString();
        query = query.gte('created_at', cutoffTime);
      }

      const { data, error } = await query;

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
      
      // Extract all unique device IDs
      const deviceIds = [...new Set((data || []).map(location => location.devid))];
      setAllDevices(deviceIds);
      
      // Initialize selected devices if empty and not using external controls
      if (!externalControls && internalSelectedDevices.length === 0) {
        setInternalSelectedDevices(deviceIds);
      }
      
      updateMapMarkers(data || [], timeRangeHours);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast({
        title: "Error",
        description: "Failed to fetch device locations",
        variant: "destructive",
      });
    }
  };

  const updateMapMarkers = (locationData: LocationSensorData[], timeRangeHours = 0) => {
    if (!map.current) return;

    // Clear existing markers and trails
    Object.values(markers.current).forEach(marker => {
      map.current?.removeLayer(marker);
    });
    Object.values(trails.current).forEach(trail => {
      map.current?.removeLayer(trail);
    });
    markers.current = {};
    trails.current = {};

    // Filter by selected devices
    const filteredData = locationData.filter(location => 
      selectedDevices.includes(location.devid)
    );

    if (timeRangeHours === 0) {
      // Show current positions only
      const latestLocations = filteredData.reduce((acc, location) => {
        const deviceId = location.devid;
        if (!acc[deviceId] || new Date(location.created_at) > new Date(acc[deviceId].created_at)) {
          acc[deviceId] = location;
        }
        return acc;
      }, {} as { [key: string]: LocationSensorData });

      // Add markers for latest locations
      Object.values(latestLocations).forEach(location => {
        addMarker(location);
      });
    } else {
      // Show movement trails
      const deviceGroups = filteredData.reduce((acc, location) => {
        if (!acc[location.devid]) {
          acc[location.devid] = [];
        }
        acc[location.devid].push(location);
        return acc;
      }, {} as { [key: string]: LocationSensorData[] });

      Object.entries(deviceGroups).forEach(([deviceId, deviceLocations]) => {
        // Sort by timestamp
        deviceLocations.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        
        // Create trail
        const points: L.LatLng[] = [];
        deviceLocations.forEach(location => {
          if (!location.data || typeof location.data !== 'object') return;
          
          const lat = location.data.lat || location.data.latitude;
          const lng = location.data.lng || location.data.longitude;
          
          if (lat && lng) {
            points.push(new L.LatLng(lat, lng));
          }
        });

        if (points.length > 1) {
          // Create trail polyline
          const trail = L.polyline(points, {
            color: getDeviceColor(deviceId),
            weight: 3,
            opacity: 0.7
          }).addTo(map.current!);
          
          trails.current[deviceId] = trail;
        }

        // Add marker for latest position
        if (deviceLocations.length > 0) {
          addMarker(deviceLocations[deviceLocations.length - 1], true);
        }
      });
    }

    // Fit map to show all markers
    const allMarkers = Object.values(markers.current);
    if (allMarkers.length > 0) {
      const group = new L.FeatureGroup(allMarkers);
      map.current.fitBounds(group.getBounds(), { padding: [20, 20] });
    }
  };

  const addMarker = (location: LocationSensorData, isTrailEnd = false) => {
    if (!location.data || typeof location.data !== 'object') return;
    
    const lat = location.data.lat || location.data.latitude;
    const lng = location.data.lng || location.data.longitude;
    
    if (!lat || !lng) return;

    // Format date as 24-hour time and dd/mm/yyyy
    const date = new Date(location.created_at);
    const formattedTime = date.toLocaleTimeString('en-GB', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    const formattedDate = date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });

    const trackerName = location.device_config?.name || location.devid;
    const batteryLevel = location.device_config?.battery_level;

    const marker = L.marker([lat, lng])
      .addTo(map.current!)
      .bindPopup(`
        <div style="
          font-family: system-ui, -apple-system, sans-serif;
          min-width: 280px;
          margin: 0;
          padding: 0;
        ">
          <!-- Header -->
          <div style="
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 12px 16px;
            margin: -12px -12px 16px -12px;
            font-weight: 600;
            font-size: 16px;
            color: #1e293b;
            display: flex;
            align-items: center;
            justify-content: space-between;
          ">
            <span>${trackerName}</span>
            ${batteryLevel ? `
              <div style="
                background: #e2e8f0;
                padding: 4px 8px;
                border-radius: 6px;
                font-size: 12px;
                color: #64748b;
                font-weight: 500;
              ">
                ${batteryLevel}%
              </div>
            ` : ''}
          </div>

          <!-- Content Grid -->
          <div style="
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
            margin-bottom: 16px;
          ">
            <!-- Device Info -->
            <div style="
              background: #f8fafc;
              padding: 12px;
              border-radius: 8px;
              border-left: 3px solid #667eea;
            ">
              <div style="
                font-size: 11px;
                color: #64748b;
                text-transform: uppercase;
                font-weight: 600;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
              ">Device ID</div>
              <div style="
                font-size: 13px;
                font-weight: 500;
                color: #334155;
                font-family: monospace;
              ">${location.devid}</div>
            </div>

            <!-- Last Update -->
            <div style="
              background: #f8fafc;
              padding: 12px;
              border-radius: 8px;
              border-left: 3px solid #10b981;
            ">
              <div style="
                font-size: 11px;
                color: #64748b;
                text-transform: uppercase;
                font-weight: 600;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
              ">Last Update</div>
              <div style="
                font-size: 13px;
                font-weight: 500;
                color: #334155;
              ">${formattedTime}</div>
              <div style="
                font-size: 12px;
                color: #64748b;
              ">${formattedDate}</div>
            </div>

            ${location.data.altitude ? `
              <!-- Altitude -->
              <div style="
                background: #f8fafc;
                padding: 12px;
                border-radius: 8px;
                border-left: 3px solid #f59e0b;
              ">
                <div style="
                  font-size: 11px;
                  color: #64748b;
                  text-transform: uppercase;
                  font-weight: 600;
                  letter-spacing: 0.5px;
                  margin-bottom: 4px;
                ">Altitude</div>
                <div style="
                  font-size: 13px;
                  font-weight: 500;
                  color: #334155;
                ">${location.data.altitude}m</div>
              </div>
            ` : ''}

            ${location.data.accuracy ? `
              <!-- Accuracy -->
              <div style="
                background: #f8fafc;
                padding: 12px;
                border-radius: 8px;
                border-left: 3px solid #8b5cf6;
              ">
                <div style="
                  font-size: 11px;
                  color: #64748b;
                  text-transform: uppercase;
                  font-weight: 600;
                  letter-spacing: 0.5px;
                  margin-bottom: 4px;
                ">Accuracy</div>
                <div style="
                  font-size: 13px;
                  font-weight: 500;
                  color: #334155;
                ">±${location.data.accuracy}m</div>
              </div>
            ` : ''}
          </div>

          ${canModifyData ? `
            <!-- Action Button -->
            <div style="
              border-top: 1px solid #e2e8f0;
              padding-top: 12px;
              margin-top: 16px;
            ">
              <button 
                onclick="window.showDeviceLogs('${location.devid}')"
                style="
                  background: #667eea;
                  color: white;
                  border: none;
                  padding: 8px 16px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  cursor: pointer;
                  width: 100%;
                  transition: all 0.2s ease;
                "
                onmouseover="this.style.background='#5a67d8'"
                onmouseout="this.style.background='#667eea'"
              >
                View Live Logs
              </button>
            </div>
          ` : ''}
        </div>
      `);

    markers.current[location.devid] = marker;
  };

  const getDeviceColor = (deviceId: string) => {
    // Generate consistent color for each device
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    const index = Array.from(deviceId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const handleDeviceToggle = (deviceId: string) => {
    if (externalControls) return; // Don't handle if using external controls
    
    setInternalSelectedDevices(prev => {
      const updated = prev.includes(deviceId)
        ? prev.filter(id => id !== deviceId)
        : [...prev, deviceId];
      return updated;
    });
  };

  const handleSelectAll = () => {
    if (externalControls) return; // Don't handle if using external controls
    setInternalSelectedDevices([...allDevices]);
  };

  const handleSelectNone = () => {
    if (externalControls) return; // Don't handle if using external controls
    setInternalSelectedDevices([]);
  };

  const handleTimeRangeChange = (rangeId: string) => {
    if (externalControls) return; // Don't handle if using external controls
    
    setInternalActiveTimeRange(rangeId);
    const range = TIME_RANGES.find(r => r.id === rangeId);
    if (range) {
      fetchLocations(range.hours);
    }
  };

  // Global function to show device logs from popup
  useEffect(() => {
    (window as any).showDeviceLogs = (deviceId: string) => {
      setSelectedDeviceForLogs(deviceId);
      setIsLogViewerOpen(true);
    };

    return () => {
      delete (window as any).showDeviceLogs;
    };
  }, []);

  useEffect(() => {
    fetchLocations(TIME_RANGES.find(r => r.id === activeTimeRange)?.hours || 0);

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
            fetchLocations(TIME_RANGES.find(r => r.id === activeTimeRange)?.hours || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (locations.length > 0) {
      updateMapMarkers(locations, TIME_RANGES.find(r => r.id === activeTimeRange)?.hours || 0);
    }
  }, [selectedDevices]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapRef} className="w-full h-full" />
      
      {/* Map Controls - only show if not using external controls */}
      {!externalControls && (
        <>
          <MapTileSelector 
            activeLayer={activeTileLayer}
            onLayerChange={changeTileLayer}
            isOpen={openMenu === 'tile'}
            onToggle={() => setOpenMenu(openMenu === 'tile' ? null : 'tile')}
          />
          
          <DeviceFilter
            selectedDevices={selectedDevices}
            onDeviceToggle={handleDeviceToggle}
            onSelectAll={handleSelectAll}
            onSelectNone={handleSelectNone}
            isOpen={openMenu === 'filter'}
            onToggle={() => setOpenMenu(openMenu === 'filter' ? null : 'filter')}
          />
          
          <TimeRangeSelector
            activeRange={activeTimeRange}
            onRangeChange={handleTimeRangeChange}
            isOpen={openMenu === 'time'}
            onToggle={() => setOpenMenu(openMenu === 'time' ? null : 'time')}
          />
        </>
      )}

      {/* Device Logs for Developers, Admins, and Moderators */}
      {canModifyData && (
        <DeviceLogViewer
          deviceId={selectedDeviceForLogs}
          isOpen={isLogViewerOpen}
          onClose={() => {
            setIsLogViewerOpen(false);
            setSelectedDeviceForLogs(null);
          }}
        />
      )}
    </div>
  );
};

export default MapView;