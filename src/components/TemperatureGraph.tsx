import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { formatInTimeZone } from "date-fns-tz";
import { Loader2 } from "lucide-react";

interface TemperatureGraphProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devid: string;
  deviceName: string;
}

interface TemperatureData {
  timestamp: string;
  temperature: number;
  internal_temperature?: number;
}

export const TemperatureGraph: React.FC<TemperatureGraphProps> = ({
  open,
  onOpenChange,
  devid,
  deviceName,
}) => {
  const [data, setData] = useState<TemperatureData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchTemperatureData();
    }
  }, [open, devid]);

  const fetchTemperatureData = async () => {
    setLoading(true);
    try {
      // Fetch device config for internal temperature
      const { data: deviceData } = await supabase
        .from("device_config")
        .select("internal_temperature, device_data_updated_at")
        .eq("devid", devid)
        .single();

      // Fetch sensor temperature data
      const { data: sensorData } = await supabase
        .from("sensor_data")
        .select("data, created_at")
        .eq("devid", devid)
        .eq("data_type", "temperature")
        .order("created_at", { ascending: true })
        .limit(100);

      const chartData: TemperatureData[] = [];

      // Add sensor temperature data
      if (sensorData) {
        sensorData.forEach((item) => {
          const temp = typeof item.data === "object" && item.data !== null 
            ? (item.data as any).temperature 
            : null;
          
          if (temp !== null && temp !== undefined) {
            chartData.push({
              timestamp: formatInTimeZone(new Date(item.created_at), "Europe/Copenhagen", "dd/MM HH:mm"),
              temperature: temp,
            });
          }
        });
      }

      // Add internal temperature as the latest point if available
      if (deviceData?.internal_temperature && deviceData?.device_data_updated_at) {
        chartData.push({
          timestamp: formatInTimeZone(
            new Date(deviceData.device_data_updated_at),
            "Europe/Copenhagen",
            "dd/MM HH:mm"
          ),
          temperature: deviceData.internal_temperature,
          internal_temperature: deviceData.internal_temperature,
        });
      }

      setData(chartData);
    } catch (error) {
      console.error("Error fetching temperature data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Temperature Graph</DialogTitle>
          <DialogDescription>
            Temperature readings for {deviceName || devid}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No temperature data available
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="timestamp" 
                  className="text-xs"
                  tick={{ fill: "hsl(var(--foreground))" }}
                />
                <YAxis 
                  label={{ value: "Temperature (°C)", angle: -90, position: "insideLeft" }}
                  tick={{ fill: "hsl(var(--foreground))" }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--background))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "6px"
                  }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="temperature" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                  name="Temperature"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
