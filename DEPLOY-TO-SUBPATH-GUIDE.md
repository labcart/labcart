# Deploying Next.js + OpenNext Cloudflare to a Subpath

**Guide for deploying labcart to `labcart.io/ide` and marketplace to `labcart.io/marketplace`**

This guide documents the complete process for deploying a Next.js app using `@opennextjs/cloudflare` to a subpath (like `/ide` or `/marketplace`) instead of the domain root.

---

## Why This Is Needed

By default, Cloudflare Workers are deployed to handle an entire domain. To run multiple Next.js apps on the same domain at different paths (like `labcart.io/ide` and `labcart.io/marketplace`), each app needs to be configured with a `basePath`.

---

## Prerequisites

- Next.js app using `@opennextjs/cloudflare` adapter
- Wrangler for Cloudflare Workers deployment
- Supabase for authentication (if using OAuth)

---

## Step 1: Update Next.js Configuration

### File: `next.config.ts`

Add the `basePath` configuration:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/ide',  // Change to '/marketplace' for marketplace app
  env: {
    NEXT_PUBLIC_BASE_PATH: '/ide'  // Expose basePath as env variable
  },
  images: {
    unoptimized: true
  }
};

export default nextConfig;
```

**What this does:**
- `basePath` tells Next.js that all routes are prefixed with `/ide`
- `env.NEXT_PUBLIC_BASE_PATH` makes it available to client-side code
- OpenNext's routing system automatically handles the basePath for pages, static assets, and navigation

---

## Step 2: Update Wrangler Configuration

### File: `wrangler.jsonc`

Update the `NEXT_PUBLIC_BASE_URL` environment variable:

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/cloudflare/workers-sdk/main/packages/wrangler/config-schema.json",
  "name": "labcart",  // Change to "labcart-marketplace" for marketplace
  "main": ".open-next/worker.js",
  "compatibility_date": "2024-09-23",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets"
  },
  "vars": {
    "NEXT_PUBLIC_SUPABASE_URL": "https://your-project.supabase.co",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "your-anon-key",
    "NEXT_PUBLIC_BASE_URL": "https://labcart.io/ide"  // Add the subpath
  }
}
```

**Important:** Change the worker `name` to be unique (e.g., `labcart-marketplace`) to avoid conflicts.

---

## Step 3: Create API Client Helper

### File: `lib/api-client.ts` (NEW FILE)

Create a helper to handle internal API route calls with basePath:

```typescript
/**
 * API Client Utility
 *
 * Handles basePath prefix for internal API routes
 */

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Constructs full API URL with basePath prefix
 * @param path - API route path (e.g., '/api/workspace/state')
 * @returns Full URL with basePath prefix
 */
export function apiUrl(path: string): string {
  return `${BASE_PATH}${path}`;
}

/**
 * Fetch wrapper that automatically applies basePath
 * @param path - API route path
 * @param init - Fetch options
 * @returns Fetch promise
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(apiUrl(path), init);
}
```

**Why this is needed:**
- Browser `fetch()` doesn't know about Next.js basePath
- Internal API calls like `fetch('/api/bots')` need to become `fetch('/ide/api/bots')`
- This helper centralizes the logic

---

## Step 4: Update All Internal API Calls

Find all `fetch('/api/...)` calls and replace with `apiFetch()`:

### Example: Before
```typescript
const response = await fetch('/api/workspace/state', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

### Example: After
```typescript
const { apiFetch } = await import('@/lib/api-client');
const response = await apiFetch('/api/workspace/state', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
});
```

### Files That Need Updates

In the labcart project, we updated these files:
1. `store/tabStore.ts` - workspace state saving
2. `components/WorkspacePanel.tsx` - file saving
3. `components/FileExplorer.tsx` - file operations (rename, delete, create)
4. `app/page.tsx` - workspace identification
5. `app/login/page.tsx` - install token generation
6. `app/migrate/page.tsx` - bot migration

**Search pattern to find all calls:**
```bash
grep -r "fetch('/api/" --include="*.ts" --include="*.tsx"
```

---

## Step 5: Fix OAuth Redirect URLs

### File: `app/login/page.tsx`

Update the OAuth redirect to include basePath:

```typescript
const handleGitHubLogin = async () => {
  setLoading(true);
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}${basePath}/auth/callback`,
      skipBrowserRedirect: false,
      queryParams: {
        prompt: 'select_account',
      },
    },
  });
  // ... rest of code
};
```

---

## Step 6: Update Supabase Settings

