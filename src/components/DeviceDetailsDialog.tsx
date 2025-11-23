import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LineChart, Database, Save, Thermometer, Battery as BatteryIcon, ChevronDown, Info } from "lucide-react";
import { TemperatureGraph } from "@/components/TemperatureGraph";
import { BatteryVoltageGraph } from "@/components/BatteryVoltageGraph";
import DeviceLogViewer from "@/components/DeviceLogViewer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const LOCATION_MODE_MAP: Record<number, string> = {
  0: "None",
  1: "GNSS",
  2: "WiFi",
};

const SENSOR_TYPE_MAP: Record<number, string> = {
  0: "Not configured",
  1: "Tracker",
  2: "Soil Sensor",
};

interface DeviceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: {
    devid: string;
    name: string;
    hw_version: string;
    sw_version: string;
    iccid: string;
    apn: string | null;
    band: number | null;
    description: string | null;
    battery_level: number | null;
    internal_temperature: number | null;
    heartbeat_interval: number | null;
    sensor_type: number | null;
  };
  role: string;
  onDeviceUpdate: () => void;
}

export const DeviceDetailsDialog: React.FC<DeviceDetailsDialogProps> = ({
  open,
  onOpenChange,
  device,
  role,
  onDeviceUpdate,
}) => {
  const [showTemperatureGraph, setShowTemperatureGraph] = useState(false);
  const [showBatteryGraph, setShowBatteryGraph] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [name, setName] = useState(device.name || "");
  const [heartbeatInterval, setHeartbeatInterval] = useState(device.heartbeat_interval || 0);
  const [sensorType, setSensorType] = useState(device.sensor_type || 0);
  const [description, setDescription] = useState(device.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const canEdit = ["admin", "moderator", "developer"].includes(role);

  useEffect(() => {
    setName(device.name || "");
    setHeartbeatInterval(device.heartbeat_interval || 0);
    setSensorType(device.sensor_type || 0);
    setDescription(device.description || "");
  }, [device]);

  const formatHeartbeat = (seconds: number) => {
    if (seconds <= 0) return "null";
    if (seconds >= 86400) return "24h";
    if (seconds >= 43200) return "12h";
    if (seconds >= 21600) return "6h";
    if (seconds >= 3600) return "1h";
    if (seconds >= 1800) return "30m";
    if (seconds >= 300) return "5m";
    if (seconds >= 60) return "1m";
    return `${seconds}s`;
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("device_config")
        .update({
          name: name.trim() || null,
          heartbeat_interval: heartbeatInterval,
          sensor_type: sensorType,
          description: description.trim() || null,
        })
        .eq("devid", device.devid);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Device details updated successfully",
      });
      onDeviceUpdate();
    } catch (error) {
      console.error("Error updating device:", error);
      toast({
        title: "Error",
        description: "Failed to update device details",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGraphClose = (graphSetter: (value: boolean) => void) => {
    graphSetter(false);
    onOpenChange(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Device Details
            </DialogTitle>
            <DialogDescription>
              Hardware and software information for {device.name || device.devid}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto">
            {/* Editable Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">Device Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
                placeholder="Enter device name"
                className="text-sm"
              />
            </div>

            {/* Static Information */}
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm font-medium text-muted-foreground">Device ID</span>
                <span className="text-sm font-mono">{device.devid}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm font-medium text-muted-foreground">Hardware Version</span>
                <span className="text-sm font-mono">{device.hw_version || "N/A"}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm font-medium text-muted-foreground">Software Version</span>
                <span className="text-sm font-mono">{device.sw_version || "N/A"}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm font-medium text-muted-foreground">ICCID</span>
                <span className="text-sm font-mono break-all">{device.iccid?.trim() || "N/A"}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm font-medium text-muted-foreground">APN</span>
                <span className="text-sm font-mono">{device.apn || "N/A"}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/30">
                <span className="text-sm font-medium text-muted-foreground">Band</span>
                <span className="text-sm font-mono">{device.band || "N/A"}</span>
              </div>
            </div>

            {/* Temperature with Graph Button */}
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <div className="flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Temperature</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">
                  {device.internal_temperature !== null ? `${device.internal_temperature}°C` : "N/A"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowTemperatureGraph(true);
                    onOpenChange(false);
                  }}
                >
                  <LineChart className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Battery Voltage with Graph Button */}
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <div className="flex items-center gap-2">
                <BatteryIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium text-muted-foreground">Battery Voltage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono">
                  {device.battery_level !== null ? `${(device.battery_level / 1000).toFixed(3)} V` : "N/A"}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowBatteryGraph(true);
                    onOpenChange(false);
                  }}
                >
                  <LineChart className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Editable Heartbeat Interval */}
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="text-sm font-medium text-muted-foreground">Heartbeat Interval</span>
              {canEdit ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 px-3 text-sm">
                      {formatHeartbeat(heartbeatInterval)}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="z-[100000]">
                    <DropdownMenuItem onClick={() => setHeartbeatInterval(60)}>1m</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHeartbeatInterval(300)}>5m</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHeartbeatInterval(1800)}>30m</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHeartbeatInterval(3600)}>1h</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHeartbeatInterval(21600)}>6h</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHeartbeatInterval(43200)}>12h</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setHeartbeatInterval(86400)}>24h</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="text-sm text-muted-foreground">{formatHeartbeat(heartbeatInterval)}</span>
              )}
            </div>

            {/* Editable Sensor Type */}
            <div className="flex items-center justify-between py-2 border-b border-border/30">
              <span className="text-sm font-medium text-muted-foreground">Sensor Type</span>
              {canEdit ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-7 px-3 text-sm">
                      {SENSOR_TYPE_MAP[sensorType] || "Unknown"}
                      <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="z-[100000]">
                    {Object.entries(SENSOR_TYPE_MAP)
                      .filter(([typeNum]) => typeNum !== "0")
                      .map(([typeNum, typeLabel]) => (
                        <DropdownMenuItem key={typeNum} onClick={() => setSensorType(parseInt(typeNum))}>
                          {typeLabel}
                        </DropdownMenuItem>
                      ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <span className="text-sm text-muted-foreground">{SENSOR_TYPE_MAP[sensorType] || "Unknown"}</span>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2 pt-3">
              <label className="text-sm font-medium text-muted-foreground">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!canEdit}
                placeholder="Enter description"
                className="text-sm min-h-[80px]"
              />
            </div>

            {/* Save Button */}
            {canEdit && (
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            )}

            {/* Action Buttons */}
            {role === "developer" && (
              <div className="pt-3 border-t border-border/30">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => {
                    setShowLogs(true);
                    onOpenChange(false);
                  }}
                >
                  <Database className="h-4 w-4 mr-2" />
                  View Device Logs
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <TemperatureGraph
        open={showTemperatureGraph}
        onOpenChange={(open) => handleGraphClose(setShowTemperatureGraph)}
        devid={device.devid}
        deviceName={device.name}
      />

      <BatteryVoltageGraph
        open={showBatteryGraph}
        onOpenChange={(open) => handleGraphClose(setShowBatteryGraph)}
        devid={device.devid}
        deviceName={device.name}
      />

      <DeviceLogViewer
        deviceId={device.devid}
        isOpen={showLogs}
        onClose={() => {
          setShowLogs(false);
          onOpenChange(true);
        }}
      />
    </>
  );
};
