import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, Database, RefreshCw, Search } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';
import { useDeviceLogs } from '@/hooks/useDeviceLogs';

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
  const { canModifyData } = useUserRole();
  const { logs: databaseLogs, loading, error, refetch, getLogTypeColor } = useDeviceLogs(deviceId);
  const [searchTerm, setSearchTerm] = useState('');


  const formatTimestamp = (timestamp: string) => {
    const d = new Date(timestamp);
    const time = d.toLocaleTimeString('en-GB', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const date = d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return `${time} ${date}`;
  };

  const sortLogsByTimestamp = (logs: any[]) => {
    return [...logs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  };

  const filterLogs = (logs: any[]) => {
    if (!searchTerm.trim()) return logs;
    
    const searchLower = searchTerm.toLowerCase();
    return logs.filter(log => {
      // Search in log type
      if (log.type.toLowerCase().includes(searchLower)) return true;
      
      // Search in message
      if (log.message.toLowerCase().includes(searchLower)) return true;
      
      // Search in uplink count
      if (log.uplink_count && log.uplink_count.toString().includes(searchLower)) return true;
      
      // Search in data (stringified JSON)
      if (log.data) {
        const dataStr = JSON.stringify(log.data).toLowerCase();
        if (dataStr.includes(searchLower)) return true;
      }
      
      return false;
    });
  };


  if (!isOpen || !deviceId || !canModifyData) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm" 
      style={{ top: 0, left: 0, right: 0, bottom: 0, margin: 0, padding: 0 }}
      onClick={onClose}
    >
      <Card 
        className="w-[90vw] max-w-6xl h-[85vh] bg-card shadow-2xl border-2"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              Device Logs - {deviceId}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-destructive/10">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col h-[calc(85vh-80px)]">
            <div className="flex gap-2 mb-4 pt-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search logs by type, message, uplink, or data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={refetch}
                disabled={loading}
                className="hover:bg-primary/10"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>

            <ScrollArea className="flex-1 pr-4 pb-4">
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
                ) : (() => {
                  const sortedLogs = sortLogsByTimestamp(databaseLogs);
                  const filteredLogs = filterLogs(sortedLogs);
                  
                  if (filteredLogs.length === 0) {
                    return (
                      <div className="text-sm text-muted-foreground text-center py-8 bg-muted/5 rounded-lg">
                        No logs found matching "{searchTerm}"
                      </div>
                    );
                  }
                  
                  return filteredLogs.map((log) => (
                    <div key={log.id} className="bg-card/50 border rounded-lg p-4 space-y-3 hover:bg-muted/10 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant={getLogTypeColor(log.type)} className="text-xs font-medium">
                            {log.type.toUpperCase()}
                          </Badge>
                          <span className="text-sm text-muted-foreground font-mono">
                            {formatTimestamp(log.timestamp)}
                          </span>
                          {log.uplink_count !== null && log.uplink_count !== undefined && (
                            <Badge variant="outline" className="text-xs">
                              Uplink #{log.uplink_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="font-mono text-sm bg-muted/30 p-3 rounded border-l-4 border-l-primary/30">
                        {log.message}
                      </div>
                      {log.data && (
                        <details className="group">
                          <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
                            <span>▶</span>
                            Raw Data
                          </summary>
                          <div className="mt-2 font-mono text-xs text-muted-foreground bg-muted/20 p-3 rounded overflow-x-auto">
                            <pre>{JSON.stringify(log.data, null, 2)}</pre>
                          </div>
                        </details>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </ScrollArea>

            <div className="text-sm text-muted-foreground p-3 bg-muted/20 rounded border-t flex-shrink-0">
              {(() => {
                const filteredCount = filterLogs(databaseLogs).length;
                return searchTerm 
                  ? `${filteredCount} of ${databaseLogs.length} entries shown • Last updated: ${formatTimestamp(new Date().toISOString())}`
                  : `${databaseLogs.length} database entries • Last updated: ${formatTimestamp(new Date().toISOString())}`;
              })()}
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceLogViewer;
