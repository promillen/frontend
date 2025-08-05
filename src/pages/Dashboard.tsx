
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import MapView from '@/components/MapView';
import DeviceList from '@/components/DeviceList';
import UserManagement from '@/components/UserManagement';
import ErrorBoundary from '@/components/ErrorBoundary';

const Dashboard = () => {
  const { loading: authLoading } = useAuth();
  const { loading: roleLoading } = useUserRole();
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
    <ErrorBoundary>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar activeView={activeView} onViewChange={setActiveView} />
          
          <div className="flex-1 flex flex-col">
            <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <SidebarTrigger className="ml-2" />
            </header>
            
            <main className="flex-1 p-6">
              {activeView === 'map' && (
                <div className="h-full">
                  <div className="mb-4">
                    <h1 className="text-2xl font-bold">Device Locations</h1>
                    <p className="text-muted-foreground">View real-time device locations on the map</p>
                  </div>
                  <div className="bg-card rounded-lg border p-6 h-[600px]">
                    <MapView />
                  </div>
                </div>
              )}
              
              {activeView === 'devices' && <DeviceList />}
              
              {activeView === 'users' && <UserManagement />}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ErrorBoundary>
  );
};

export default Dashboard;