In your Supabase dashboard (https://supabase.com/dashboard):

1. Go to **Authentication → URL Configuration**
2. Update **Site URL**: `https://labcart.io/ide`
3. Add **Redirect URLs**:
   - `https://labcart.io/ide/auth/callback`
   - `http://localhost:3000/auth/callback` (for local dev)

**Without this, OAuth login will fail with 404 on callback.**

---

## Step 7: Build and Deploy

```bash
cd /path/to/your/project
npm run deploy
```

This runs:
1. `opennextjs-cloudflare build` - Builds the Next.js app with basePath
2. `opennextjs-cloudflare deploy` - Deploys to Cloudflare Workers

**Verify the build:**
- Check that assets are uploaded with the correct prefix (e.g., `/ide/_next/static/...`)
- Note the deployed worker URL

---

## Step 8: Configure Cloudflare Routing (If Using Custom Domain)

If you're using `labcart.io` (custom domain):

1. Go to Cloudflare Dashboard → Workers & Pages
2. Configure **Routes** to send traffic to the correct worker:
   - Route: `labcart.io/ide/*` → Worker: `labcart`
   - Route: `labcart.io/marketplace/*` → Worker: `labcart-marketplace`

**Note:** You might need Cloudflare Workers for Platforms or multiple workers on a paid plan.

---

## Step 9: Test the Deployment

### 1. Test Login Flow
1. Visit `https://labcart.io/ide/login`
2. Click "Login with GitHub"
3. Should redirect to `https://labcart.io/ide/auth/callback` after OAuth

### 2. Test API Routes
1. Open browser DevTools → Network tab
2. Use the app (save files, create workspaces, etc.)
3. Verify API calls go to `/ide/api/...` and return 200 (not 404)

### 3. Test Install Script
1. Generate a fresh install token at `/ide/login`
2. Run the install command
3. Verify `.env` has: `COORDINATION_URL=https://labcart.io/ide/api/servers/register`
4. Check bot server starts successfully

---

## Common Issues & Solutions

### Issue: API routes return 404
**Cause:** Internal `fetch()` calls not using `apiFetch()` helper
**Solution:** Search for `fetch('/api/` and update to use `apiFetch()`

### Issue: OAuth redirects to wrong URL
**Cause:** Supabase redirect URLs not updated
**Solution:** Update Supabase dashboard with `/ide/auth/callback`

### Issue: Install script has wrong COORDINATION_URL
**Cause:** Using an old install token generated before basePath changes
**Solution:** Generate a new token after deploying the updated app

### Issue: Static assets (images, CSS) return 404
**Cause:** Usually Next.js handles this automatically with basePath
**Solution:** Rebuild and redeploy - OpenNext should handle it

### Issue: Links/navigation broken
**Cause:** Using hardcoded `href="/somewhere"` instead of Next.js `<Link>`
**Solution:** Use Next.js `<Link>` component or `next/router` for navigation

---

## Checklist for New Subpath Deployment

When deploying to `/marketplace` or another subpath:

- [ ] Update `basePath` in `next.config.ts`
- [ ] Update `NEXT_PUBLIC_BASE_PATH` env in `next.config.ts`
- [ ] Update `NEXT_PUBLIC_BASE_URL` in `wrangler.jsonc`
- [ ] Change worker `name` in `wrangler.jsonc` to be unique
- [ ] Copy `lib/api-client.ts` if not already present
- [ ] Update all `fetch('/api/...)` calls to use `apiFetch()`
- [ ] Update OAuth redirect URL in login code
- [ ] Update Supabase redirect URLs in dashboard
- [ ] Build and deploy: `npm run deploy`
- [ ] Test login flow
- [ ] Test API routes in browser DevTools
- [ ] Generate fresh install token and test install

---

## Architecture Notes

### How OpenNext Handles basePath

OpenNext's custom routing layer (documented at https://opennext.js.org/aws/inner_workings/routing) handles:
- **basePath support** - Routes under URL subpaths
- **Headers, Redirects, Rewrites** - From `next.config.js`
- **Middleware** - With full Node.js API access
- **Cache Interception** - Serving ISR/SSG without backend calls

**Key Point:** Next.js's `basePath` config is automatically respected by OpenNext's routing system for:
- Page routes
- Static assets
- Navigation (using Next.js Link/Router)

**But NOT for:**
- Raw `fetch()` calls to internal APIs (needs helper)
- OAuth redirects with `window.location.origin` (needs manual concatenation)

### Multiple Apps on Same Domain

Each app becomes a separate Cloudflare Worker:
- `labcart` worker → handles `/ide/*`
- `labcart-marketplace` worker → handles `/marketplace/*`

Both can be deployed independently and share the same Supabase backend.

---

## Local Development

To test locally with basePath:

```bash
npm run dev
# Access at: http://localhost:3000/ide
```

All routes will be prefixed with `/ide` even in development.

---

## References

- OpenNext Cloudflare: https://opennext.js.org/cloudflare
- OpenNext Routing: https://opennext.js.org/aws/inner_workings/routing
- Next.js basePath: https://nextjs.org/docs/app/api-reference/next-config-js/basePath
- Wrangler Config: https://developers.cloudflare.com/workers/wrangler/configuration/

---

## Template for Quick Deployment

```bash
# 1. Update configs
# - next.config.ts: basePath, env.NEXT_PUBLIC_BASE_PATH
# - wrangler.jsonc: name, vars.NEXT_PUBLIC_BASE_URL

# 2. Copy API helper (if new project)
cp lib/api-client.ts /new/project/lib/

# 3. Update API calls
grep -r "fetch('/api/" --include="*.ts" --include="*.tsx"
# Replace with apiFetch()

# 4. Update OAuth redirects
# - Search for: redirectTo:
# - Add: const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

# 5. Deploy
npm run deploy

# 6. Update Supabase
# - Site URL: https://labcart.io/SUBPATH
# - Redirect URLs: https://labcart.io/SUBPATH/auth/callback

# 7. Test
# - Login
# - API calls
# - Fresh install token
```

---

**Last Updated:** 2025-11-21
**Tested With:** Next.js 16.0.1, @opennextjs/cloudflare 1.12.0, Wrangler 4.48.0
