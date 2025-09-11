import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Get environment variables
const FLYIO_WS_URL = Deno.env.get('FLYIO_WS_URL') || 'wss://flyio-nbiot.fly.dev/ws'
const FLYIO_WS_TOKEN = Deno.env.get('FLYIO_WS_TOKEN')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const { headers } = req
  const upgradeHeader = headers.get("upgrade") || ""

  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { 
      status: 400,
      headers: corsHeaders 
    })
  }

  const url = new URL(req.url)
  const deviceId = url.searchParams.get("deviceId")

  if (!deviceId) {
    return new Response("Device ID required", { 
      status: 400,
      headers: corsHeaders 
    })
  }

  // Check if we have the required token for Fly.io connection
  if (!FLYIO_WS_TOKEN) {
    console.error('FLYIO_WS_TOKEN not configured')
    return new Response("Server configuration error", { 
      status: 500,
      headers: corsHeaders 
    })
  }

  const { socket, response } = Deno.upgradeWebSocket(req)
  let flyioSocket: WebSocket | null = null

  socket.onopen = async () => {
    console.log(`Frontend WebSocket connection opened for device: ${deviceId}`)
    
    try {
      // Connect to Fly.io WebSocket server
      const flyioUrl = `${FLYIO_WS_URL}?deviceId=${encodeURIComponent(deviceId)}&token=${encodeURIComponent(FLYIO_WS_TOKEN)}`
      console.log(`Connecting to Fly.io WebSocket: ${FLYIO_WS_URL}`)
      
      flyioSocket = new WebSocket(flyioUrl)
      
      flyioSocket.onopen = () => {
        console.log(`Connected to Fly.io WebSocket for device: ${deviceId}`)
        
        // Send initial connection confirmation to frontend
        socket.send(JSON.stringify({
          type: 'system',
          message: `Connected to live logs for device ${deviceId}`,
          deviceId,
          timestamp: new Date().toISOString(),
          source: 'supabase/relay'
        }))
      }
      
      flyioSocket.onmessage = (event) => {
        try {
          // Relay messages from Fly.io to frontend
          const data = JSON.parse(event.data)
          console.log(`Relaying message from Fly.io for device ${deviceId}:`, data.type)
          
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(event.data)
          }
        } catch (error) {
          console.error(`Error parsing Fly.io message for device ${deviceId}:`, error)
        }
      }
      
      flyioSocket.onerror = (error) => {
        console.error(`Fly.io WebSocket error for device ${deviceId}:`, error)
        
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'error',
            message: 'Connection to device server failed',
            deviceId,
            timestamp: new Date().toISOString(),
            source: 'flyio/error'
          }))
        }
      }
      
      flyioSocket.onclose = (event) => {
        console.log(`Fly.io WebSocket closed for device ${deviceId}:`, event.code, event.reason)
        
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({
            type: 'system',
            message: 'Connection to device server closed',
            deviceId,
            timestamp: new Date().toISOString(),
            source: 'flyio/close'
          }))
        }
      }
      
    } catch (error) {
      console.error(`Failed to connect to Fly.io WebSocket for device ${deviceId}:`, error)
      
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'error',
          message: 'Failed to connect to device server',
          deviceId,
          timestamp: new Date().toISOString(),
          source: 'supabase/error'
        }))
      }
    }
  }

  socket.onmessage = (event) => {
    try {
      // Handle messages from frontend (if needed for bidirectional communication)
      const data = JSON.parse(event.data)
      console.log(`Received message from frontend for device ${deviceId}:`, data.type)
      
      // For now, we only relay from Fly.io to frontend
      // Future: could relay commands from frontend to Fly.io if needed
    } catch (error) {
      console.error(`Error parsing frontend message for device ${deviceId}:`, error)
    }
  }

  socket.onerror = (e) => {
    console.error(`Frontend WebSocket error for device ${deviceId}:`, e)
  }

  socket.onclose = () => {
    console.log(`Frontend WebSocket connection closed for device: ${deviceId}`)
    
    // Close Fly.io connection when frontend disconnects
    if (flyioSocket && flyioSocket.readyState === WebSocket.OPEN) {
      flyioSocket.close()
    }
  }

  return response
})
