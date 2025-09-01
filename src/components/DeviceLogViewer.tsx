import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Activity, Pause, Play } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

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
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const websocketRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { role: userRole, canModifyData } = useUserRole();

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

          setLogs(prev => {
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
    setLogs([]);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const getLogTypeColor = (type: string) => {
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
    <Card className="absolute top-20 right-4 z-[1000] w-96 h-96 bg-card/95 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Live Logs - {deviceId}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 flex flex-col h-80">
        <div className="flex gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPaused(!isPaused)}
          >
            {isPaused ? <Play className="h-3 w-3 mr-1" /> : <Pause className="h-3 w-3 mr-1" />}
            {isPaused ? 'Resume' : 'Pause'}
          </Button>
          <Button variant="outline" size="sm" onClick={clearLogs}>
            Clear
          </Button>
        </div>

        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="space-y-2">
            {logs.length === 0 ? (
              <div className="text-xs text-muted-foreground text-center py-4">
                {isConnected ? 'Waiting for messages...' : 'Not connected'}
              </div>
            ) : (
              logs.map((log) => (
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
          {logs.length} messages {isPaused && '(paused)'}
        </div>
      </CardContent>
    </Card>
  );
};

export default DeviceLogViewer;
