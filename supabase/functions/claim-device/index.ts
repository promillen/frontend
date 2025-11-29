import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get user from authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('User authentication error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has moderator, admin, or developer role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData) {
      console.error('Role check error:', roleError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify user role' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const allowedRoles = ['moderator', 'admin', 'developer'];
    if (!allowedRoles.includes(roleData.role)) {
      return new Response(
        JSON.stringify({ error: 'Only moderators, admins, and developers can claim devices' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { activation_code } = await req.json();

    if (!activation_code) {
      return new Response(
        JSON.stringify({ error: 'Activation code is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if activation code exists and is unclaimed
    const { data: activationData, error: activationError } = await supabase
      .from('device_activations')
      .select('*')
      .eq('activation_code', activation_code)
      .single();

    if (activationError || !activationData) {
      console.error('Activation code lookup error:', activationError);
      return new Response(
        JSON.stringify({ error: 'Invalid activation code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (activationData.claimed) {
      return new Response(
        JSON.stringify({ 
          error: 'This device has already been claimed',
          device_id: activationData.device_id 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if device exists in device_config
    const { data: deviceData, error: deviceError } = await supabase
      .from('device_config')
      .select('devid, name, last_seen')
      .eq('devid', activationData.device_id)
      .single();

    const hasData = deviceData?.last_seen !== null;

    // Claim the device
    const { error: claimError } = await supabase
      .from('device_activations')
      .update({
        claimed: true,
        owner_id: user.id,
        claimed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('activation_code', activation_code);

    if (claimError) {
      console.error('Claim error:', claimError);
      return new Response(
        JSON.stringify({ error: 'Failed to claim device' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create device_access record
    const { error: accessError } = await supabase
      .from('device_access')
      .insert({
        user_id: user.id,
        devid: activationData.device_id
      });

    if (accessError) {
      console.error('Device access creation error:', accessError);
      // Don't fail the whole operation if access record fails
    }

    console.log(`Device ${activationData.device_id} claimed by user ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        device_id: activationData.device_id,
        has_data: hasData,
        device_name: deviceData?.name
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
