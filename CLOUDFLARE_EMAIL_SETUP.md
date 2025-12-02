# Cloudflare Email Setup Guide for senditfast.ai

## Overview
This guide will help you set up multiple email addresses (help@, info@, sales@, rahul@senditfast.ai) using Cloudflare Email Routing with a unified inbox.

## Prerequisites
- Domain senditfast.ai registered on Cloudflare
- Access to Cloudflare dashboard
- A primary email address to receive all forwarded emails (e.g., your Gmail or other email provider)

## Step 1: Enable Cloudflare Email Routing

1. **Log in to Cloudflare Dashboard**
   - Go to https://dash.cloudflare.com
   - Select your `senditfast.ai` domain

2. **Navigate to Email Routing**
   - Click on "Email" in the left sidebar
   - Click "Email Routing"
   - Click "Get started" or "Enable Email Routing"

3. **Verify DNS Records**
   - Cloudflare will automatically add the required DNS records:
     - MX records (e.g., `route1.mx.cloudflare.net` and `route2.mx.cloudflare.net`)
     - TXT records for SPF authentication
   - Click "Add records automatically"
   - Wait for DNS propagation (usually 5-15 minutes)

## Step 2: Set Up Destination Address (Unified Inbox)

1. **Add Your Primary Email**
   - In Email Routing settings, go to "Destination addresses"
   - Click "Add destination address"
   - Enter your primary email (e.g., `your.personal.email@gmail.com`)
   - Check your email for a verification code from Cloudflare
   - Enter the verification code to confirm

## Step 3: Create Email Forwarding Rules

You have two options for forwarding:

### Option A: Individual Forwarding Rules (Recommended for Organization)

Create separate rules for each email address:

1. **Navigate to Routing Rules**
   - Go to "Routing rules" tab
   - Click "Create address"

2. **Create Each Email Address**

   **For help@senditfast.ai:**
   - Custom address: `help`
   - Action: Forward to
   - Destination: Select your verified email
   - Click "Save"

   **For info@senditfast.ai:**
   - Custom address: `info`
   - Action: Forward to
   - Destination: Select your verified email
   - Click "Save"

   **For sales@senditfast.ai:**
   - Custom address: `sales`
   - Action: Forward to
   - Destination: Select your verified email
   - Click "Save"

   **For rahul@senditfast.ai:**
   - Custom address: `rahul`
   - Action: Forward to
   - Destination: Select your verified email
   - Click "Save"

### Option B: Catch-All Rule (Forward Everything)

1. **Create Catch-All Rule**
   - In "Routing rules", click "Create routing rule"
   - Match type: "Catch-all"
   - Action: Forward to
   - Destination: Select your verified email
   - Click "Save"

**Note:** Catch-all will forward ALL emails to any address @senditfast.ai to your inbox.

## Step 4: Organize Unified Inbox with Filters

Since all emails go to one inbox, use email filters to organize them:

### Gmail Filters Setup

1. **Go to Gmail Settings**
   - Click the gear icon → "See all settings"
   - Go to "Filters and Blocked Addresses"

2. **Create Filters for Each Address**

   **Filter for help@senditfast.ai:**
   - Create filter with criteria: `to:help@senditfast.ai`
   - Apply label: "SendItFast - Help"
   - Star it (optional)
   - Click "Create filter"

   **Filter for info@senditfast.ai:**
   - Create filter with criteria: `to:info@senditfast.ai`
   - Apply label: "SendItFast - Info"
   - Click "Create filter"

   **Filter for sales@senditfast.ai:**
   - Create filter with criteria: `to:sales@senditfast.ai`
   - Apply label: "SendItFast - Sales"
   - Click "Create filter"

   **Filter for rahul@senditfast.ai:**
   - Create filter with criteria: `to:rahul@senditfast.ai`
   - Apply label: "SendItFast - Rahul"
   - Click "Create filter"

## Step 5: Send Emails FROM Your Custom Addresses

To reply from your custom email addresses (not just receive):

