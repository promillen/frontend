import { MapPin, List, Users, Settings, Home, Activity, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';

interface AppSidebarProps {
  activeView: 'map' | 'devices' | 'users';
  onViewChange: (view: 'map' | 'devices' | 'users') => void;
}

const AppSidebar = ({ activeView, onViewChange }: AppSidebarProps) => {
  const { user, signOut } = useAuth();
  const { role } = useUserRole();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const mainItems = [
    { id: 'map', title: 'Map View', icon: MapPin, view: 'map' as const },
    { id: 'devices', title: 'Devices', icon: List, view: 'devices' as const },
  ];

  const adminItems = [
    { id: 'users', title: 'User Management', icon: Users, view: 'users' as const },
  ];

  const getNavClassName = (view: string) => {
    return activeView === view 
      ? 'bg-sidebar-accent text-sidebar-accent-foreground' 
      : 'hover:bg-sidebar-accent/50';
  };

  return (
    <Sidebar className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center">
            <Activity className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-semibold text-sidebar-foreground">IoT Tracker Hub</h1>
              <p className="text-xs text-sidebar-foreground/60">Device Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    className={getNavClassName(item.view)}
                    onClick={() => onViewChange(item.view)}
                  >
                    <item.icon className="w-4 h-4" />
                    {!collapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === 'admin' && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      className={getNavClassName(item.view)}
                      onClick={() => onViewChange(item.view)}
                    >
                      <item.icon className="w-4 h-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="space-y-3">
          {!collapsed && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                {role && (
                  <Badge variant="outline" className="capitalize text-xs">
                    {role}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {user?.email}
              </p>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            className="w-full"
          >
            <Settings className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Sign Out</span>}
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSidebar;