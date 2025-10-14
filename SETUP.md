# Setup Guide for Sign My Docs

This guide will help you set up and deploy the Sign My Docs application.

## Prerequisites

Before you begin, ensure you have:
- Node.js 16 or higher installed
- npm or yarn package manager
- A Supabase account (free tier works fine)
- (Optional) A Netlify account for deployment

## Step 1: Install Dependencies

```bash
npm install
```

This will install all required packages including:
- React and React Router for the frontend
- Supabase client for backend integration
- pdf-lib for PDF manipulation
- qrcode for QR code generation

## Step 2: Set Up Supabase

### 2.1 Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project"
3. Sign in with GitHub or create an account
4. Click "New Project"
5. Fill in:
   - Project name: `sign-my-docs`
   - Database password: Create a strong password
   - Region: Choose closest to your users
6. Click "Create new project" and wait for setup to complete

### 2.2 Set Up Database

1. In your Supabase dashboard, navigate to "SQL Editor"
2. Click "New query"
3. Copy the entire contents of `supabase-schema.sql` from this repository
4. Paste it into the SQL editor
5. Click "Run" to execute the SQL
6. You should see success messages for table creation and policies

### 2.3 Create Storage Bucket

1. Navigate to "Storage" in the Supabase dashboard
2. Click "Create a new bucket"
3. Enter:
   - Name: `documents`
   - Public bucket: ✅ (checked)
4. Click "Create bucket"
5. Click on the `documents` bucket
6. Go to "Settings" tab
7. Configure:
   - File size limit: 50 MB
   - Allowed MIME types: `application/pdf,image/png,image/jpeg`

### 2.4 Get API Credentials

1. Navigate to "Settings" → "API" in Supabase dashboard
2. Copy:
   - Project URL (under "Project URL")
   - anon/public key (under "Project API keys")

## Step 3: Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Open `.env` and update with your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

⚠️ **Important**: Never commit the `.env` file to Git! It's already in `.gitignore`.

## Step 4: Test Locally

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

Test the following:
1. Upload a PDF document on the home page
2. Check document status at `/check`
3. View admin panel at `/admintte`
4. Test validation page at `/validate/test-token`

## Step 5: Deploy to Netlify

### Option A: Using Netlify CLI

1. Install Netlify CLI globally:
```bash
npm install -g netlify-cli
```

2. Login to Netlify:
```bash
netlify login
```

3. Initialize and deploy:
```bash
netlify init
```

Follow the prompts to create a new site.

4. Set environment variables:
```bash
netlify env:set VITE_SUPABASE_URL "your-supabase-url"
netlify env:set VITE_SUPABASE_ANON_KEY "your-anon-key"
```

5. Deploy to production:
```bash
netlify deploy --prod
```

### Option B: Using Netlify Dashboard

1. Go to [netlify.com](https://netlify.com) and sign in
2. Click "Add new site" → "Import an existing project"
3. Connect to your Git repository
4. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Add environment variables in "Site settings" → "Environment variables":
   - `VITE_SUPABASE_URL`: Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase anon key
6. Click "Deploy site"

### Option C: Using GitHub Actions (Automated)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Netlify
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm run build
      - uses: netlify/actions/cli@master
        with:
          args: deploy --prod
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

Add `NETLIFY_AUTH_TOKEN` and `NETLIFY_SITE_ID` to your GitHub repository secrets.

## Step 6: Verify Deployment

After deployment, verify:

1. ✅ Home page loads at root URL
2. ✅ Can navigate to `/check`
3. ✅ Can navigate to `/admintte`
4. ✅ Validation URLs work: `/validate/:token`
5. ✅ Document upload works (with valid Supabase credentials)
6. ✅ Status check retrieves documents
7. ✅ Admin panel shows requests

## Troubleshooting

### Issue: "Invalid supabaseUrl" error

**Solution**: Ensure environment variables are set correctly:
- For local: Check `.env` file
- For Netlify: Check site settings → Environment variables

### Issue: CORS errors when uploading files

**Solution**: 
1. Check Supabase storage bucket is set to public
2. Verify bucket policies allow public upload

### Issue: Build fails on Netlify

**Solution**:
1. Check Node.js version matches (use 18+)
2. Verify all dependencies are in `package.json`
3. Check build logs for specific errors

### Issue: 404 on page refresh

**Solution**: The `netlify.toml` file handles this with redirects. Ensure it exists and contains:
```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## Security Considerations

### For Production Use:

1. **Row Level Security (RLS)**: The current setup uses permissive policies for demo purposes. For production:
   - Implement proper authentication
   - Restrict admin access to specific users
   - Add user-specific policies

2. **Admin Authentication**: Add authentication to `/admintte` route:
   - Use Supabase Auth
   - Implement middleware to protect admin routes
   - Add admin-only user roles

3. **File Validation**: 
   - Validate file types on backend
   - Scan for malicious content
   - Set appropriate file size limits

4. **Rate Limiting**:
   - Implement rate limiting for uploads
   - Use Netlify functions for server-side validation

5. **Environment Variables**:
   - Never expose service role keys
   - Use different keys for development and production
   - Rotate keys periodically

## Advanced Features (Optional)

### Email Notifications

To add email notifications when document status changes:

1. Use Supabase Edge Functions or Netlify Functions
2. Set up email service (SendGrid, Mailgun, etc.)
3. Create database trigger to call function on status update

### PDF Preview

To add PDF preview before/after signing:

1. Install `react-pdf` package
2. Use `Document` and `Page` components
3. Add preview modal to admin and status pages

### Audit Logging

To track all signature actions:

1. Create `audit_logs` table in Supabase
2. Log all signature applications
3. Display audit trail in admin panel

## Support

For issues or questions:
- Check the README.md
- Review Supabase documentation
- Check React Router documentation
- Open an issue on GitHub

## License

MIT License - see LICENSE file for details
