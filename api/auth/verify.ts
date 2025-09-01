import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // Handle CORS preflight requests
  if (request.method === 'OPTIONS') {
    return response.status(200)
      .setHeader('Access-Control-Allow-Origin', 'https://docs.moc-iot.com')
      .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Cookie')
      .setHeader('Access-Control-Allow-Credentials', 'true')
      .end();
  }

  if (request.method !== 'GET' && request.method !== 'POST') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    let token = '';

    // Try to get token from Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    // Try to get token from Cookie header (for session-based auth)
    const cookieHeader = request.headers.cookie;
    if (!token && cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map(c => {
          const [key, ...v] = c.split('=');
          return [key, v.join('=')];
        })
      );
      
      if (cookies['sb-access-token']) {
        token = cookies['sb-access-token'];
      }
    }

    if (!token) {
      return response.status(401)
        .setHeader('Access-Control-Allow-Origin', 'https://docs.moc-iot.com')
        .setHeader('Access-Control-Allow-Credentials', 'true')
        .json({
          authenticated: false,
          error: 'No valid authorization token'
        });
    }
    
    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Verify the JWT token
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return response.status(401)
        .setHeader('Access-Control-Allow-Origin', 'https://docs.moc-iot.com')
        .setHeader('Access-Control-Allow-Credentials', 'true')
        .json({
          authenticated: false,
          error: 'Invalid token'
        });
    }

    // Check user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const role = roleData?.role || 'user';
    const isDeveloper = role === 'developer';

    return response.status(200)
      .setHeader('Access-Control-Allow-Origin', 'https://docs.moc-iot.com')
      .setHeader('Access-Control-Allow-Credentials', 'true')
      .json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          role: role,
          roles: [role] // For compatibility with docs expectations
        }
      });

  } catch (error) {
    console.error('Auth verification error:', error);
    return response.status(500)
      .setHeader('Access-Control-Allow-Origin', 'https://docs.moc-iot.com')
      .setHeader('Access-Control-Allow-Credentials', 'true')
      .json({
        authenticated: false,
        error: 'Internal server error'
      });
  }
}