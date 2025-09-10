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
      // Connect to device logs edge function
      const wsUrl = `wss://cdwtsrzshpotkfbyyyjk.functions.supabase.co/device-logs?deviceId=${deviceId}`;
      websocketRef.current = new WebSocket(wsUrl);

      websocketRef.current.onopen = () => {
        setIsConnected(true);
        console.log('Connected to device logs');
      };

      websocketRef.current.onmessage = (event) => {
        if (isPaused) return;

        try {
          const logData = JSON.parse(event.data);
          const newLog: LogMessage = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            deviceId: logData.deviceId || deviceId,
            message: logData.message || 'Unknown CoAP message',
            type: logData.type || 'info',
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
          console.error('Error parsing log message:', error);
        }
      };

      websocketRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      websocketRef.current.onclose = () => {
        setIsConnected(false);
        console.log('Disconnected from device logs');
      };
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

  const clearLiveLogs = () => {
    setLiveLogs([]);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
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
    <Card className="absolute top-20 right-4 z-[1000] w-[500px] h-[600px] bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Device Logs - {deviceId}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col h-[500px]">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'database' | 'live')} className="flex flex-col h-full">
          <TabsList className="grid w-full grid-cols-2">
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

          <TabsContent value="database" className="flex flex-col h-full mt-4">
            <div className="flex gap-2 mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                disabled={loading}
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-2">
                {loading ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    Loading database logs...
                  </div>
                ) : error ? (
                  <div className="text-xs text-destructive text-center py-4">
                    Error: {error}
                  </div>
                ) : databaseLogs.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    No database logs found for this device
                  </div>
                ) : (
                  databaseLogs.map((log) => (
                    <div key={log.id} className="text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        <Badge variant={getLogTypeColor(log.type)} className="text-xs">
                          {log.type}
                        </Badge>
                      </div>
                      <div className="font-mono text-xs bg-muted/50 p-2 rounded">
                        {log.message}
                      </div>
                      {log.data && (
                        <div className="font-mono text-xs text-muted-foreground bg-muted/30 p-1 rounded">
                          Data: {JSON.stringify(log.data, null, 1)}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="text-xs text-muted-foreground mt-2">
              {databaseLogs.length} database entries
            </div>
          </TabsContent>

          <TabsContent value="live" className="flex flex-col h-full mt-4">
            <div className="flex gap-2 mb-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
                {isPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button variant="outline" size="sm" onClick={clearLiveLogs}>
                Clear
              </Button>
            </div>

            <ScrollArea className="flex-1" ref={scrollRef}>
              <div className="space-y-2">
                {liveLogs.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    {isConnected ? 'Waiting for messages...' : 'Not connected'}
                  </div>
                ) : (
                  liveLogs.map((log) => (
                    <div key={log.id} className="text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          {formatTimestamp(log.timestamp)}
                        </span>
                        <Badge variant={getLiveLogTypeColor(log.type)} className="text-xs">
                          {log.type}
                        </Badge>
                      </div>
                      <div className="font-mono text-xs bg-muted/50 p-2 rounded">
                        {log.message}
                      </div>
                      {log.raw && (
                        <div className="font-mono text-xs text-muted-foreground bg-muted/30 p-1 rounded">
                          Raw: {log.raw}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>

            <div className="text-xs text-muted-foreground mt-2">
              {liveLogs.length} messages {isPaused && '(paused)'}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default DeviceLogViewer;
