import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, QrCode } from 'lucide-react';
import { QRScanner } from './QRScanner';

interface ClaimDeviceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceClaimed: () => void;
  prefilledCode?: string;
}

type ClaimStep = 'input' | 'waiting' | 'configuration' | 'success';

export const ClaimDeviceDialog = ({ isOpen, onClose, onDeviceClaimed, prefilledCode }: ClaimDeviceDialogProps) => {
  const [activationCode, setActivationCode] = useState(prefilledCode || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState<ClaimStep>('input');
  const [deviceInfo, setDeviceInfo] = useState<{ device_id: string; device_name?: string } | null>(null);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const { toast } = useToast();

  // Update activation code when prefilledCode changes
  useEffect(() => {
    if (prefilledCode) {
      setActivationCode(prefilledCode);
    }
  }, [prefilledCode]);

  // Clear polling interval on unmount or dialog close
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // Poll for device data when in waiting step
  useEffect(() => {
    if (currentStep === 'waiting' && deviceInfo) {
      const interval = setInterval(async () => {
        const { data, error } = await supabase
          .from('device_config')
          .select('last_seen')
          .eq('devid', deviceInfo.device_id)
          .single();

        if (!error && data?.last_seen) {
          clearInterval(interval);
          setPollingInterval(null);
          setCurrentStep('configuration');
        }
      }, 3000); // Poll every 3 seconds

      setPollingInterval(interval);

      return () => {
        clearInterval(interval);
      };
    }
  }, [currentStep, deviceInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!activationCode.trim()) {
      toast({
        title: "Error",
        description: "Activation code is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('claim-device', {
        body: { activation_code: activationCode.trim() }
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message || "Failed to claim device",
          variant: "destructive",
        });
        return;
      }

      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        return;
      }

      setDeviceInfo({
        device_id: data.device_id,
        device_name: data.device_name
      });

      if (data.has_data) {
        // Device already has data, go to configuration
        setCurrentStep('configuration');
      } else {
        // Device needs to send first ping, show waiting state
        setCurrentStep('waiting');
      }
    } catch (error) {
      console.error('Error claiming device:', error);
      toast({
        title: "Error",
        description: "Failed to claim device",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfigure = async () => {
    // TODO: Open device configuration dialog or navigate to configuration page
    setCurrentStep('success');
  };

  const handleSkipConfiguration = () => {
    setCurrentStep('success');
  };

  const handleQRScan = (code: string) => {
    setActivationCode(code);
    setShowScanner(false);
    toast({
      title: "QR Code Scanned",
      description: "Activation code captured successfully",
    });
  };

  const handleClose = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    // Only reset if there's no prefilled code
    if (!prefilledCode) {
      setActivationCode('');
    }
    setCurrentStep('input');
    setDeviceInfo(null);
    setShowScanner(false);
    
    if (currentStep === 'success') {
      onDeviceClaimed();
    }
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {currentStep === 'input' && 'Claim Device'}
            {currentStep === 'waiting' && 'Waiting for Device'}
            {currentStep === 'configuration' && 'Configure Device'}
            {currentStep === 'success' && 'Device Claimed Successfully'}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'input' && 'Enter the activation code to claim this device'}
            {currentStep === 'waiting' && 'Waiting for the device to send its first data...'}
            {currentStep === 'configuration' && 'Device data received. Configure your device settings.'}
            {currentStep === 'success' && 'Your device has been successfully claimed!'}
          </DialogDescription>
        </DialogHeader>

        {currentStep === 'input' && (
          <>
            {showScanner ? (
              <QRScanner
                onScan={handleQRScan}
                onClose={() => setShowScanner(false)}
              />
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="activation-code">Activation Code *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="activation-code"
                        placeholder="Enter activation code"
                        value={activationCode}
                        onChange={(e) => setActivationCode(e.target.value)}
                        required
                        autoComplete="off"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setShowScanner(true)}
                        title="Scan QR Code"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enter the code manually or click the QR icon to scan
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Claiming...
                      </>
                    ) : (
                      'Claim Device'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </>
        )}

        {currentStep === 'waiting' && (
          <div className="py-6">
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center space-y-2">
                <p className="font-medium">Device ID: {deviceInfo?.device_id}</p>
                <p className="text-sm text-muted-foreground">
                  Please insert the battery into your device.
                </p>
                <p className="text-sm text-muted-foreground">
                  The device will automatically connect and send its first data packet.
                </p>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={handleClose}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}

        {currentStep === 'configuration' && (
          <div className="py-6">
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div className="text-center space-y-2">
                <p className="font-medium">Device ID: {deviceInfo?.device_id}</p>
                <p className="text-sm text-muted-foreground">
                  Device data received successfully!
                </p>
                <p className="text-sm text-muted-foreground">
                  Would you like to configure the device settings now?
                </p>
              </div>
            </div>
            <DialogFooter className="mt-6 flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleSkipConfiguration} className="w-full sm:w-auto">
                Skip for Now
              </Button>
              <Button onClick={handleConfigure} className="w-full sm:w-auto">
                Configure Device
              </Button>
            </DialogFooter>
          </div>
        )}

        {currentStep === 'success' && (
          <div className="py-6">
            <div className="flex flex-col items-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <div className="text-center space-y-2">
                <p className="font-medium">Device claimed successfully!</p>
                <p className="text-sm text-muted-foreground">
                  Device ID: {deviceInfo?.device_id}
                </p>
                <p className="text-sm text-muted-foreground">
                  You can now view and manage this device.
                </p>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
