
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import AppSidebar from '@/components/AppSidebar';
import MapView from '@/components/MapView';
import DeviceList from '@/components/DeviceList';
import UserManagement from '@/components/UserManagement';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

const Dashboard = () => {
  const { loading: authLoading } = useAuth();
  const { loading: roleLoading, isDeveloper } = useUserRole();
  const [activeView, setActiveView] = useState<'map' | 'devices' | 'users'>('map');

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
          <header className="h-14 flex items-center justify-between border-b bg-background/95 header-backdrop px-6 shadow-sm">
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
            
            {/* Docs Button for Developers */}
            <div className="flex items-center space-x-3">
              {isDeveloper && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open('https://docs.moc-iot.com', '_blank')}
                  className="gap-2 layout-transition hover:scale-105 active:scale-95 bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 border-blue-200"
                >
                  <ExternalLink className="h-4 w-4" />
                  <span className="hidden sm:inline">Docs</span>
                </Button>
              )}
            </div>
          </header>
          
          <main className={`flex-1 bg-gradient-to-br from-background to-muted/20 flex flex-col ${activeView === 'map' ? '' : 'p-6'}`}>
            {activeView === 'map' && (
              <div className="flex-1">
                <MapView />
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
