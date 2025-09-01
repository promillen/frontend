
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useTestRole } from '@/contexts/TestRoleContext';
import { supabase } from '@/integrations/supabase/client';
import AppSidebar from '@/components/AppSidebar';
import MapView from '@/components/MapView';
import DeviceList from '@/components/DeviceList';
import UserManagement from '@/components/UserManagement';
import MapTileSelector, { TILE_LAYERS } from '@/components/MapTileSelector';
import DeviceFilter from '@/components/DeviceFilter';
import TimeRangeSelector from '@/components/TimeRangeSelector';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const Dashboard = () => {
  const { loading: authLoading } = useAuth();
  const { loading: roleLoading, isActualDeveloper, isTestMode } = useUserRole();
  const { testRole, setTestRole } = useTestRole();
  const [activeView, setActiveView] = useState<'map' | 'devices' | 'users'>('map');
  
  // Map controls state
  const [activeTileLayer, setActiveTileLayer] = useState('cartodb_voyager');
  const [selectedDevices, setSelectedDevices] = useState<string[]>([]);
  const [activeTimeRange, setActiveTimeRange] = useState('none');
  const [openMenu, setOpenMenu] = useState<'tile' | 'filter' | 'time' | null>(null);

  // Close dropdown when clicking outside or when view changes
  useEffect(() => {
    const handleClickOutside = () => {
      setOpenMenu(null);
    };
    
    if (openMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openMenu]);

  // Close dropdown when view changes  
  useEffect(() => {
    setOpenMenu(null);
  }, [activeView]);

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeView={activeView} onViewChange={setActiveView} />
        
        <div className="flex-1 flex flex-col content-fade-in">
          <header className="h-14 flex items-center justify-between border-b bg-background/95 header-backdrop px-6 shadow-sm relative z-50">
            <div className="flex items-center space-x-4">
              <SidebarTrigger className="layout-transition hover:scale-110 active:scale-95" />
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium">
                  {activeView === 'map' && 'Device Locations'}
                  {activeView === 'devices' && 'Devices'}
                  {activeView === 'users' && 'User Management'}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-muted-foreground">IoT Dashboard</span>
                </div>
              </div>
            </div>
            
            {/* Map Controls */}
            <div className="flex items-center space-x-3 relative">
              {/* Map Controls - only show for map view */}
              {activeView === 'map' && (
                <>
                  <div onClick={(e) => e.stopPropagation()}>
                    <MapTileSelector
                      activeLayer={activeTileLayer}
                      onLayerChange={setActiveTileLayer}
                      isOpen={openMenu === 'tile'}
                      onToggle={() => setOpenMenu(openMenu === 'tile' ? null : 'tile')}
                    />
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DeviceFilter
                      selectedDevices={selectedDevices}
                      onDeviceToggle={(deviceId) => {
                        setSelectedDevices(prev => 
                          prev.includes(deviceId) 
                            ? prev.filter(id => id !== deviceId)
                            : [...prev, deviceId]
                        );
                      }}
                      onSelectAll={() => {
                        // Fetch all devices and select them
                        const fetchAndSelectAll = async () => {
                          try {
                            const { data } = await supabase
                              .from('device_config')
                              .select('devid');
                            if (data) {
                              const allDeviceIds = data.map(d => d.devid);
                              setSelectedDevices(allDeviceIds);
                            }
                          } catch (error) {
                            console.error('Error fetching devices:', error);
                          }
                        };
                        fetchAndSelectAll();
                      }}
                      onSelectNone={() => setSelectedDevices([])}
                      isOpen={openMenu === 'filter'}
                      onToggle={() => setOpenMenu(openMenu === 'filter' ? null : 'filter')}
                    />
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <TimeRangeSelector
                      activeRange={activeTimeRange}
                      onRangeChange={setActiveTimeRange}
                      isOpen={openMenu === 'time'}
                      onToggle={() => setOpenMenu(openMenu === 'time' ? null : 'time')}
                    />
                  </div>
                </>
              )}
            </div>
          </header>
          
          <main className={`flex-1 bg-gradient-to-br from-background to-muted/20 flex flex-col ${activeView === 'map' ? '' : 'p-6'} relative`}>
            {activeView === 'map' && (
              <div className="flex-1">
                <MapView 
                  activeTileLayer={activeTileLayer}
                  selectedDevices={selectedDevices}
                  activeTimeRange={activeTimeRange}
                  externalControls={true}
                />
              </div>
            )}
            
            {activeView === 'devices' && <DeviceList />}
            
            {activeView === 'users' && <UserManagement />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
