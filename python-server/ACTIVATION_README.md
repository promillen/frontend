# Device Activation Code Generator

Generate activation codes for IoT devices with printable QR code labels.

## Setup

1. Install dependencies:
```bash
pip install -r requirements-activation.txt
```

2. Configure environment variables in `.env`:
```
SUPABASE_URL=https://cdwtsrzshpotkfbyyyjk.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ACTIVATION_SECRET=your_activation_secret
```

## Usage

### Generate for specific device IDs:
```bash
python generate_activation_codes.py --device-ids 100001,100002,100003
```

### Generate for a range of devices:
```bash
python generate_activation_codes.py --range 100001-100050
```

### Generate from CSV file:
```bash
python generate_activation_codes.py --csv devices.csv
```

### Skip PDF generation (database only):
```bash
python generate_activation_codes.py --device-ids 100001,100002 --skip-pdf
```

### Custom PDF output filename:
```bash
python generate_activation_codes.py --range 100001-100010 --output my_labels.pdf
```

## CSV Format

Create a CSV file with one device ID per line:
```
100001
100002
100003
```

## Output

The script will:
1. ✅ Generate HMAC-SHA256 activation codes
2. ✅ Save codes to `device_activations` table in Supabase
3. ✅ Create a printable PDF with QR codes (unless `--skip-pdf`)
4. ✅ Each label includes: Device ID, Activation Code, and QR Code

## PDF Labels

- 4 labels per page (2x2 grid)
- Each label contains:
  - Device ID (large text)
  - Activation Code (formatted: XXXX-XXXX-XXXX-XXXX)
  - QR Code (scannable)

## Notes

- The script checks if devices exist in `device_config` table before generating codes
- Existing activation codes are not overwritten
- All codes are deterministic (same device ID = same code)
- QR codes can be scanned by users to claim devices
