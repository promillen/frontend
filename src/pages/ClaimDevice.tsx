import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ClaimDeviceDialog } from '@/components/ClaimDeviceDialog';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const ClaimDevice = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const activationCode = searchParams.get('code');

  useEffect(() => {
    if (activationCode) {
      setIsDialogOpen(true);
    }
  }, [activationCode]);

  const handleDeviceClaimed = () => {
    navigate('/');
  };

  const handleClose = () => {
    setIsDialogOpen(false);
    navigate('/');
  };

  if (!activationCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              No activation code provided. Please scan a valid QR code or use a proper activation link.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/')} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Claim Your Device</CardTitle>
            <CardDescription>
              You're about to claim a device. Please confirm the activation code to proceed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Activation Code:</p>
                <p className="font-mono text-lg font-semibold">{activationCode}</p>
              </div>
              <Button onClick={() => setIsDialogOpen(true)} className="w-full">
                Continue to Claim Device
              </Button>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ClaimDeviceDialog
        isOpen={isDialogOpen}
        onClose={handleClose}
        onDeviceClaimed={handleDeviceClaimed}
        prefilledCode={activationCode}
      />
    </>
  );
};

export default ClaimDevice;
