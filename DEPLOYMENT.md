# Deploying LabCart to Cloudflare Pages

## Prerequisites

1. Cloudflare account with access to `labcart.io` domain
2. GitHub repository connected to Cloudflare Pages
3. Supabase database access

## Step 1: Create the Database Table

Run the SQL in Supabase SQL Editor:

```bash
# Copy the SQL to clipboard
cat scripts/create-install-tokens-table.sql | pbcopy
```

Then paste and run in Supabase SQL Editor at:
https://supabase.com/dashboard/project/maaotshzykjncoifrbmj/sql

## Step 2: Configure Cloudflare Pages

1. Go to Cloudflare Dashboard → Pages
2. Create new project or select existing
3. Connect to your GitHub repository

### Build Configuration:

- **Framework preset**: Next.js
- **Build command**: `npm run build`
- **Build output directory**: `.next`
- **Node version**: 20.x (or latest LTS)

### Environment Variables:

Add these in Cloudflare Pages → Settings → Environment Variables:

```bash
# Public variables
NEXT_PUBLIC_SUPABASE_URL=https://maaotshzykjncoifrbmj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMDM1OTUsImV4cCI6MjA3Nzc3OTU5NX0.gtv5duMO1_eRsDkuzrMIWqSira1CnnImQagGTEXepVs
NEXT_PUBLIC_BASE_URL=https://labcart.io

# Secret variables (encrypt these)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hYW90c2h6eWtqbmNvaWZyYm1qIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjIwMzU5NSwiZXhwIjoyMDc3Nzc5NTk1fQ.AHec7PwTI21iaiHVG2pBAfXWUwbocvlM4aok-AxKzF0
```

## Step 3: Configure Custom Domain

1. In Cloudflare Pages → Custom domains
2. Add `labcart.io`
3. Add `www.labcart.io` (optional)
4. DNS should auto-configure

## Step 4: Update Supabase Auth Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

Add to **Redirect URLs**:
- `https://labcart.io/auth/callback`
- `https://labcart.io/*` (wildcard for OAuth)

## Step 5: Deploy

Push to your main branch:

```bash
git add .
git commit -m "Configure Cloudflare Pages deployment"
git push origin main
```

Cloudflare Pages will automatically build and deploy.

## Step 6: Test the Flow

1. Visit https://labcart.io/login
2. Log in with GitHub
3. Click "Generate Install Command"
4. Copy the command and run it on a server
5. Verify bot server registers successfully

## Troubleshooting

### Build fails on Cloudflare Pages

- Check Node version is 20.x or higher
- Verify all environment variables are set
- Check build logs for missing dependencies

### Install command fails

- Verify `NEXT_PUBLIC_BASE_URL` is set to `https://labcart.io`
- Check that the `/api/install/[token]` endpoint is accessible
- Verify Supabase service role key is correct

### Bot server can't register

- Check that bot server has correct `COORDINATION_URL`
- Should be: `https://labcart.io/api/servers/register`
- Verify firewall allows outbound HTTPS

## Next Steps

After successful deployment:

1. Test install flow from a clean VPS
2. Monitor Cloudflare Pages logs for errors
3. Set up analytics/monitoring
4. Consider adding rate limiting to install endpoint
