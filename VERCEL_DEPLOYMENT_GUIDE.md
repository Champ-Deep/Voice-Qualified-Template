# 🚀 Vercel Deployment Guide for ChampQualifier

## Architecture Overview

Your application has 3 components:
1. **Frontend** (React + Vite) - ✅ Can deploy to Vercel
2. **Backend** (Express.js) - ✅ Can deploy to Vercel (as serverless functions)
3. **Redis** - ⚠️ Needs external service (Vercel doesn't provide Redis)

## Deployment Strategy

### Option 1: Full Vercel Deployment (Recommended)
- **Frontend**: Vercel (static site)
- **Backend**: Vercel Serverless Functions
- **Redis**: Upstash Redis (free tier)

### Option 2: Hybrid Deployment
- **Frontend**: Vercel
- **Backend + Redis**: Railway/Render (free tier)

## ✅ Recommended: Full Vercel + Upstash

This guide covers **Option 1** - the best free solution.

---

## Prerequisites

### 1. Accounts Needed (All Free)
- ✅ **Vercel** account: https://vercel.com/signup
- ✅ **Upstash** account (Redis): https://upstash.com
- ✅ **GitHub** account (to deploy from)

### 2. Your Current Stack
```
Frontend (Vite + React) → Vercel
Backend (Express API) → Vercel Serverless Functions
Redis → Upstash Redis (free: 10k requests/day)
Voice API → Eleven Labs (unchanged)
```

---

## Phase 1: Prepare Redis (Upstash)

### Step 1.1: Create Upstash Redis Database

1. Go to https://upstash.com
2. Click **"Sign Up"** → Use GitHub/Google
3. Click **"Create Database"**
4. Configure:
   - **Name**: `champqualifier-redis`
   - **Type**: Choose **Regional** (free tier)
   - **Region**: Choose closest to you (e.g., US-East)
5. Click **"Create"**

### Step 1.2: Get Redis Connection Details

After creation, you'll see:
```
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxQ
```

**Or get the Node.js connection:**
```
redis://default:password@region-redis.upstash.io:port
```

📝 **Save these** - you'll need them later!

---

## Phase 2: Restructure Backend for Vercel

Vercel uses **serverless functions** - we need to adapt the Express backend.

### Step 2.1: Create API Directory Structure

```bash
# In your project root
mkdir -p api
```

### Step 2.2: Create Vercel Configuration

Create `vercel.json` in project root:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Step 2.3: Convert Backend to Serverless Functions

We'll create separate serverless functions for each endpoint.

**Create: `api/health.ts`**
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
}
```

**Create: `api/webhook.ts`**
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

interface WebhookPayload {
  lead_id: string;
  conversation_id: string;
  transcript: Array<{
    speaker: 'agent' | 'lead';
    text: string;
    timestamp: string;
  }>;
  status: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload: WebhookPayload = req.body;
    const { lead_id, conversation_id, transcript, status } = payload;

    console.log('Received webhook for lead:', lead_id);

    // Save transcript to Redis
    const transcriptData = {
      leadId: lead_id,
      conversationId: conversation_id,
      status: status,
      messages: transcript.map(msg => ({
        speaker: msg.speaker,
        text: msg.text,
        timestamp: new Date(msg.timestamp),
      })),
    };

    await redis.setex(`transcript:${lead_id}`, 86400, JSON.stringify(transcriptData));

    // Update call status
    const callStatus = mapStatus(status);
    await redis.hset(`lead:status:${lead_id}`, {
      status: callStatus,
      updatedAt: new Date().toISOString(),
    });

    console.log(`Updated lead ${lead_id} status to ${callStatus}`);

    res.status(200).json({
      success: true,
      message: 'Webhook processed successfully',
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

function mapStatus(webhookStatus: string): string {
  const statusMap: Record<string, string> = {
    'ringing': 'in_progress',
    'in-progress': 'in_progress',
    'completed': 'completed',
    'failed': 'failed',
    'busy': 'failed',
    'no-answer': 'failed',
  };
  return statusMap[webhookStatus.toLowerCase()] || 'completed';
}
```

