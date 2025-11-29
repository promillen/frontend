import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const activationSecret = Deno.env.get('ACTIVATION_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is a developer
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user has developer role
    const { data: roleData, error: roleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || roleData?.role !== 'developer') {
      console.error('Role check failed:', roleError);
      return new Response(
        JSON.stringify({ error: 'Forbidden - Developer role required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { device_id } = await req.json();

    if (!device_id) {
      return new Response(
        JSON.stringify({ error: 'device_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if device exists in device_config
    const { data: deviceExists, error: deviceCheckError } = await supabase
      .from('device_config')
      .select('devid')
      .eq('devid', device_id)
      .maybeSingle();

    if (deviceCheckError) {
      console.error('Error checking device:', deviceCheckError);
      return new Response(
        JSON.stringify({ error: 'Error checking device existence' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!deviceExists) {
      return new Response(
        JSON.stringify({ error: 'Device not found in device_config. Please add the device first.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if activation code already exists
    const { data: existingActivation } = await supabase
      .from('device_activations')
      .select('activation_code, claimed')
      .eq('device_id', device_id)
      .maybeSingle();

    if (existingActivation) {
      return new Response(
        JSON.stringify({ 
          activation_code: existingActivation.activation_code,
          device_id,
          already_exists: true,
          claimed: existingActivation.claimed
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate HMAC-SHA256
    const encoder = new TextEncoder();
    const keyData = encoder.encode(activationSecret);
    const messageData = encoder.encode(device_id);

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign('HMAC', key, messageData);
    const hashArray = Array.from(new Uint8Array(signature));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Take first 16 characters and format as XXXX-XXXX-XXXX-XXXX
    const codeRaw = hashHex.substring(0, 16).toUpperCase();
    const activation_code = `${codeRaw.substring(0, 4)}-${codeRaw.substring(4, 8)}-${codeRaw.substring(8, 12)}-${codeRaw.substring(12, 16)}`;

    // Insert into device_activations
    const { error: insertError } = await supabase
      .from('device_activations')
      .insert({
        device_id,
        activation_code,
        claimed: false
      });

    if (insertError) {
      console.error('Error inserting activation code:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to save activation code', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Generated activation code for device ${device_id}: ${activation_code}`);

    return new Response(
      JSON.stringify({ 
        activation_code,
        device_id,
        already_exists: false
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-activation-code:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});