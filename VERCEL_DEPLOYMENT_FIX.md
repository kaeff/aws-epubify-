# Fix for Vercel Deployment Error

## Problem
The GitHub Action fails with: `Error: Input required and not supplied: vercel-token`

## Root Cause
The workflow files are correctly configured, but the required GitHub repository secrets are not set up.

## Solution: Set up GitHub Repository Secrets

### 1. Get Vercel Token
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click on your avatar → **Settings** → **Tokens**
3. Create a new token with appropriate scope
4. Copy the token value

### 2. Get Vercel Project Details
1. Go to your project in Vercel Dashboard
2. Go to **Settings** → **General**
3. Copy the **Project ID**
4. Copy the **Team ID** (if using a team)

### 3. Get Organization ID
1. In Vercel Dashboard, go to **Settings** → **General**
2. Copy the **Team ID** (this is your Organization ID)

### 4. Add Secrets to GitHub Repository
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Add these repository secrets:

   - `VERCEL_TOKEN`: Your Vercel token from step 1
   - `PROJECT_ID`: Your Vercel project ID from step 2
   - `ORG_ID`: Your Vercel organization/team ID from step 3
   - `TEAM_ID`: Your Vercel team ID (same as ORG_ID if using a team)
   - `BACKEND_URL`: Your backend URL (if applicable)

### 5. Verify Setup
After adding the secrets, the workflow should work correctly. The required secrets for your workflows are:

- ✅ `VERCEL_TOKEN` - Required for authentication
- ✅ `PROJECT_ID` - Required to identify your project
- ✅ `ORG_ID` - Required for organization/team
- ✅ `TEAM_ID` - Required for team scope
- ✅ `BACKEND_URL` - Environment variable for your app
- ✅ `GITHUB_TOKEN` - Automatically provided by GitHub

## Alternative: Update Workflow (if you want to make some secrets optional)

If you want to make some secrets optional, you can modify the workflow files to handle missing secrets gracefully:

```yaml
- name: Deploy to Vercel
  uses: amondnet/vercel-action@v25
  with:
    vercel-token: ${{ secrets.VERCEL_TOKEN }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    vercel-org-id: ${{ secrets.ORG_ID }}
    vercel-project-id: ${{ secrets.PROJECT_ID }}
    working-directory: ./
    scope: ${{ secrets.TEAM_ID || '' }}
  env:
    BACKEND_URL: ${{ secrets.BACKEND_URL || '' }}
```

## Workflow Files Status
Your workflow files (`.github/workflows/deploy.yml` and `.github/workflows/deploy-fallback.yml`) are correctly configured. The issue is purely with missing repository secrets.

## Next Steps
1. Set up the required secrets in your GitHub repository
2. Push a commit or manually trigger the workflow to test
3. The deployment should succeed once all secrets are properly configured