import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QRScannerProps {
  onScan: (code: string) => void;
  onClose: () => void;
}

export const QRScanner = ({ onScan, onClose }: QRScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-scanner-container';

  useEffect(() => {
    const startScanner = async () => {
      try {
        setError(null);
        const html5QrCode = new Html5Qrcode(scannerContainerId);
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Successfully scanned
            onScan(decodedText);
            stopScanner();
          },
          (errorMessage) => {
            // Scanning errors are normal, we can ignore them
            // Only log if it's not the common "No MultiFormat Readers" error
            if (!errorMessage.includes('NotFoundException')) {
              console.debug('QR scan error:', errorMessage);
            }
          }
        );

        setIsScanning(true);
      } catch (err) {
        console.error('Error starting QR scanner:', err);
        setError('Failed to start camera. Please check camera permissions.');
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      stopScanner();
    };
  }, []);

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const handleClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          <h3 className="font-semibold">Scan QR Code</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="relative rounded-lg overflow-hidden bg-black">
        <div
          id={scannerContainerId}
          className="w-full"
          style={{ minHeight: '300px' }}
        />
      </div>

      <p className="text-sm text-muted-foreground text-center mt-4">
        Position the QR code within the frame
      </p>
    </div>
  );
};
