import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { LineChart, Info } from "lucide-react";
import { TemperatureGraph } from "@/components/TemperatureGraph";

interface DeviceDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device: {
    devid: string;
    name: string;
    hw_version: string;
    sw_version: string;
    iccid: string;
  };
}

export const DeviceDetailsDialog: React.FC<DeviceDetailsDialogProps> = ({
  open,
  onOpenChange,
  device,
}) => {
  const [showTemperatureGraph, setShowTemperatureGraph] = useState(false);

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

          <div className="space-y-4 py-4">
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

            <Button
              className="w-full"
              onClick={() => {
                setShowTemperatureGraph(true);
                onOpenChange(false);
              }}
            >
              <LineChart className="h-4 w-4 mr-2" />
              View Temperature Graph
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <TemperatureGraph
        open={showTemperatureGraph}
        onOpenChange={setShowTemperatureGraph}
        devid={device.devid}
        deviceName={device.name}
      />
    </>
  );
};
