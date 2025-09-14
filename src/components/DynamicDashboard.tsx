import React from 'react';
import { useApplicationContext } from '@/contexts/ApplicationContext';
import { useSensorData } from '@/hooks/useSensorData';
import { SensorWidget } from '@/components/widgets/SensorWidget';
import MapView from '@/components/MapView';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, BarChart3, Map, Grid3x3 } from 'lucide-react';

interface DynamicDashboardProps {
  selectedDevices: string[];
  activeTimeRange: {
    start: Date;
    end: Date;
  };
  activeTileLayer: string;
  className?: string;
}

export const DynamicDashboard: React.FC<DynamicDashboardProps> = ({
  selectedDevices,
  activeTimeRange,
  activeTileLayer,
  className = ''
}) => {
  const { currentProfile, sensorDataTypes } = useApplicationContext();
  
  const { data: sensorData, loading } = useSensorData({
    dataTypes: currentProfile?.config?.primary_sensors,
    timeRange: activeTimeRange,
  });

  if (!currentProfile) {
    return (
      <div className={`p-6 ${className}`}>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Application Selected</h3>
              <p className="text-muted-foreground">Please select an application type to view the dashboard.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primarySensors = currentProfile.config?.primary_sensors || [];
  const groupedData = primarySensors.reduce((acc: any, sensorType: string) => {
    acc[sensorType] = sensorData.filter(d => d.data_type === sensorType);
    return acc;
  }, {});

  const renderLayoutWidget = (widget: any, index: number) => {
    switch (widget.type) {
      case 'map':
        if (currentProfile.application_type === 'geotracking') {
          return (
            <div key={index} className={getWidgetSize(widget.size)}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Map className="h-4 w-4" />
                    Device Locations
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[400px]">
                    <MapView
                      selectedDevices={selectedDevices}
                      activeTimeRange="24h"
                      activeTileLayer={activeTileLayer}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        }
        return null;

      case 'chart_grid':
        return (
          <div key={index} className={getWidgetSize(widget.size)}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Sensor Data
                  <Badge variant="secondary" className="ml-auto">
                    {currentProfile.application_type}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {widget.sensors?.map((sensorType: string) => (
                    <SensorWidget
                      key={sensorType}
                      sensorType={sensorType}
                      data={groupedData[sensorType] || []}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'weather_widget':
        const weatherSensors = ['temperature', 'humidity', 'pressure'];
        return (
          <div key={index} className={getWidgetSize(widget.size)}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Grid3x3 className="h-4 w-4" />
                  Environmental Conditions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {weatherSensors.map((sensorType) => (
                    <SensorWidget
                      key={sensorType}
                      sensorType={sensorType}
                      data={groupedData[sensorType] || []}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'air_quality_widget':
        return (
          <div key={index} className={getWidgetSize(widget.size)}>
            <SensorWidget
              sensorType="air_quality"
              data={groupedData['air_quality'] || []}
              className="h-full"
            />
          </div>
        );

      case 'status_grid':
        return (
          <div key={index} className={getWidgetSize(widget.size)}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Grid3x3 className="h-4 w-4" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {widget.sensors?.map((sensorType: string) => (
                    <SensorWidget
                      key={sensorType}
                      sensorType={sensorType}
                      data={groupedData[sensorType] || []}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'alerts':
        return (
          <div key={index} className={getWidgetSize(widget.size)}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Alerts & Notifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  Alert system coming soon
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div key={index} className={getWidgetSize(widget.size)}>
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-muted-foreground">
                  Unknown widget type: {widget.type}
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  const getWidgetSize = (size: string) => {
    switch (size) {
      case 'full':
        return 'col-span-full';
      case 'half':
        return 'col-span-1 lg:col-span-2';
      case 'quarter':
        return 'col-span-1';
      default:
        return 'col-span-1';
    }
  };

  if (loading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="h-32 bg-muted/50 rounded" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`p-6 ${className}`}>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {currentProfile.dashboard_layout.map((widget, index) => 
          renderLayoutWidget(widget, index)
        )}
      </div>
    </div>
  );
};