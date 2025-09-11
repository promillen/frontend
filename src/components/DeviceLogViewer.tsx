import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Activity, Pause, Play, Database, RefreshCw } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useDeviceLogs } from '@/hooks/useDeviceLogs';

interface LogMessage {
  id: string;
  timestamp: string;
  deviceId: string;
  message: string;
  type: 'info' | 'warning' | 'error';
  raw?: string;
}

interface DeviceLogViewerProps {
  deviceId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const DeviceLogViewer: React.FC<DeviceLogViewerProps> = ({
  deviceId,
  isOpen,
  onClose
}) => {
  const [liveLogs, setLiveLogs] = useState<LogMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeTab, setActiveTab] = useState<'database' | 'live'>('database');
  const websocketRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { canModifyData } = useUserRole();
  const { logs: databaseLogs, loading, error, refetch, getLogTypeColor } = useDeviceLogs(deviceId);

  useEffect(() => {
    if (isOpen && deviceId) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isOpen, deviceId]);

  const connectWebSocket = () => {
    if (!deviceId) return;

    try {
      // Connect directly to Fly.io WebSocket (simplified 2-tier architecture)
      const wsUrl = `wss://flyio-nbiot.fly.dev/ws?deviceId=${encodeURIComponent(deviceId)}`;
      websocketRef.current = new WebSocket(wsUrl);

      websocketRef.current.onopen = () => {
        setIsConnected(true);
        console.log(`Connected to device logs for ${deviceId}`);
        
        // Send initial ping to verify connection
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          websocketRef.current.send(JSON.stringify({
            type: 'ping',
            deviceId: deviceId,
            timestamp: new Date().toISOString()
          }));
        }
      };

      websocketRef.current.onmessage = (event) => {
        if (isPaused) return;

        try {
          const logData = JSON.parse(event.data);
          console.log('Received WebSocket message:', logData); // Debug log
          
          // Handle pong responses (connection health)
          if (logData.type === 'pong') {
            console.log('WebSocket connection healthy - received pong');
            return;
          }
          
          const newLog: LogMessage = {
            id: logData.id || (Date.now().toString() + Math.random().toString(36).substr(2, 9)),
            timestamp: logData.timestamp || new Date().toISOString(),
            deviceId: logData.deviceId || deviceId,
            message: logData.message || 'Unknown message',
            type: logData.type === 'system' ? 'info' : (logData.type || 'info'),
            raw: logData.raw
          };

          setLiveLogs(prev => {
            const updated = [...prev, newLog];
            // Keep only last 1000 logs to prevent memory issues
            return updated.slice(-1000);
          });

          // Auto-scroll to bottom
          setTimeout(() => {
            if (scrollRef.current) {
              scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            }
          }, 100);
        } catch (error) {
          console.error('Error parsing log message:', error, event.data);
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      websocketRef.current.onclose = (event) => {
        setIsConnected(false);
        console.log(`Disconnected from device logs (code: ${event.code}, reason: ${event.reason})`);
        
        // Enhanced auto-reconnect with exponential backoff
        if (deviceId && isOpen && !websocketRef.current?.reconnecting) {
          const reconnectDelay = Math.min(1000 * Math.pow(2, (websocketRef.current?.reconnectAttempts || 0)), 30000);
          console.log(`Attempting to reconnect in ${reconnectDelay}ms...`);
          
          setTimeout(() => {
            if (deviceId && isOpen && (!websocketRef.current || websocketRef.current.readyState === WebSocket.CLOSED)) {
              if (websocketRef.current) {
                websocketRef.current.reconnectAttempts = (websocketRef.current.reconnectAttempts || 0) + 1;
              }
              connectWebSocket();
            }
          }, reconnectDelay);
        }
      };
      
      // Reset reconnect attempts on successful connection
      if (websocketRef.current) {
        websocketRef.current.reconnectAttempts = 0;
        websocketRef.current.reconnecting = false;
      }
      
    } catch (error) {
      console.error('Error connecting to WebSocket:', error);
    }
  };

  const disconnectWebSocket = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    setIsConnected(false);
    setLiveLogs([]);
  };

  const [testButtonStates, setTestButtonStates] = useState<{[key: string]: boolean}>({});
  const [connectionHealth, setConnectionHealth] = useState<{healthy: boolean, lastCheck: string} | null>(null);

