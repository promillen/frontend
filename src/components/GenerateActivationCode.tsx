import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { QrCode, Copy, Check } from 'lucide-react';
import QRCode from 'qrcode';

export function GenerateActivationCode() {
  const [deviceId, setDeviceId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!deviceId.trim()) {
      toast.error('Please enter a device ID');
      return;
    }

    setIsGenerating(true);
    setActivationCode(null);
    setQrCodeUrl(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-activation-code', {
        body: { device_id: deviceId.trim() }
      });

      if (error) throw error;

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setActivationCode(data.activation_code);

      if (data.already_exists) {
        toast.info(
          data.claimed 
            ? `Device already claimed. Code: ${data.activation_code}`
            : `Activation code already exists: ${data.activation_code}`
        );
      } else {
        toast.success('Activation code generated successfully!');
      }

      // Generate QR code
      const qrUrl = await QRCode.toDataURL(data.activation_code, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrUrl);

    } catch (error: any) {
      console.error('Error generating activation code:', error);
      toast.error(error.message || 'Failed to generate activation code');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (activationCode) {
      await navigator.clipboard.writeText(activationCode);
      setCopied(true);
      toast.success('Activation code copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadQR = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `activation-code-${deviceId}.png`;
      link.href = qrCodeUrl;
      link.click();
      toast.success('QR code downloaded');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <QrCode className="h-5 w-5" />
          Generate Activation Code
        </CardTitle>
        <CardDescription>
          Generate activation codes for devices. Only developers can access this feature.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deviceId">Device ID</Label>
          <div className="flex gap-2">
            <Input
              id="deviceId"
              placeholder="Enter device ID (e.g., 100001)"
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            />
            <Button 
              onClick={handleGenerate} 
              disabled={isGenerating || !deviceId.trim()}
            >
              {isGenerating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>

        {activationCode && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label>Activation Code</Label>
              <div className="flex items-center gap-2">
                <Input 
                  value={activationCode} 
                  readOnly 
                  className="font-mono text-lg"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {qrCodeUrl && (
              <div className="space-y-2">
                <Label>QR Code</Label>
                <div className="flex flex-col items-center gap-2">
                  <img 
                    src={qrCodeUrl} 
                    alt="Activation QR Code" 
                    className="border rounded-lg p-2 bg-white"
                  />
                  <Button
                    variant="outline"
                    onClick={handleDownloadQR}
                    size="sm"
                  >
                    Download QR Code
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}