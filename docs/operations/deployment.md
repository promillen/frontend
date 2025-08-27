# Deployment Guide

## Overview

This guide covers the deployment procedures for the complete IoT Device Management System, including Fly.io infrastructure, Supabase configuration, and frontend deployment.

## Prerequisites

### Required Tools
```bash
# Install Fly.io CLI
curl -L https://fly.io/install.sh | sh

# Install Supabase CLI
npm install -g supabase@latest

# Install Node.js and npm
# Visit https://nodejs.org/ for installation
```

### Required Accounts
- [Fly.io Account](https://fly.io/app/sign-up)
- [Supabase Account](https://supabase.com/dashboard)
- [HERE Developer Account](https://developer.here.com/)
- GitHub account for source control

### Environment Setup
```bash
# Clone repository
git clone https://github.com/your-org/iot-device-management
cd iot-device-management

# Install dependencies
npm install
```

## Fly.io Deployment

### Initial Setup

1. **Login to Fly.io**
```bash
flyctl auth login
```

2. **Create New App**
```bash
cd python-server
flyctl apps create your-coap-server
```

3. **Configure Environment Variables**
```bash
# Set Supabase connection
flyctl secrets set SUPABASE_URL="https://cdwtsrzshpotkfbyyyjk.supabase.co"
flyctl secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Set security keys
flyctl secrets set FLY_INGEST_SECRET="your-hmac-secret-key"

# Optional: Set logging level
flyctl secrets set LOG_LEVEL="INFO"
```

4. **Deploy Server**
```bash
flyctl deploy
```

### Verify Deployment

```bash
# Check app status
flyctl status

# View logs
flyctl logs

# Test CoAP endpoint
flyctl ssh console
nc -u your-app.fly.dev 5683
```

### Scaling Configuration

```bash
# Set auto-scaling
flyctl scale count 2-10

# Set VM resources
flyctl scale vm shared-cpu-1x

# Regional deployment
flyctl regions add ord lax
```

## Supabase Configuration

### Database Setup

1. **Create Supabase Project**
   - Visit [Supabase Dashboard](https://supabase.com/dashboard)
   - Click "New Project"
   - Configure project settings

2. **Run Database Migrations**
```bash
# Initialize Supabase locally
supabase init

# Link to remote project
supabase link --project-ref cdwtsrzshpotkfbyyyjk

# Apply migrations
supabase db push
```

3. **Configure Row Level Security**
```sql
-- Enable RLS on all tables
ALTER TABLE device_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE sensor_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Apply security policies (see database schema docs)
```

### Edge Functions Deployment

1. **Configure Function Secrets**
```bash
# Set HERE API key
supabase secrets set HERE_API_KEY="your-here-api-key"

# Set Fly.io verification secret
supabase secrets set FLY_INGEST_SECRET="your-hmac-secret-key"

# Set Supabase keys (if needed for internal calls)
supabase secrets set SUPABASE_URL="https://cdwtsrzshpotkfbyyyjk.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

2. **Deploy Edge Functions**
```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy ingest-sensor-data
```

3. **Verify Function Deployment**
```bash
# Test function locally
supabase functions serve

# Test deployed function
curl -X POST \
  https://cdwtsrzshpotkfbyyyjk.supabase.co/functions/v1/ingest-sensor-data \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=test" \
  -d '{"devid": "test", "location": {}}'
```

### Authentication Setup

1. **Configure Auth Providers**
   - Visit Auth > Providers in Supabase Dashboard
   - Enable Email/Password authentication
   - Configure OAuth providers if needed

2. **Set Auth Policies**
```sql
-- Create default user role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
```

## Frontend Deployment

### Build Configuration

1. **Environment Variables**
```bash
# Create .env.local (for local development)
VITE_SUPABASE_URL=https://cdwtsrzshpotkfbyyyjk.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

2. **Build Application**
```bash
npm run build
```

### Deployment Options

#### Option 1: Vercel Deployment
```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
```

#### Option 2: Netlify Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod

# Set environment variables in Netlify dashboard
```

#### Option 3: GitHub Pages
```bash
# Install gh-pages
npm install -g gh-pages

# Deploy
npm run build
gh-pages -d dist
```

## SSL/TLS Configuration

### Fly.io HTTPS
```bash
# Fly.io automatically provides HTTPS certificates
# Verify certificate
curl -I https://your-app.fly.dev
```

### Custom Domain (Optional)
```bash
# Add custom domain
flyctl certs add your-domain.com

# Verify DNS configuration
flyctl certs show your-domain.com
```

## Monitoring Setup

### Application Monitoring

1. **Fly.io Metrics**
```bash
# View metrics dashboard
flyctl dashboard

# Set up alerts
flyctl webhooks create --name alerts --url https://your-webhook-url
```

2. **Supabase Monitoring**
   - Visit Dashboard > Logs
   - Configure log retention
   - Set up database performance monitoring

### Health Checks

1. **Fly.io Health Check**
```toml
# fly.toml
[http_service]
  internal_port = 8080
  force_https = true
  
  [http_service.http_checks]
    [http_service.http_checks.health]
      path = "/health"
      interval = "10s"
      timeout = "2s"
```

2. **Edge Function Health Check**
```javascript
// Add to Edge Function
if (req.method === 'GET' && new URL(req.url).pathname === '/health') {
  return new Response('OK', { status: 200 });
}
```

### Log Aggregation

1. **Centralized Logging**
```bash
# Stream logs to external service
flyctl logs --app your-app | logger -t flyio

# Set up log forwarding (optional)
flyctl scale vm shared-cpu-1x --vm-memory 512
```

2. **Supabase Logs**
   - Access via Dashboard > Logs
   - Configure log exports
   - Set up alerts for errors

## Backup Procedures

### Database Backups
```bash
# Manual backup
supabase db dump --file backup.sql

# Automated backups (configured in Supabase dashboard)
# - Daily backups enabled by default
# - Point-in-time recovery available
# - Download backups via dashboard
```

### Configuration Backups
```bash
# Export secrets (store securely)
flyctl secrets list

# Backup Supabase configuration
supabase db dump --schema-only --file schema-backup.sql
supabase functions download
```

## Rollback Procedures

### Fly.io Rollback
```bash
# List recent deployments
flyctl releases

# Rollback to previous version
flyctl releases rollback --version 42
```

### Supabase Rollback
```bash
# Database rollback (point-in-time recovery)
# Available through Supabase dashboard under Database > Backups

# Edge Function rollback
git checkout previous-version
supabase functions deploy
```

### Frontend Rollback
```bash
# Vercel
vercel rollback

# Netlify
netlify sites:list
netlify api rollbackSiteDeploy --site-id xxx --deploy-id xxx
```

## Post-Deployment Verification

### System Health Checks

1. **CoAP Server Test**
```bash
# Test CoAP endpoint
echo "test" | nc -u your-app.fly.dev 5683
```

2. **Edge Function Test**
```bash
curl -X POST \
  https://cdwtsrzshpotkfbyyyjk.supabase.co/functions/v1/ingest-sensor-data \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

3. **Database Connectivity**
```bash
# Test database connection
supabase db ping
```

4. **Frontend Test**
```bash
# Test frontend deployment
curl -I https://your-frontend-url.com
```

### Performance Verification

1. **Load Testing**
```bash
# Install Artillery
npm install -g artillery

# Create load test config
cat > load-test.yml << EOF
config:
  target: 'https://your-app.fly.dev'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "CoAP simulation"
    requests:
      - post:
          url: "/ingest"
          json:
            devid: "test-device"
            location: {}
EOF

# Run load test
artillery run load-test.yml
```

2. **Database Performance**
```sql
-- Check query performance
EXPLAIN ANALYZE SELECT * FROM sensor_data WHERE devid = 'test' ORDER BY timestamp DESC LIMIT 100;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes;
```

## Troubleshooting

### Common Issues

1. **Fly.io App Won't Start**
```bash
# Check logs
flyctl logs --app your-app

# Common fixes
flyctl restart
flyctl scale count 1
```

2. **Edge Function Errors**
```bash
# Check function logs
supabase functions logs --filter edge-function-name

# Common fixes
supabase secrets list  # Verify secrets
supabase functions deploy  # Redeploy
```

3. **Database Connection Issues**
```bash
# Check database status
supabase db status

# Reset database password
supabase db reset
```

### Emergency Procedures

1. **System Outage**
```bash
# Scale up Fly.io app
flyctl scale count 5

# Check Supabase status
curl https://status.supabase.com/api/v2/status.json
```

2. **Data Loss Prevention**
```bash
# Immediate backup
supabase db dump --file emergency-backup-$(date +%Y%m%d_%H%M%S).sql

# Stop writes if needed
flyctl scale count 0
```

## Security Checklist

- [ ] All secrets properly configured
- [ ] HTTPS enabled on all services
- [ ] Database RLS policies active
- [ ] Rate limiting configured
- [ ] Regular security updates scheduled
- [ ] Backup procedures tested
- [ ] Monitoring alerts configured
- [ ] Access logs enabled
- [ ] API keys rotated regularly
- [ ] Network security groups configured