  // Periodic health check
  useEffect(() => {
    if (!isConnected || !deviceId) return;

    const healthCheckInterval = setInterval(async () => {
      try {
        const response = await fetch(`https://flyio-nbiot.fly.dev/health`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' }
        });
        
        if (response.ok) {
          const healthData = await response.json();
          setConnectionHealth({
            healthy: healthData.status === 'healthy',
            lastCheck: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('Health check failed:', error);
        setConnectionHealth({
          healthy: false,
          lastCheck: new Date().toISOString()
        });
      }
    }, 15000); // Check every 15 seconds

    return () => clearInterval(healthCheckInterval);
  }, [isConnected, deviceId]);

  const sendTestMessage = async (msgType: string, count: number = 1) => {
    if (!deviceId) return;
    
    const buttonKey = `${msgType}-${count}`;
    setTestButtonStates(prev => ({ ...prev, [buttonKey]: true }));
    
    try {
      // First verify WebSocket connection is healthy
      if (!isConnected) {
        throw new Error('WebSocket not connected');
      }

      const flyioUrl = `https://flyio-nbiot.fly.dev/test?deviceId=${encodeURIComponent(deviceId)}&type=${msgType}&count=${count}`;
      
      const response = await fetch(flyioUrl, {
        method: 'GET',
        headers: {
          'Accept': 'text/plain'
        },
        timeout: 10000 // 10 second timeout
      });
      
      if (response.ok) {
        const responseText = await response.text();
        console.log(`✅ Test ${msgType} message(s) sent successfully: ${responseText}`);
        
        // Add visual feedback to live logs
        setLiveLogs(prev => [...prev, {
          id: `test-${Date.now()}`,
          timestamp: new Date().toISOString(),
          deviceId: deviceId,
          message: `🧪 Sent ${count} test ${msgType} message${count > 1 ? 's' : ''}`,
          type: 'info'
        }]);
        
      } else {
        const errorText = await response.text();
        console.error(`❌ Failed to send test message: ${response.status} - ${errorText}`);
        
        setLiveLogs(prev => [...prev, {
          id: `test-error-${Date.now()}`,
          timestamp: new Date().toISOString(),
          deviceId: deviceId,
          message: `❌ Test message failed: ${response.status}`,
          type: 'error'
        }]);
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      
      setLiveLogs(prev => [...prev, {
        id: `test-error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        deviceId: deviceId,
        message: `❌ Test message error: ${error.message}`,
        type: 'error'
      }]);
    } finally {
      setTestButtonStates(prev => ({ ...prev, [buttonKey]: false }));
    }
  };

  const clearLiveLogs = () => {
    setLiveLogs([]);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-GB', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getLiveLogTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'warning': return 'default';
      default: return 'secondary';
    }
  };

  if (!isOpen || !deviceId || !canModifyData) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-[90vw] max-w-6xl h-[85vh] bg-card/95 backdrop-blur-sm shadow-2xl border-2">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Device Logs - {deviceId}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-destructive/10">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col h-[calc(85vh-80px)]">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'database' | 'live')} className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-2 mb-0">
            <TabsTrigger value="database" className="flex items-center gap-1">
              <Database className="h-3 w-3" />
              Database Logs
            </TabsTrigger>
            <TabsTrigger value="live" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              Live Logs
              {activeTab === 'live' && (
                <Badge variant={isConnected ? 'default' : 'destructive'} className="ml-1 text-xs">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="database" className="data-[state=active]:flex data-[state=inactive]:hidden flex-col h-full">
            <div className="flex gap-2 mb-4 pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                disabled={loading}
                className="hover:bg-primary/10"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh Database Logs
              </Button>
            </div>

            <ScrollArea className="flex-1 pr-4">
              <div className="space-y-4">
                {loading ? (
                  <div className="text-sm text-muted-foreground text-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading database logs...
                  </div>
                ) : error ? (
                  <div className="text-sm text-destructive text-center py-8 bg-destructive/5 rounded-lg border border-destructive/20">
                    <div className="font-semibold mb-1">Error loading logs</div>
                    <div>{error}</div>
                  </div>
                ) : databaseLogs.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-8 bg-muted/5 rounded-lg">
                    No database logs found for this device
                  </div>
                ) : (
                  databaseLogs.map((log, index) => (
                    <div key={log.id} className="bg-card/50 border rounded-lg p-4 space-y-3 hover:bg-card/70 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant={getLogTypeColor(log.type)} className="text-xs font-medium">
                            {log.type.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground font-mono">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                        {log.uplink_count && (
                          <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">
                            Uplink #{log.uplink_count}
                          </span>
                        )}
                      </div>
                      <div className="font-mono text-sm bg-muted/30 p-3 rounded border-l-4 border-l-primary/30">
                        {log.message}
                      </div>
                      {log.data && (
                        <details className="group">
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                            <span className="group-open:rotate-90 transition-transform">▶</span>
                            Raw Data
                          </summary>
                          <div className="mt-2 font-mono text-xs text-muted-foreground bg-muted/20 p-3 rounded overflow-x-auto">
                            <pre>{JSON.stringify(log.data, null, 2)}</pre>
                          </div>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="text-sm text-muted-foreground mt-4 p-3 bg-muted/20 rounded border-t">
              {databaseLogs.length} database entries • Last updated: {new Date().toLocaleTimeString()}
            </div>
          </TabsContent>

          <TabsContent value="live" className="data-[state=active]:flex data-[state=inactive]:hidden flex-col h-full overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <ScrollArea className="flex-1" ref={scrollRef}>
                <div className="space-y-3 p-1 pr-4">
                  {liveLogs.length === 0 ? (
                    <div className="text-sm text-muted-foreground text-center py-8 bg-muted/5 rounded-lg">
                      {isConnected ? 'Waiting for live messages...' : 'Not connected to live stream'}
                    </div>
                  ) : (
                    liveLogs.map((log, index) => (
                      <div key={log.id} className="bg-card/50 border rounded-lg p-4 space-y-3 hover:bg-card/70 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Badge variant={getLiveLogTypeColor(log.type)} className="text-xs font-medium">
                              {log.type.toUpperCase()}
                            </Badge>
                            <span className="text-sm text-muted-foreground font-mono">
                              {formatTimestamp(log.timestamp)}
                            </span>
                          </div>
                        </div>
                        <div className="font-mono text-sm bg-muted/30 p-3 rounded border-l-4 border-l-blue-500/30">
                          {log.message}
                        </div>
                        {log.raw && (
                          <details className="group">
                            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                              <span className="group-open:rotate-90 transition-transform">▶</span>
                              Raw Message
                            </summary>
                            <div className="mt-2 font-mono text-xs text-muted-foreground bg-muted/20 p-3 rounded overflow-x-auto">
                              {log.raw}
                            </div>
                          </details>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Moved buttons to bottom */}
            <div className="border-t bg-muted/20 p-3 flex flex-col gap-3 flex-shrink-0">
              <div className="flex gap-2 flex-wrap items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPaused(!isPaused)}
                    className={isPaused ? "hover:bg-green-500/10" : "hover:bg-yellow-500/10"}
                  >
                    {isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                    {isPaused ? 'Resume' : 'Pause'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={clearLiveLogs} className="hover:bg-destructive/10">
                    Clear Logs
                  </Button>
                  
                  {/* Test Message Buttons */}
                  <div className="flex gap-2 border-l pl-3 ml-3">
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => sendTestMessage('heartbeat')}
                      className="text-xs bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 disabled:opacity-50"
                      disabled={!isConnected || !(connectionHealth?.healthy ?? true) || testButtonStates['heartbeat-1']}
                    >
                      {testButtonStates['heartbeat-1'] ? 'Sending...' : 'Test Heartbeat'}
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => sendTestMessage('activity')}
                      className="text-xs bg-green-600 hover:bg-green-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 disabled:opacity-50"
                      disabled={!isConnected || !(connectionHealth?.healthy ?? true) || testButtonStates['activity-1']}
                    >
                      {testButtonStates['activity-1'] ? 'Sending...' : 'Test Activity'}
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => sendTestMessage('location')}
                      className="text-xs bg-purple-600 hover:bg-purple-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 disabled:opacity-50"
                      disabled={!isConnected || !(connectionHealth?.healthy ?? true) || testButtonStates['location-1']}
                    >
                      {testButtonStates['location-1'] ? 'Sending...' : 'Test Location'}
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => sendTestMessage('random', 5)}
                      className="text-xs bg-orange-600 hover:bg-orange-700 text-white border-0 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 disabled:opacity-50"
                      disabled={!isConnected || !(connectionHealth?.healthy ?? true) || testButtonStates['random-5']}
                    >
                      {testButtonStates['random-5'] ? 'Sending...' : 'Test Burst (5x)'}
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {!isConnected && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={connectWebSocket}
                      className="text-xs hover:bg-green-50 hover:border-green-300"
                    >
                      Reconnect
                    </Button>
                  )}
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      isConnected 
                        ? (connectionHealth?.healthy !== false ? 'bg-green-500 animate-pulse' : 'bg-yellow-500') 
                        : 'bg-red-500'
                    }`}></div>
                    <span className="text-sm text-muted-foreground">
                      {isConnected 
                        ? (connectionHealth?.healthy !== false ? 'Connected & Healthy' : 'Connected (Warning)')
                        : 'Disconnected'
                      }
                    </span>
                    {connectionHealth && (
                      <span className="text-xs text-muted-foreground">
                        ({new Date(connectionHealth.lastCheck).toLocaleTimeString()})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-sm text-muted-foreground flex justify-between items-center">
                <span>{liveLogs.length} live messages {isPaused && '(paused)'}</span>
                <span>Started: {new Date().toLocaleTimeString('en-GB', { hour12: false })}</span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceLogViewer;
