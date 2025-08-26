# Fly.io Server Setup & Deployment Guide

## Overview

Fly.io hosts your Python CoAP server that acts as a bridge between IoT devices and Supabase. This guide covers setup, deployment, monitoring, and troubleshooting.

## What is Fly.io?

Fly.io is a cloud platform that runs your applications close to users worldwide. In your IoT system, it:
- Hosts the Python CoAP server
- Receives UDP/CoAP messages from IoT devices
- Processes protobuf data
- Forwards data securely to Supabase Edge Functions
- Handles HMAC signature generation for security

## Initial Setup

### 1. Install Fly.io CLI
```bash
# macOS
brew install flyctl

# Linux/Windows
curl -L https://fly.io/install.sh | sh
```

### 2. Login to Fly.io
```bash
flyctl auth login
```

### 3. Create Fly.io App (if not already done)
```bash
cd python-server
flyctl launch
```

This creates:
- `fly.toml` configuration file
- App name (e.g., `your-iot-app`)
- Initial deployment

### 4. Set Environment Variables
```bash
# Set the secret used for HMAC signing
flyctl secrets set FLY_INGEST_SECRET="your-secret-here"

# Set Supabase connection details
flyctl secrets set SUPABASE_URL="https://cdwtsrzshpotkfbyyyjk.supabase.co"
flyctl secrets set SUPABASE_ANON_KEY="your-anon-key"
```

## Deployment

### Deploy Your Python Server
```bash
cd python-server
flyctl deploy
```

This will:
1. Build your Python application
2. Deploy to Fly.io infrastructure
3. Start the CoAP server on port 5683
4. Make it accessible at `your-app.fly.dev:5683`

### Verify Deployment
```bash
# Check app status
flyctl status

# View logs
flyctl logs

# Check if CoAP port is accessible
nc -u your-app.fly.dev 5683
```

## Configuration Files

### fly.toml
```toml
app = "your-iot-app"
primary_region = "iad"

[build]

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

[[services]]
  protocol = "udp"
  internal_port = 5683
  
  [[services.ports]]
    port = 5683

[env]
  PORT = "8080"
```

### Dockerfile (if using Docker)
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 5683/udp

CMD ["python", "main.py"]
```

## Monitoring & Logging

### View Real-time Logs
```bash
# Follow logs in real-time
flyctl logs -a your-app

# Filter logs
flyctl logs -a your-app | grep "ERROR"
flyctl logs -a your-app | grep "Received payload"
```

### Check Application Metrics
```bash
# App status and health
flyctl status -a your-app

# Scale information
flyctl scale show -a your-app

# Machine information
flyctl machines list -a your-app
```

### Log Examples
Your Python server logs will show:
```
[14:30:25] INFO - CoAP server running on coap://0.0.0.0:5683/uplink
[14:30:45] INFO - Received payload: a1b2c3d4e5f6...
[14:30:45] INFO - Parsed DeviceConfig: devid: "soil_001" temperature: 23.5
[14:30:45] INFO - Successfully stored to Supabase
```

## Troubleshooting

### Common Issues

**1. CoAP Port Not Accessible**
```bash
# Check if UDP port 5683 is properly configured
flyctl status -a your-app

# Verify fly.toml has UDP service configured
# Add this to fly.toml if missing:
[[services]]
  protocol = "udp"
  internal_port = 5683
  [[services.ports]]
    port = 5683
```

**2. Environment Variables Not Set**
```bash
# List current secrets
flyctl secrets list -a your-app

# Set missing secrets
flyctl secrets set FLY_INGEST_SECRET="your-secret" -a your-app
```

**3. Python Dependencies Issues**
```bash
# Check if requirements.txt is complete
cat requirements.txt

# Common dependencies needed:
# aiocoap
# colorlog
# supabase
# protobuf
```

**4. Memory/Resource Issues**
```bash
# Scale up if needed
flyctl scale memory 512 -a your-app
flyctl scale count 2 -a your-app
```

### Debug Mode
Enable debug logging in your Python server:
```python
# In main.py, set logging level to DEBUG
logger.setLevel(logging.DEBUG)
```

## Security Considerations

### HMAC Secret Management
- Never hardcode secrets in your code
- Use `flyctl secrets set` to manage sensitive data
- Rotate secrets periodically
- Use different secrets for development/production

### Network Security
- CoAP traffic is unencrypted (by design for IoT)
- Security is handled via HMAC signatures
- All HTTP traffic to Supabase uses HTTPS/TLS

## Scaling & Performance

### Auto-scaling Configuration
```toml
# In fly.toml
[http_service]
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1
  max_machines_running = 5
```

### Regional Deployment
```bash
# Deploy to multiple regions for better latency
flyctl regions add lhr sea -a your-app
flyctl regions remove iad -a your-app
```

### Performance Monitoring
```bash
# Check resource usage
flyctl metrics -a your-app

# View machine performance
flyctl machines list -a your-app
```

## Update & Maintenance

### Regular Updates
1. Update Python dependencies
2. Test locally first
3. Deploy with `flyctl deploy`
4. Monitor logs for issues
5. Rollback if needed: `flyctl releases rollback`

### Backup Strategy
- Your code is in version control
- Fly.io handles infrastructure backups
- Database backups are handled by Supabase
- Keep your `fly.toml` and deployment scripts in git

## Cost Optimization

### Resource Management
```bash
# Check current usage and costs
flyctl scale show -a your-app

# Optimize for cost (small IoT workloads)
flyctl scale memory 256 -a your-app
flyctl scale count 1 -a your-app
```

### Sleep Policies
```toml
# In fly.toml - machines sleep when idle
[http_service]
  auto_stop_machines = true
  min_machines_running = 0  # Allow sleeping when idle
```

This saves costs when devices aren't actively sending data.