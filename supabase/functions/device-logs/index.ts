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
  // Send periodic mock CoAP messages to simulate real device communication
  const messageTypes = [
    { 
      type: 'info', 
      message: `CoAP POST /uplink from ${deviceId}`, 
      raw: '40 02 5f 4a 62 75 70 6c 69 6e 6b',
      details: 'Device uplink message received'
    },
    { 
      type: 'info', 
      message: `Protobuf decoded: heartbeat_interval=300, battery=85%`,
      raw: '08 ac 02 12 04 10 d5 01',
      details: 'Device configuration and status update'
    },
    { 
      type: 'info', 
      message: `Location data: WiFi scan (3 APs), Cell tower info`,
      raw: '1a 0a 08 01 12 06 aa bb cc dd ee ff',
      details: 'Location triangulation data received'
    },
    { 
      type: 'info', 
      message: `Activity report: sleep=240ms, modem=15ms, gnss=0ms`,
      raw: '22 08 08 f0 01 10 0f 18 00',
      details: 'Power consumption activity breakdown'
    },
    { 
      type: 'info', 
      message: `Temperature sensor: 22.5°C, uplink_count=${Math.floor(Math.random() * 1000)}`,
      raw: '2a 04 08 e1 01 10 16',
      details: 'Environmental sensor reading'
    },
    { 
      type: 'warning', 
      message: `Low battery warning: 15% remaining`,
      raw: '32 02 08 0f',
      details: 'Device power management alert'
    },
    { 
      type: 'info', 
      message: `Motion detected: accelerometer triggered`,
      raw: '3a 06 08 01 11 00 20 40 80',
      details: 'Movement sensor activation'
    },
    { 
      type: 'error', 
      message: `CoAP transmission failed, retrying...`,
      raw: '40 01 60 4e',
      details: 'Network connectivity issue'
    }
  ]

  let messageIndex = 0
  let sequenceNumber = 1
  
  const interval = setInterval(() => {
    if (socket.readyState === WebSocket.OPEN) {
      const messageTemplate = messageTypes[messageIndex % messageTypes.length]
      
      const logMessage = {
        type: messageTemplate.type,
        message: messageTemplate.message,
        raw: messageTemplate.raw,
        details: messageTemplate.details,
        deviceId,
        timestamp: new Date().toISOString(),
        sequence: sequenceNumber++,
        source: 'CoAP Server'
      }

      socket.send(JSON.stringify(logMessage))
      messageIndex++
    } else {
      clearInterval(interval)
    }
  }, 3000 + Math.random() * 4000) // Random interval between 3-7 seconds for realistic timing

  // Store interval ID on socket for cleanup
  ;(socket as any).messageInterval = interval

  socket.addEventListener('close', () => {
    if ((socket as any).messageInterval) {
      clearInterval((socket as any).messageInterval)
    }
  })
}