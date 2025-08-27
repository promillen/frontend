# Testing Guide

## Local Testing

### Frontend Testing
```bash
npm run dev
npm run build
```

### Backend Testing
```bash
cd python-server
python test_supabase.py
```

## Integration Testing

### Device Simulation
Test CoAP endpoints with sample data to verify the complete pipeline.

### End-to-End Testing
1. Send test data from device simulator
2. Verify data appears in Supabase
3. Check dashboard displays data correctly

For detailed testing procedures, see [Development Guide](../DEVELOPMENT_GUIDE.md).