### Gmail "Send As" Setup

1. **Go to Gmail Settings**
   - Click gear icon → "See all settings"
   - Go to "Accounts and Import"

2. **Add Each Email Address**
   - Click "Add another email address"
   - Name: "Help - SendItFast" (or your preference)
   - Email: `help@senditfast.ai`
   - Uncheck "Treat as an alias" (recommended)
   - Click "Next Step"

3. **SMTP Configuration**
   - You'll need an SMTP service. Options:
     - **Use Gmail's SMTP** (simpler, but shows via gmail.com)
     - **Use a third-party SMTP** like:
       - SendGrid (free tier: 100 emails/day)
       - Mailgun (free tier: 5,000 emails/month)
       - Amazon SES
       - Resend
       - Postmark

4. **Recommended: Use Resend or SendGrid**

   **For SendGrid:**
   - Sign up at https://sendgrid.com
   - Verify your domain (senditfast.ai)
   - Get API key
   - In Gmail:
     - SMTP Server: `smtp.sendgrid.net`
     - Port: `587`
     - Username: `apikey`
     - Password: Your SendGrid API key

   **For Resend (Developer-friendly):**
   - Sign up at https://resend.com
   - Add domain senditfast.ai
   - Verify DNS records
   - Get API key
   - Configure SMTP:
     - SMTP Server: `smtp.resend.com`
     - Port: `465` or `587`
     - Username: `resend`
     - Password: Your Resend API key

## Step 6: Test Your Email Setup

1. **Test Receiving**
   - Send test emails to each address:
     - help@senditfast.ai
     - info@senditfast.ai
     - sales@senditfast.ai
     - rahul@senditfast.ai
   - Verify they arrive in your unified inbox
   - Check that Gmail filters/labels work correctly

2. **Test Sending**
   - Compose a new email in Gmail
   - Click the "From" field
   - Select one of your custom addresses
   - Send a test email to yourself
   - Verify it shows the correct sender

## Advanced: Email Analytics

To track email opens and clicks, consider:
- **Cloudflare Email Workers** (advanced, requires coding)
- **Third-party services** like:
  - Mailtrack for Gmail
  - Streak CRM
  - HubSpot Email Tracking

## Troubleshooting

### Emails Not Arriving
1. Check DNS propagation: https://dnschecker.org
2. Verify MX records are set correctly
3. Check spam folder
4. Verify destination email is confirmed in Cloudflare

### Cannot Send From Custom Address
1. Verify SMTP credentials
2. Check if your email provider allows third-party SMTP
3. Enable "Less secure app access" (for Gmail) or use App Password

### Emails Going to Spam
1. Add SPF record (Cloudflare adds this automatically)
2. Add DKIM record (from your SMTP provider)
3. Add DMARC record:
   ```
   Type: TXT
   Name: _dmarc
   Content: v=DMARC1; p=none; rua=mailto:rahul@senditfast.ai
   ```

## Cost Breakdown

- **Cloudflare Email Routing**: FREE (unlimited forwarding)
- **Cloudflare Domain**: ~$10/year (already purchased)
- **SMTP Service**:
  - SendGrid: Free tier (100 emails/day)
  - Resend: Free tier (3,000 emails/month)
  - Amazon SES: $0.10 per 1,000 emails

## Summary

You now have:
- ✅ Multiple professional email addresses
- ✅ All emails in one unified inbox
- ✅ Organized with labels/filters
- ✅ Ability to send from custom addresses
- ✅ Free email forwarding
- ✅ Professional email infrastructure

## Next Steps

1. Enable Email Routing in Cloudflare Dashboard
2. Add destination address and verify
3. Create routing rules for each email
4. Set up Gmail filters
5. Configure SMTP for sending (optional)
6. Test everything

## Resources

- Cloudflare Email Routing Docs: https://developers.cloudflare.com/email-routing/
- SendGrid Setup: https://sendgrid.com/docs/
- Resend Setup: https://resend.com/docs/
