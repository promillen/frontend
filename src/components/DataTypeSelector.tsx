import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Database, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDataTypeSelection } from '@/hooks/useDataTypeSelection';
import LoadingSkeleton from './LoadingSkeleton';

const DataTypeSelector: React.FC = () => {
  const {
    selectedDataTypes,
    loading,
    updateDataTypeSelection,
    refreshDataTypes
  } = useDataTypeSelection();

  if (loading) {
    return <LoadingSkeleton type="card" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            <CardTitle>Data Type Selection</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshDataTypes}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          Choose which sensor data types to display in the devices view
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedDataTypes.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No sensor data types found. Add some sensor data first.
          </p>
        ) : (
          selectedDataTypes.map((config) => (
            <div
              key={config.dataType}
              className="flex items-center justify-between p-3 rounded-lg border bg-background/50"
            >
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-xs">
                  {config.dataType}
                </Badge>
                <Label htmlFor={`data-type-${config.dataType}`} className="font-medium">
                  {config.label}
                </Label>
              </div>
              <Switch
                id={`data-type-${config.dataType}`}
                checked={config.enabled}
                onCheckedChange={(enabled) => 
                  updateDataTypeSelection(config.dataType, enabled)
                }
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};

export default DataTypeSelector;