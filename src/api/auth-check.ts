import { supabase } from '@/integrations/supabase/client';

export interface AuthCheckResponse {
  authenticated: boolean;
  isDeveloper: boolean;
  user?: {
    id: string;
    email: string;
  };
}

export const checkDeveloperAuth = async (): Promise<AuthCheckResponse> => {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      return {
        authenticated: false,
        isDeveloper: false
      };
    }

    // Check user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id)
      .single();

    if (roleError) {
      console.error('Error checking user role:', roleError);
      return {
        authenticated: true,
        isDeveloper: false,
        user: {
          id: session.user.id,
          email: session.user.email || ''
        }
      };
    }

    const isDeveloper = roleData.role === 'developer' || roleData.role === 'admin';

    return {
      authenticated: true,
      isDeveloper,
      user: {
        id: session.user.id,
        email: session.user.email || ''
      }
    };

  } catch (error) {
    console.error('Auth check error:', error);
    return {
      authenticated: false,
      isDeveloper: false
    };
  }
};