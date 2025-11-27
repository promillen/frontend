
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useTestRole } from '@/contexts/TestRoleContext';
import { useDeviceSelection } from '@/hooks/useDeviceSelection';
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
import Settings from '@/components/Settings';

const Dashboard = () => {
  const { loading: authLoading } = useAuth();
  const { loading: roleLoading, isActualDeveloper, isTestMode } = useUserRole();
  const { testRole, setTestRole } = useTestRole();
  const [activeView, setActiveView] = useState<'map' | 'devices' | 'users' | 'settings'>('map');
  
  // Device selection with localStorage persistence
  const { selectedDevices, setSelectedDevices, allDevices, isInitialized } = useDeviceSelection();
  
  // Map controls state
  const [activeTileLayer, setActiveTileLayer] = useState('cartodb_voyager');
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
                  {activeView === 'settings' && 'Data Forwarding'}
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
                  <MapTileSelector
                    activeLayer={activeTileLayer}
                    onLayerChange={setActiveTileLayer}
                    isOpen={openMenu === 'tile'}
                    onToggle={() => setOpenMenu(openMenu === 'tile' ? null : 'tile')}
                  />
                  <DeviceFilter
                    selectedDevices={selectedDevices}
                    onDeviceToggle={(deviceId) => {
                      setSelectedDevices(prev => 
                        prev.includes(deviceId) 
                          ? prev.filter(id => id !== deviceId)
                          : [...prev, deviceId]
                      );
                    }}
                    onSelectAll={() => setSelectedDevices(allDevices)}
                    onSelectNone={() => setSelectedDevices([])}
                    isOpen={openMenu === 'filter'}
                    onToggle={() => setOpenMenu(openMenu === 'filter' ? null : 'filter')}
                  />
                  <TimeRangeSelector
                    activeRange={activeTimeRange}
                    onRangeChange={setActiveTimeRange}
                    isOpen={openMenu === 'time'}
                    onToggle={() => setOpenMenu(openMenu === 'time' ? null : 'time')}
                  />
                </>
              )}
            </div>
          </header>
          
          <main className={`flex-1 w-full overflow-x-hidden bg-gradient-to-br from-background to-muted/20 flex flex-col ${activeView === 'map' ? '' : 'p-6'} relative`}>
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
            
            {activeView === 'settings' && <Settings />}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
