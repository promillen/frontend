
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useLayout } from '@/contexts/LayoutContext';
import Navbar from '@/components/Navbar';
import AppSidebar from '@/components/AppSidebar';
import MapView from '@/components/MapView';
import DeviceList from '@/components/DeviceList';
import UserManagement from '@/components/UserManagement';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Layout, LayoutGrid } from 'lucide-react';

const Dashboard = () => {
  const { loading: authLoading } = useAuth();
  const { loading: roleLoading } = useUserRole();
  const { layout } = useLayout();
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

  // Classic Layout (Original working layout)
  const ClassicLayout = () => (
    <div className="min-h-screen bg-gray-50">
      <Navbar activeView={activeView} onViewChange={setActiveView} />
      
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {activeView === 'map' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-bold mb-4">Device Locations</h1>
            <MapView />
          </div>
        )}
        
        {activeView === 'devices' && <DeviceList />}
        
        {activeView === 'users' && <UserManagement />}
      </main>
    </div>
  );

  // Modern Layout (New sidebar layout)
  const ModernLayout = () => {
    const { toggleLayout, layout } = useLayout();
    
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background">
          <AppSidebar activeView={activeView} onViewChange={setActiveView} />
          
          <div className="flex-1 flex flex-col content-fade-in">
            <header className="h-14 flex items-center justify-between border-b bg-background/95 header-backdrop px-6 shadow-sm">
              <div className="flex items-center space-x-4">
                <SidebarTrigger className="layout-transition hover:scale-110 active:scale-95" />
                <div className="flex items-center space-x-4">
                  <span className="text-sm font-medium">IoT Tracker Hub</span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-muted-foreground">Modern Layout</span>
                  </div>
                </div>
              </div>
              
              {/* Layout Toggle in Modern Layout */}
              <div className="flex items-center space-x-3">
                <span className="text-xs text-muted-foreground">Layout:</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={toggleLayout}
                  className="gap-2 layout-transition hover:scale-105 active:scale-95 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200"
                >
                  <Layout className="h-4 w-4" />
                  <span className="hidden sm:inline">Classic</span>
                </Button>
              </div>
            </header>
            
            <main className="flex-1 p-6 bg-gradient-to-br from-background to-muted/20">
              {activeView === 'map' && (
                <div className="h-full space-y-6">
                  <div className="layout-transition">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      Device Locations
                    </h1>
                    <p className="text-muted-foreground mt-1">
                      View real-time device locations on the interactive map
                    </p>
                  </div>
                  <div className="bg-card rounded-xl border shadow-lg overflow-hidden layout-transition hover:shadow-xl" style={{ height: '600px' }}>
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
    );
  };

  return layout === 'classic' ? <ClassicLayout /> : <ModernLayout />;
};

export default Dashboard;
