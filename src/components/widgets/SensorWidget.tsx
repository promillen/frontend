import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Battery, Thermometer, Droplets, Activity, MapPin, Wind } from 'lucide-react';
import { useApplicationContext } from '@/contexts/ApplicationContext';

interface SensorWidgetProps {
  sensorType: string;
  data: any[];
  className?: string;
}

const getSensorIcon = (type: string) => {
  switch (type) {
    case 'battery':
      return <Battery className="h-4 w-4" />;
    case 'temperature':
      return <Thermometer className="h-4 w-4" />;
    case 'humidity':
    case 'soil_moisture':
      return <Droplets className="h-4 w-4" />;
    case 'location':
      return <MapPin className="h-4 w-4" />;
    case 'air_quality':
    case 'pressure':
      return <Wind className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

const getLatestValue = (data: any[], type: string) => {
  if (!data || data.length === 0) return null;
  const latest = data[0];
  
  if (type === 'location') {
    return latest.data?.lat && latest.data?.lng 
      ? `${latest.data.lat.toFixed(6)}, ${latest.data.lng.toFixed(6)}`
      : 'No location';
  }
  
  return latest.data?.value ?? 'No data';
};

const formatChartData = (data: any[]) => {
  return data.slice(0, 20).reverse().map((item, index) => ({
    index,
    value: item.data?.value || 0,
    timestamp: new Date(item.created_at).toLocaleTimeString(),
  }));
};

export const SensorWidget: React.FC<SensorWidgetProps> = ({ sensorType, data, className = '' }) => {
  const { sensorDataTypes } = useApplicationContext();
  
  const sensorConfig = sensorDataTypes.find(s => s.name === sensorType);
  const latestValue = getLatestValue(data, sensorType);
  const chartData = formatChartData(data);
  
  if (!sensorConfig) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-muted-foreground">Unknown sensor type: {sensorType}</div>
        </CardContent>
      </Card>
    );
  }

  const renderVisualization = () => {
    const vizType = sensorConfig.visualization_config?.type;
    
    if (vizType === 'gauge' && typeof latestValue === 'number') {
      const range = sensorConfig.visualization_config?.range || { min: 0, max: 100 };
      const percentage = ((latestValue - range.min) / (range.max - range.min)) * 100;
      
      return (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{range.min}{sensorConfig.unit}</span>
            <span>{range.max}{sensorConfig.unit}</span>
          </div>
          <Progress value={Math.max(0, Math.min(100, percentage))} className="h-3" />
        </div>
      );
    }
    
    if (vizType === 'battery' && typeof latestValue === 'number') {
      return (
        <div className="flex items-center gap-3">
          <Battery className={`h-8 w-8 ${latestValue > 20 ? 'text-green-500' : 'text-red-500'}`} />
          <div>
            <div className="text-2xl font-bold">{latestValue}%</div>
            <Progress value={latestValue} className="h-2 w-20" />
          </div>
        </div>
      );
    }
    
    if (vizType === 'line_chart' && chartData.length > 1) {
      return (
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" hide />
              <YAxis hide />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={sensorConfig.visualization_config?.color || '#3b82f6'} 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );
    }
    
    // Default simple display
    return (
      <div className="text-center">
        <div className="text-3xl font-bold text-primary">
          {typeof latestValue === 'number' ? latestValue.toFixed(2) : latestValue}
        </div>
        {sensorConfig.unit && typeof latestValue === 'number' && (
          <div className="text-sm text-muted-foreground">{sensorConfig.unit}</div>
        )}
      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          {getSensorIcon(sensorType)}
          {sensorConfig.display_name}
          <Badge variant="outline" className="ml-auto text-xs">
            {data.length} readings
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {data.length === 0 ? (
          <div className="text-center text-muted-foreground py-4">
            No data available
          </div>
        ) : (
          renderVisualization()
        )}
      </CardContent>
    </Card>
  );
};