# DuukaAfrica Setup Guide

This guide will help you set up the DuukaAfrica e-commerce platform from scratch.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Clerk Authentication Setup](#clerk-authentication-setup)
5. [Payment Gateway Setup](#payment-gateway-setup)
6. [Image Storage Setup](#image-storage-setup)
7. [Running the Application](#running-the-application)

---

## Prerequisites

- Node.js 18+ or Bun
- PostgreSQL 14+
- Git

---

## Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/hamtechug256/dukaafrica.git
   cd dukaafrica
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

4. Fill in your environment variables in `.env`

---

## Database Setup

1. Create a PostgreSQL database:
   ```bash
   createdb duukaafrica
   ```

2. Update `DATABASE_URL` in your `.env` file:
   ```
   DATABASE_URL="postgresql://user:password@localhost:5432/duukaafrica?schema=public"
   ```

3. Run database migrations:
   ```bash
   bunx prisma db push
   ```

4. Seed the database with initial data:
   ```bash
   bunx tsx prisma/seed.ts
   ```

---

## Clerk Authentication Setup

### Step 1: Create a Clerk Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Click "Create Application"
3. Name it "DuukaAfrica"
4. Copy the following keys to your `.env`:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`

### Step 2: Configure Google OAuth (IMPORTANT - Fixes "missing required client id" error)

1. In Clerk Dashboard, go to **Configure > Social Connections**
2. Find **Google** and click on it
3. **Option A: Use Clerk's development keys (Quick Start)**
   - Toggle on "Use development keys" for testing
   - This works immediately in development mode

4. **Option B: Use your own Google OAuth credentials (Production)**

   a. Go to [Google Cloud Console](https://console.cloud.google.com)
   
   b. Create a new project or select existing one
   
   c. Go to **APIs & Services > Credentials**
   
   d. Click **Create Credentials > OAuth client ID**
   
   e. Select **Web application**
   
   f. Add authorized JavaScript origins:
      - `http://localhost:3000` (development)
      - `https://yourdomain.com` (production)
   
   g. Add authorized redirect URIs:
      - `https://accounts.your-clerk-frontend-api.clerk.accounts.dev/v1/oauth_callback`
      - (Find your exact callback URL in Clerk Dashboard under the Google OAuth settings)
   
   h. Copy **Client ID** and **Client Secret**
   
   i. Paste them in Clerk Dashboard > Social Connections > Google

### Step 3: Configure Webhooks

1. In Clerk Dashboard, go to **Webhooks**
2. Click **Add Endpoint**
3. Enter your webhook URL:
   - Development: Use ngrok or similar tunneling service
   - Production: `https://yourdomain.com/api/webhooks/clerk`
4. Select events:
   - `user.created`
   - `user.updated`
   - `user.deleted`
5. Copy the signing secret to `CLERK_WEBHOOK_SECRET` in your `.env`

### Step 4: Set Super Admin Emails

1. In your `.env`, add:
   ```
   SUPER_ADMIN_EMAILS="your-email@example.com"
   ```
2. These users will automatically get SUPER_ADMIN role when they sign up

---

## Payment Gateway Setup

### Flutterwave (Primary)

1. Go to [Flutterwave Dashboard](https://dashboard.flutterwave.com)
2. Navigate to **Settings > API Keys**
3. Copy the following to your `.env`:
   - `NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY`
   - `FLUTTERWAVE_SECRET_KEY`
   - `FLUTTERWAVE_ENCRYPTION_KEY`
4. For webhooks, go to **Settings > Webhooks** and add:
   - URL: `https://yourdomain.com/api/flutterwave/webhook`
   - Copy the webhook hash to `FLUTTERWAVE_WEBHOOK_HASH`

### Paystack (Alternative)

1. Go to [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to **Settings > API Keys & Integrations**
3. Copy keys to your `.env`
4. Set up webhook at `https://yourdomain.com/api/paystack/webhook`

---

## Image Storage Setup (Cloudinary)

1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Copy from Dashboard:
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` (Cloud Name)
   - `CLOUDINARY_API_KEY` (API Key)
   - `CLOUDINARY_API_SECRET` (API Secret)
3. Create an upload preset:
   - Go to **Settings > Upload**
   - Click **Add upload preset**
   - Set signing mode to "Unsigned" for client uploads
   - Copy preset name to `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`

---

## Running the Application

### Development

```bash
bun run dev
```

The application will be available at `http://localhost:3000`

### Production Build

```bash
bun run build
bun run start
```

---

## Troubleshooting

### "Missing required client id" Error

This error occurs when Google OAuth is not properly configured. Solutions:

1. **Quick fix for development**: In Clerk Dashboard, enable "Use development keys" for Google OAuth
2. **For production**: Follow the Google OAuth setup guide above
3. **Check environment variables**: Ensure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set correctly

### Database Connection Errors

1. Ensure PostgreSQL is running
2. Check `DATABASE_URL` format
3. Verify database exists: `psql -c "SELECT 1"`

### Payment Errors

1. Verify all Flutterwave keys are correct
2. For testing, use Flutterwave test cards/numbers
3. Check webhook logs in Flutterwave dashboard

### Image Upload Issues

1. Verify Cloudinary credentials
2. Check upload preset is set to "Unsigned"
3. Check browser console for CORS errors

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/hamtechug256/dukaafrica/issues
- Email: support@duukaafrica.com
