
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useTestRole } from '@/contexts/TestRoleContext';

export type UserRole = 'admin' | 'moderator' | 'user' | 'developer';

export const useUserRole = () => {
  const { user } = useAuth();
  const { testRole, isTestMode } = useTestRole();
  const [actualRole, setActualRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Use test role if in test mode, otherwise use actual role
  const role = isTestMode ? testRole : actualRole;

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setActualRole(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('Error fetching user role:', error);
          setActualRole('user'); // Default to user role
        } else {
          setActualRole(data.role as UserRole);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
        setActualRole('user');
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const isDeveloper = role === 'developer';
  const isAdmin = role === 'admin';
  const isModerator = role === 'moderator';
  const canManageUsers = isDeveloper || isAdmin;
  const canModifyData = isDeveloper || isAdmin || isModerator;
  const isActualDeveloper = actualRole === 'developer'; // For test mode controls
  
  return { 
    role, 
    actualRole,
    loading, 
    isDeveloper, 
    isAdmin, 
    isModerator, 
    canManageUsers, 
    canModifyData,
    isActualDeveloper,
    isTestMode
  };
};
