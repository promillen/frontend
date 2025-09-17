import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { X, Database, RefreshCw, ChevronRight } from 'lucide-react';
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


  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-GB', { 
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const groupLogsByUplink = (logs: any[]) => {
    const groups = new Map<string, any[]>();
    
    logs.forEach(log => {
      const key = log.uplink_count ? `uplink_${log.uplink_count}` : 'no_uplink';
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(log);
    });
    
    // Sort groups by most recent first
    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        if (a === 'no_uplink') return 1;
        if (b === 'no_uplink') return -1;
        const aNum = parseInt(a.split('_')[1]);
        const bNum = parseInt(b.split('_')[1]);
        return bNum - aNum;
      });
  };


  if (!isOpen || !deviceId || !canModifyData) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50 backdrop-blur-sm" style={{ top: 0, left: 0, right: 0, bottom: 0, margin: 0, padding: 0 }}>
      <Card className="w-[90vw] max-w-6xl h-[85vh] bg-card backdrop-blur-sm shadow-2xl border-2">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="h-5 w-5" />
              Device Database Logs - {deviceId}
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose} className="hover:bg-destructive/10">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4 flex flex-col h-[calc(85vh-80px)]">
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
                ) : (
                  groupLogsByUplink(databaseLogs).map(([groupKey, groupLogs]) => {
                    const isUplinkGroup = groupKey !== 'no_uplink';
                    const uplinkNumber = isUplinkGroup ? parseInt(groupKey.split('_')[1]) : null;
                    const latestTimestamp = groupLogs[0]?.timestamp;
                    const logTypes = [...new Set(groupLogs.map(log => log.type))];
                    
                    return (
                      <Collapsible key={groupKey} defaultOpen={false} className="space-y-2 group">
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="w-full justify-between p-4 h-auto bg-muted/20 hover:bg-muted/30 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
                                <span className="font-medium">
                                  {isUplinkGroup ? `Uplink #${uplinkNumber}` : 'System Messages'}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary" className="text-xs">
                                  {groupLogs.length} entries
                                </Badge>
                                {logTypes.map(type => (
                                  <Badge key={type} variant={getLogTypeColor(type)} className="text-xs">
                                    {type.toUpperCase()}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                            <span className="text-sm text-muted-foreground font-mono">
                              {latestTimestamp && formatTimestamp(latestTimestamp)}
                            </span>
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="space-y-3 ml-4 border-l-2 border-muted pl-4 animate-accordion-down data-[state=closed]:animate-accordion-up">
                          {groupLogs.map((log, index) => (
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
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <div className="text-sm text-muted-foreground p-3 bg-muted/20 rounded border-t flex-shrink-0">
              {databaseLogs.length} database entries • Last updated: {new Date().toLocaleTimeString('en-GB', { hour12: false })}
            </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeviceLogViewer;