**Create: `api/transcript/[leadId].ts`**
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { leadId } = req.query;

  if (req.method === 'GET') {
    try {
      const data = await redis.get(`transcript:${leadId}`);

      if (!data) {
        return res.status(404).json({ error: 'Transcript not found' });
      }

      res.json(typeof data === 'string' ? JSON.parse(data) : data);
    } catch (error) {
      console.error('Error fetching transcript:', error);
      res.status(500).json({ error: 'Failed to fetch transcript' });
    }
  } else if (req.method === 'POST') {
    try {
      const transcript = req.body;
      await redis.setex(`transcript:${leadId}`, 86400, JSON.stringify(transcript));
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving transcript:', error);
      res.status(500).json({ error: 'Failed to save transcript' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

**Create: `api/status/[leadId].ts`**
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { leadId } = req.query;

  if (req.method === 'GET') {
    try {
      const status = await redis.hget(`lead:status:${leadId}`, 'status');

      if (!status) {
        return res.status(404).json({ error: 'Status not found' });
      }

      res.json({ status });
    } catch (error) {
      console.error('Error fetching status:', error);
      res.status(500).json({ error: 'Failed to fetch status' });
    }
  } else if (req.method === 'PUT') {
    try {
      const { status } = req.body;
      await redis.hset(`lead:status:${leadId}`, {
        status,
        updatedAt: new Date().toISOString(),
      });
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({ error: 'Failed to update status' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

**Create: `api/lead.ts`**
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { leadId, data } = req.body;
    await redis.setex(`lead:${leadId}`, 86400, JSON.stringify(data));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving lead:', error);
    res.status(500).json({ error: 'Failed to save lead' });
  }
}
```

**Create: `api/conversation/[leadId].ts`**
```typescript
import { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { leadId } = req.query;

  if (req.method === 'GET') {
    try {
      const conversationId = await redis.get(`conv:${leadId}`);

      if (!conversationId) {
        return res.status(404).json({ error: 'Conversation ID not found' });
      }

      res.json({ conversationId });
    } catch (error) {
      console.error('Error fetching conversation ID:', error);
      res.status(500).json({ error: 'Failed to fetch conversation ID' });
    }
  } else if (req.method === 'POST') {
    try {
      const { conversationId } = req.body;
      await redis.setex(`conv:${leadId}`, 86400, conversationId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error saving conversation ID:', error);
      res.status(500).json({ error: 'Failed to save conversation ID' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
```

### Step 2.4: Install Upstash Redis Package

```bash
npm install @upstash/redis
npm install -D @vercel/node
```

### Step 2.5: Update package.json

Add build script for Vercel:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "vercel-build": "npm run build"
  }
}
```

---

## Phase 3: Update Frontend Configuration

### Step 3.1: Update Environment Variables

The frontend needs to point to Vercel's API routes.

Update `src/services/redisService.ts`:

```typescript
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
// On Vercel, this will be your deployment URL
```

### Step 3.2: Create `.env.production`

```env
VITE_VOICE_API_URL=https://api.elevenlabs.io/v1
VITE_VOICE_API_KEY=67cc697e61daf8be54313f64690b5f4975757e265fdd50ca0b10ec0e8e21d62b
VITE_AGENT_ID=agent_3501kf4e3ak0eqkrxg1rttttk881
VITE_PHONE_NUMBER_ID=phnum_4901kg4yjvgpetqbeknvhgm1stk4
VITE_BACKEND_URL=https://your-project.vercel.app
VITE_WEBHOOK_URL=https://your-project.vercel.app/api/webhook
```

---

## Phase 4: Push to GitHub

### Step 4.1: Initialize Git (if not already)

```bash
# Check if git is initialized
git status

# If not, initialize
git init
git add .
git commit -m "Prepare for Vercel deployment"
```

### Step 4.2: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: `champqualifier`
3. **Private** or **Public** (your choice)
4. **Don't** initialize with README (we already have code)
5. Click **"Create repository"**

### Step 4.3: Push to GitHub

```bash
git remote add origin https://github.com/YOUR_USERNAME/champqualifier.git
git branch -M main
git push -u origin main
```

---

## Phase 5: Deploy to Vercel

### Step 5.1: Connect Vercel to GitHub

1. Go to https://vercel.com
2. Click **"Add New Project"**
3. Click **"Import Git Repository"**
4. Select your GitHub account
5. Find `champqualifier` repository
6. Click **"Import"**

### Step 5.2: Configure Project

**Framework Preset**: Vite
**Root Directory**: `./` (leave as is)
**Build Command**: `npm run build`
**Output Directory**: `dist`

### Step 5.3: Add Environment Variables

In Vercel project settings, add these environment variables:

```
UPSTASH_REDIS_REST_URL=https://xxxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AxxxxxxxxxxxxxxxxxxxxxxxxxxxQ
VITE_VOICE_API_URL=https://api.elevenlabs.io/v1
VITE_VOICE_API_KEY=67cc697e61daf8be54313f64690b5f4975757e265fdd50ca0b10ec0e8e21d62b
VITE_AGENT_ID=agent_3501kf4e3ak0eqkrxg1rttttk881
VITE_PHONE_NUMBER_ID=phnum_4901kg4yjvgpetqbeknvhgm1stk4
NODE_ENV=production
```

### Step 5.4: Deploy

Click **"Deploy"**

Vercel will:
1. ✅ Clone your repository
2. ✅ Install dependencies
3. ✅ Build your project
4. ✅ Deploy frontend + serverless functions

**Deployment URL**: `https://your-project.vercel.app`

---

## Phase 6: Update Eleven Labs Webhook

### Step 6.1: Get Your Vercel URL

After deployment, copy your Vercel URL:
```
https://champqualifier-abc123.vercel.app
```

### Step 6.2: Update Webhook in Eleven Labs Dashboard

1. Log into Eleven Labs dashboard
2. Go to **Agent Settings** → **Webhooks**
3. Find webhook ID: `cb2f0eb9b75646469fec1b09e9de8de1`
4. Update URL to:
```
https://champqualifier-abc123.vercel.app/api/webhook
```
5. Save changes

---

## Phase 7: Test Live Application

### Step 7.1: Open Your Live Site

```
https://your-project.vercel.app
```

### Step 7.2: Test Form Submission

1. Fill out lead form
2. Submit
3. Check status updates
4. Wait for call completion
5. Verify transcript appears

### Step 7.3: Monitor Logs

**Vercel Logs**:
1. Go to Vercel dashboard
2. Click your project
3. Go to **"Functions"** tab
4. View real-time logs

**Upstash Logs**:
1. Go to Upstash dashboard
2. Click your database
3. View **"Data Browser"**
4. See Redis keys in real-time

---

## Troubleshooting

### Issue: Build Fails

**Check**:
- Package.json has correct dependencies
- TypeScript compiles: `npm run build` locally
- All environment variables set in Vercel

**Solution**:
```bash
# Test build locally
npm run build

# Check Vercel build logs
# Fix any TypeScript/dependency errors
```

### Issue: API Routes Return 404

**Check**:
- `vercel.json` exists in root
- API files in `api/` folder
- File names match route patterns

**Solution**:
- Verify file structure: `api/health.ts`, `api/webhook.ts`, etc.
- Redeploy from Vercel dashboard

### Issue: Redis Connection Error

**Check**:
- Upstash credentials in Vercel environment variables
- Format: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

**Solution**:
- Copy credentials from Upstash dashboard
- Add to Vercel → Settings → Environment Variables
- Redeploy

### Issue: CORS Errors

**Solution**:
Add CORS headers to API routes:

```typescript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

if (req.method === 'OPTIONS') {
  return res.status(200).end();
}
```

---

## Cost Breakdown (All FREE Tier)

| Service | Free Tier | Your Usage | Cost |
|---------|-----------|------------|------|
| **Vercel** | 100GB bandwidth/month | ~1-2GB | $0 |
| **Upstash Redis** | 10,000 requests/day | ~1000-2000 | $0 |
| **Eleven Labs** | Your plan | Per call | Your rate |
| **GitHub** | Unlimited public repos | 1 repo | $0 |

**Total Monthly Cost**: **$0** (within free tiers)

---

## Limits & Scaling

### Free Tier Limits

**Vercel**:
- ✅ Unlimited requests
- ✅ 100GB bandwidth/month
- ✅ Serverless function executions
- ⚠️ 10 second function timeout

**Upstash Redis**:
- ✅ 10,000 commands/day
- ✅ 256MB storage
- ⚠️ After limit: ~$0.20 per 100k requests

### When to Upgrade

Upgrade when:
- **Traffic > 100GB/month** → Vercel Pro ($20/month)
- **Redis > 10k requests/day** → Upstash Pro ($10/month)
- **Need faster functions** → Vercel Pro (60s timeout)

---

## File Checklist

Before deploying, ensure you have:

```
✅ vercel.json (config file)
✅ api/health.ts
✅ api/webhook.ts
✅ api/transcript/[leadId].ts
✅ api/status/[leadId].ts
✅ api/lead.ts
✅ api/conversation/[leadId].ts
✅ .env.production
✅ package.json (with @upstash/redis)
✅ GitHub repository created
✅ Upstash Redis database created
```

---

## Summary

### Deployment Flow

```
Local Code
    ↓
GitHub Repository
    ↓
Vercel (Detects push)
    ↓
Builds & Deploys
    ↓
Live at: https://your-project.vercel.app
```

### Architecture on Vercel

```
User Browser
    ↓
Vercel CDN (Frontend)
    ↓
Vercel Serverless Functions (Backend API)
    ↓
Upstash Redis (Data Storage)
    ↓
Eleven Labs API (Voice Calls)
```

---

## Next Steps

1. ✅ Create Upstash Redis database
2. ✅ Create API serverless functions
3. ✅ Push code to GitHub
4. ✅ Deploy to Vercel
5. ✅ Add environment variables
6. ✅ Update Eleven Labs webhook URL
7. ✅ Test live application

**Estimated Time**: 30-45 minutes

**Result**: Free, live application at `https://your-project.vercel.app` 🚀

---

Need help? Check:
- Vercel Docs: https://vercel.com/docs
- Upstash Docs: https://docs.upstash.com
- Your deployment logs in Vercel dashboard
