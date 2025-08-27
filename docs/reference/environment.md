# Environment Variables

## Fly.io Server Environment

### Required Variables
```bash
FLY_INGEST_SECRET=your-secret-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Setting Variables
```bash
flyctl secrets set FLY_INGEST_SECRET="your-secret" -a your-app
flyctl secrets set SUPABASE_URL="https://your-project.supabase.co" -a your-app
flyctl secrets set SUPABASE_ANON_KEY="your-anon-key" -a your-app
```

## Frontend Environment

### Development (.env.local)
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Security Notes

- Never commit secrets to version control
- Use different secrets for development/production
- Rotate secrets periodically
- Use secure secret management in production

For deployment details, see [Fly.io Setup](../FLYIO_SETUP.md).