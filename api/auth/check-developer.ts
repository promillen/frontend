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
    return response.status(200).setHeader('Access-Control-Allow-Origin', 'https://docs.moc-iot.com')
      .setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type')
      .setHeader('Access-Control-Allow-Credentials', 'true')
      .end();
  }

  if (request.method !== 'GET') {
    return response.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authHeader = request.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.status(401)
        .setHeader('Access-Control-Allow-Origin', 'https://docs.moc-iot.com')
        .setHeader('Access-Control-Allow-Credentials', 'true')
        .json({
          authenticated: false,
          isDeveloper: false,
          error: 'No valid authorization header'
        });
    }

    const token = authHeader.split(' ')[1];
    
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
          isDeveloper: false,
          error: 'Invalid token'
        });
    }

    // Check user role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError) {
      console.error('Error checking user role:', roleError);
      return response.status(200)
        .setHeader('Access-Control-Allow-Origin', 'https://docs.moc-iot.com')
        .setHeader('Access-Control-Allow-Credentials', 'true')
        .json({
          authenticated: true,
          isDeveloper: false,
          user: {
            id: user.id,
            email: user.email
          }
        });
    }

    const isDeveloper = roleData.role === 'developer';

    return response.status(200)
      .setHeader('Access-Control-Allow-Origin', 'https://docs.moc-iot.com')
      .setHeader('Access-Control-Allow-Credentials', 'true')
      .json({
        authenticated: true,
        isDeveloper,
        user: {
          id: user.id,
          email: user.email
        }
      });

  } catch (error) {
    console.error('Auth check error:', error);
    return response.status(500)
      .setHeader('Access-Control-Allow-Origin', 'https://docs.moc-iot.com')
      .setHeader('Access-Control-Allow-Credentials', 'true')
      .json({
        authenticated: false,
        isDeveloper: false,
        error: 'Internal server error'
      });
  }
}