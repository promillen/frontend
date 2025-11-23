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
import { LineChart, Info, Database, Save, Thermometer, Battery as BatteryIcon } from "lucide-react";
import { TemperatureGraph } from "@/components/TemperatureGraph";
import { BatteryVoltageGraph } from "@/components/BatteryVoltageGraph";
import DeviceLogViewer from "@/components/DeviceLogViewer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [apn, setApn] = useState(device.apn || "");
  const [band, setBand] = useState(device.band?.toString() || "");
  const [description, setDescription] = useState(device.description || "");
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const canEdit = ["admin", "moderator", "developer"].includes(role);

  useEffect(() => {
    setApn(device.apn || "");
    setBand(device.band?.toString() || "");
    setDescription(device.description || "");
  }, [device]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("device_config")
        .update({
          apn: apn.trim() || null,
          band: band ? parseInt(band) : null,
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

            {/* Editable Fields */}
            <div className="space-y-3 pt-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">APN</label>
                <Input
                  value={apn}
                  onChange={(e) => setApn(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Enter APN"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Band</label>
                <Input
                  value={band}
                  onChange={(e) => setBand(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Enter Band"
                  type="number"
                  className="font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={!canEdit}
                  placeholder="Enter description"
                  className="font-mono text-sm min-h-[80px]"
                />
              </div>

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
            </div>

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
        onOpenChange={setShowTemperatureGraph}
        devid={device.devid}
        deviceName={device.name}
      />

      <BatteryVoltageGraph
        open={showBatteryGraph}
        onOpenChange={setShowBatteryGraph}
        devid={device.devid}
        deviceName={device.name}
      />

      <DeviceLogViewer
        deviceId={device.devid}
        isOpen={showLogs}
        onClose={() => setShowLogs(false)}
      />
    </>
  );
};
