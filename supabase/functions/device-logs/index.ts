import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

  const { socket, response } = Deno.upgradeWebSocket(req)

  socket.onopen = () => {
    console.log(`WebSocket connection opened for device: ${deviceId}`)
    
    // Send initial connection message
    socket.send(JSON.stringify({
      type: 'connection',
      message: `Connected to live logs for device ${deviceId}`,
      deviceId,
      timestamp: new Date().toISOString()
    }))

    // Start sending mock CoAP messages for demo
    startMockCoAPMessages(socket, deviceId)
  }

  socket.onerror = (e) => {
    console.error(`WebSocket error for device ${deviceId}:`, e)
  }

  socket.onclose = () => {
    console.log(`WebSocket connection closed for device: ${deviceId}`)
  }

  return response
})

function startMockCoAPMessages(socket: WebSocket, deviceId: string) {
  // Send periodic mock CoAP messages to simulate device communication
  const messageTypes = [
    { type: 'info', message: 'Heartbeat received', raw: '40 01 2a f4 b2 65 6c 6c 6f' },
    { type: 'info', message: 'GPS location update', raw: '50 02 3b c5 67 70 73 64 61 74 61' },
    { type: 'info', message: 'Battery status report', raw: '60 03 4c d6 62 61 74 74 65 72 79' },
    { type: 'warning', message: 'Low battery warning', raw: '70 04 5d e7 77 61 72 6e 69 6e 67' },
    { type: 'info', message: 'Temperature sensor data', raw: '40 05 6e f8 74 65 6d 70 64 61 74' },
    { type: 'info', message: 'Motion detected', raw: '50 06 7f 09 6d 6f 74 69 6f 6e 64' },
  ]

  let messageIndex = 0
  
  const interval = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      const messageTemplate = messageTypes[messageIndex % messageTypes.length]
      
      const logMessage = {
        ...messageTemplate,
        deviceId,
        timestamp: new Date().toISOString(),
        message: `[CoAP] ${messageTemplate.message} from ${deviceId}`
      }

      socket.send(JSON.stringify(logMessage))
      messageIndex++
    } else {
      clearInterval(interval)
    }
  }, 2000 + Math.random() * 3000) // Random interval between 2-5 seconds

  // Store interval ID on socket for cleanup
  ;(socket as any).messageInterval = interval

  socket.addEventListener('close', () => {
    if ((socket as any).messageInterval) {
      clearInterval((socket as any).messageInterval)
    }
  })
}