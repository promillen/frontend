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

interface BatteryVoltageGraphProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  devid: string;
  deviceName: string;
}

interface BatteryData {
  timestamp: string;
  voltage: number;
}

export const BatteryVoltageGraph: React.FC<BatteryVoltageGraphProps> = ({
  open,
  onOpenChange,
  devid,
  deviceName,
}) => {
  const [data, setData] = useState<BatteryData[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchBatteryData();
    }
  }, [open, devid]);

  const fetchBatteryData = async () => {
    setLoading(true);
    try {
      // Fetch device config history (we'll need to query for historical battery data)
      // For now, we'll just get the current battery level as a single point
      const { data: deviceData } = await supabase
        .from("device_config")
        .select("battery_level, device_data_updated_at")
        .eq("devid", devid)
        .single();

      const chartData: BatteryData[] = [];

      // Add current battery voltage
      if (deviceData?.battery_level && deviceData?.device_data_updated_at) {
        chartData.push({
          timestamp: formatInTimeZone(
            new Date(deviceData.device_data_updated_at),
            "Europe/Copenhagen",
            "dd/MM HH:mm"
          ),
          voltage: deviceData.battery_level / 1000, // Convert mV to V
        });
      }

      setData(chartData);
    } catch (error) {
      console.error("Error fetching battery data:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Battery Voltage Graph</DialogTitle>
          <DialogDescription>
            Battery voltage readings for {deviceName || devid}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No battery data available
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
                  label={{ value: "Voltage (V)", angle: -90, position: "insideLeft" }}
                  tick={{ fill: "hsl(var(--foreground))" }}
                  domain={[2.5, 4.2]}
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
                  dataKey="voltage" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                  name="Voltage (V)"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
