
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Badge } from '@/components/ui/badge';
import { LogOut, MapPin, List, Users } from 'lucide-react';

interface NavbarProps {
  activeView: 'map' | 'devices' | 'users';
  onViewChange: (view: 'map' | 'devices' | 'users') => void;
}

const Navbar = ({ activeView, onViewChange }: NavbarProps) => {
  const { user, signOut } = useAuth();
  const { role } = useUserRole();

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">IoT Tracker Hub</h1>
            <div className="flex space-x-2">
              <Button
                variant={activeView === 'map' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('map')}
              >
                <MapPin className="h-4 w-4 mr-2" />
                Map
              </Button>
              <Button
                variant={activeView === 'devices' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onViewChange('devices')}
              >
                <List className="h-4 w-4 mr-2" />
                Devices
              </Button>
              {role === 'admin' && (
                <Button
                  variant={activeView === 'users' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onViewChange('users')}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Users
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {role && (
              <Badge variant="outline" className="capitalize">
                {role}
              </Badge>
            )}
            <span className="text-sm text-gray-700">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
