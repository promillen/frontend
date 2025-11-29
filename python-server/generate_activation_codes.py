#!/usr/bin/env python3
"""
Generate activation codes for IoT devices and create printable labels with QR codes.

This script:
1. Generates HMAC-SHA256 activation codes for device IDs
2. Stores them in Supabase device_activations table
3. Creates printable PDF labels with QR codes

Usage:
    python generate_activation_codes.py --device-ids 100001,100002,100003
    python generate_activation_codes.py --range 100001-100010
    python generate_activation_codes.py --csv devices.csv
"""

import os
import hmac
import hashlib
import argparse
import csv
from typing import List, Tuple
from datetime import datetime

try:
    from supabase import create_client, Client
    import qrcode
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.units import inch
    from reportlab.pdfgen import canvas
    from reportlab.lib.utils import ImageReader
    from dotenv import load_dotenv
except ImportError as e:
    print(f"Missing required package: {e}")
    print("\nPlease install required packages:")
    print("pip install supabase qrcode[pil] reportlab python-dotenv")
    exit(1)

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
ACTIVATION_SECRET = os.getenv("ACTIVATION_SECRET")

if not all([SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ACTIVATION_SECRET]):
    print("Error: Missing required environment variables")
    print("Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ACTIVATION_SECRET")
    exit(1)

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


def generate_activation_code(device_id: str) -> str:
    """
    Generate activation code using HMAC-SHA256.
    Format: XXXX-XXXX-XXXX-XXXX (first 16 hex chars of HMAC)
    """
    hmac_hash = hmac.new(
        ACTIVATION_SECRET.encode(),
        device_id.encode(),
        hashlib.sha256
    ).hexdigest()
    
    # Take first 16 characters and format
    code_raw = hmac_hash[:16].upper()
    activation_code = f"{code_raw[0:4]}-{code_raw[4:8]}-{code_raw[8:12]}-{code_raw[12:16]}"
    
    return activation_code


def check_device_exists(device_id: str) -> bool:
    """Check if device exists in device_config table."""
    try:
        response = supabase.table('device_config').select('devid').eq('devid', device_id).execute()
        return len(response.data) > 0
    except Exception as e:
        print(f"Error checking device {device_id}: {e}")
        return False


def save_activation_code(device_id: str, activation_code: str) -> Tuple[bool, str]:
    """
    Save activation code to database.
    Returns (success, message)
    """
    try:
        # Check if already exists
        existing = supabase.table('device_activations').select('*').eq('device_id', device_id).execute()
        
        if existing.data:
            return False, f"Activation code already exists for device {device_id}: {existing.data[0]['activation_code']}"
        
        # Insert new activation
        supabase.table('device_activations').insert({
            'device_id': device_id,
            'activation_code': activation_code,
            'claimed': False
        }).execute()
        
        return True, f"Activation code saved for device {device_id}"
        
    except Exception as e:
        return False, f"Error saving activation code for device {device_id}: {e}"


def generate_qr_code(activation_code: str, output_path: str):
    """Generate QR code image for activation code."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=10,
        border=4,
    )
    qr.add_data(activation_code)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    img.save(output_path)


def create_labels_pdf(devices: List[Tuple[str, str]], output_filename: str):
    """
    Create a PDF with printable labels.
    Each label contains: Device ID, Activation Code, and QR Code.
    """
    c = canvas.Canvas(output_filename, pagesize=letter)
    width, height = letter
    
    # Label dimensions (4 per page, 2x2 grid)
    label_width = width / 2
    label_height = height / 2
    
    positions = [
        (0, height / 2),  # Top-left
        (width / 2, height / 2),  # Top-right
        (0, 0),  # Bottom-left
        (width / 2, 0),  # Bottom-right
    ]
    
    for idx, (device_id, activation_code) in enumerate(devices):
        if idx > 0 and idx % 4 == 0:
            c.showPage()
        
        pos_idx = idx % 4
        x, y = positions[pos_idx]
        
        # Add border
        c.rect(x + 0.25*inch, y + 0.25*inch, label_width - 0.5*inch, label_height - 0.5*inch)
        
        # Device ID (large, top)
        c.setFont("Helvetica-Bold", 24)
        c.drawCentredString(x + label_width/2, y + label_height - inch, f"Device: {device_id}")
        
        # Activation code (medium, below device ID)
        c.setFont("Courier-Bold", 16)
        c.drawCentredString(x + label_width/2, y + label_height - 1.5*inch, activation_code)
        
        # Generate and add QR code
        qr_temp_path = f"/tmp/qr_{device_id}.png"
        generate_qr_code(activation_code, qr_temp_path)
        
        qr_size = 1.5 * inch
        c.drawImage(
            qr_temp_path,
            x + (label_width - qr_size) / 2,
            y + 0.5*inch,
            width=qr_size,
            height=qr_size
        )
        
        # Clean up temp QR code
        os.remove(qr_temp_path)
    
    c.save()
    print(f"\nLabels PDF created: {output_filename}")


def parse_device_ids(args) -> List[str]:
    """Parse device IDs from command line arguments."""
    device_ids = []
    
    if args.device_ids:
        device_ids = [did.strip() for did in args.device_ids.split(',')]
    
    elif args.range:
        try:
            start, end = args.range.split('-')
            device_ids = [str(i) for i in range(int(start), int(end) + 1)]
        except ValueError:
            print("Error: Range must be in format START-END (e.g., 100001-100010)")
            exit(1)
    
    elif args.csv:
        try:
            with open(args.csv, 'r') as f:
                reader = csv.reader(f)
                device_ids = [row[0].strip() for row in reader if row]
        except FileNotFoundError:
            print(f"Error: CSV file not found: {args.csv}")
            exit(1)
    
    return device_ids


def main():
    parser = argparse.ArgumentParser(description='Generate activation codes for IoT devices')
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument('--device-ids', help='Comma-separated device IDs (e.g., 100001,100002)')
    group.add_argument('--range', help='Range of device IDs (e.g., 100001-100010)')
    group.add_argument('--csv', help='CSV file with device IDs (one per line)')
    parser.add_argument('--skip-pdf', action='store_true', help='Skip PDF label generation')
    parser.add_argument('--output', default='activation_labels.pdf', help='Output PDF filename')
    
    args = parser.parse_args()
    
    device_ids = parse_device_ids(args)
    
    if not device_ids:
        print("Error: No device IDs provided")
        exit(1)
    
    print(f"\nProcessing {len(device_ids)} device(s)...\n")
    
    results = []
    success_count = 0
    
    for device_id in device_ids:
        print(f"Processing device {device_id}...")
        
        # Check if device exists
        if not check_device_exists(device_id):
            print(f"  ⚠️  Warning: Device {device_id} not found in device_config table")
            print(f"     Add the device to device_config first")
            continue
        
        # Generate activation code
        activation_code = generate_activation_code(device_id)
        print(f"  Generated code: {activation_code}")
        
        # Save to database
        success, message = save_activation_code(device_id, activation_code)
        print(f"  {message}")
        
        if success:
            results.append((device_id, activation_code))
            success_count += 1
    
    print(f"\n✅ Successfully generated {success_count} activation code(s)")
    
    # Generate PDF labels
    if results and not args.skip_pdf:
        print("\nGenerating PDF labels...")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_filename = f"{args.output.replace('.pdf', '')}_{timestamp}.pdf"
        create_labels_pdf(results, output_filename)
    
    print("\n✅ Done!")


if __name__ == '__main__':
    main()
