
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import Navbar from '@/components/Navbar';
import MapView from '@/components/MapView';
import DeviceList from '@/components/DeviceList';
import UserManagement from '@/components/UserManagement';

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
};

export default Dashboard;
