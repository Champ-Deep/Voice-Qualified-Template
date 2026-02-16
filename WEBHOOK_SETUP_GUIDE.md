# Webhook Setup Guide for Restricted Network Environment

## What Was Implemented

### ✅ Phase 2: Polling Fallback (COMPLETED)

The system now has **dual delivery mechanism** for transcripts:

1. **Primary**: Real-time webhooks (when accessible)
2. **Fallback**: API polling every 5 seconds (when webhooks blocked)

**Changes Made:**

1. **redisService.ts** - Added conversation ID storage:
   - `saveConversationId(leadId, conversationId)` - Store conv ID with 24h TTL
   - `getConversationId(leadId)` - Retrieve conv ID for polling
   - Updated `deleteLead()` to clean up conversation ID

2. **useLeadGeneration.ts** - Capture conversation ID:
   - Store `conversation_id` from Eleven Labs API response
   - Links leadId → conversationId for future polling

3. **useTranscript.ts** - Smart polling logic:
   - First checks Redis (webhook delivery)
   - Falls back to Eleven Labs API if Redis empty
   - Caches API results back to Redis
   - Silently handles API errors (webhook might still work)

**Result**: Transcripts will be delivered even if webhook endpoint is not publicly accessible!

---

## Phase 1: Expose Webhook (Optional - For Real-Time Delivery)

While the polling fallback works, webhooks provide **instant delivery** (0-2 seconds vs 5-10 seconds).

### Option A: ngrok (Quick Setup - 5 minutes)

#### Step 1: Install ngrok

```bash
# Option 1: Using snap (recommended on Ubuntu/Linux)
sudo snap install ngrok

# Option 2: Using npm
npm install -g ngrok

# Option 3: Download binary
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-amd64.tgz
tar -xvzf ngrok-v3-stable-linux-amd64.tgz
sudo mv ngrok /usr/local/bin/
```

#### Step 2: Authenticate (Free Account)

1. Sign up at https://dashboard.ngrok.com/signup
2. Get your auth token from https://dashboard.ngrok.com/get-started/your-authtoken
3. Authenticate:

```bash
ngrok authtoken YOUR_AUTH_TOKEN_HERE
```

#### Step 3: Start Your Application

```bash
# Start backend and frontend
docker-compose up -d

# Verify backend is running
curl http://localhost:3001/health
```

#### Step 4: Start ngrok Tunnel

```bash
# Start tunnel to backend port 3001
ngrok http 3001
```

**Expected Output:**
```
ngrok

Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123-xyz.ngrok-free.app -> http://localhost:3001

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

**Copy the HTTPS URL**: `https://abc123-xyz.ngrok-free.app`

#### Step 5: Update Eleven Labs Webhook Configuration

1. Log in to Eleven Labs dashboard
2. Navigate to **Agent Settings** → **Webhooks**
3. Find webhook ID: `cb2f0eb9b75646469fec1b09e9de8de1`
4. Update webhook URL:
   - **Old**: `http://localhost:3001/api/webhook`
   - **New**: `https://abc123-xyz.ngrok-free.app/api/webhook`
5. Save changes

#### Step 6: Test Webhook Delivery

**Terminal 1** - Monitor ngrok traffic:
```bash
# ngrok provides web interface at http://localhost:4040
# Or watch terminal for incoming requests
```

**Terminal 2** - Monitor backend logs:
```bash
docker-compose logs -f backend
```

**Browser** - Submit lead form at `http://localhost:3000`

**Expected Logs:**
```
backend_1  | Received webhook for lead: lead_abc123
backend_1  | Updated lead lead_abc123 status to completed
```

#### Step 7: Verify Transcript Display

1. After call completes (2-5 minutes)
2. Check frontend - transcript should appear automatically
3. Verify Redis storage:

```bash
docker exec -it eleven-labs-redis redis-cli

# Check stored data
KEYS *
GET transcript:lead_abc123
GET conv:lead_abc123
```

---

### Option B: Alternative Tunnel Services

#### localtunnel (Simpler, No Signup)

```bash
# Install
npm install -g localtunnel

# Start tunnel
lt --port 3001 --subdomain my-webhook-endpoint

# URL: https://my-webhook-endpoint.loca.lt
```

**Pros**: No signup, free, simple
**Cons**: URL changes if subdomain taken, less stable

#### Cloudflare Tunnel (Free, Persistent URL)

```bash
# Install
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
sudo chmod +x /usr/local/bin/cloudflared

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create my-webhook-tunnel

# Configure
cloudflared tunnel route dns my-webhook-tunnel webhook.yourdomain.com

# Run tunnel
cloudflared tunnel run my-webhook-tunnel
```

**Pros**: Free, persistent URL, Cloudflare infrastructure
**Cons**: Requires domain, more complex setup

---

## Phase 3: Production Deployment (Optional)

### Deploy Backend to Cloud

#### Option 1: Railway.app (Recommended)

1. **Create Account**: https://railway.app
2. **Deploy Backend**:
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli

   # Login
   railway login

   # Initialize project
   cd backend
   railway init

   # Deploy
   railway up
   ```

3. **Configure Environment Variables**:
   ```env
   PORT=3001
   REDIS_URL=redis://default:password@redis.railway.internal:6379
   FRONTEND_URL=http://localhost:3000
   WEBHOOK_SECRET=<generate-random-secret>
   NODE_ENV=production
   ```

4. **Get Public URL**: `https://your-app.railway.app`

5. **Update Eleven Labs**: `https://your-app.railway.app/api/webhook`

#### Option 2: Render.com

1. Create account at https://render.com
2. Connect GitHub repository
3. Create Web Service:
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Environment**: Add variables above
4. Deploy and get public URL

---

## Troubleshooting

### Webhook Not Received

**Symptom**: No logs in backend after call completion

**Diagnosis**:
```bash
# Check ngrok status
curl http://localhost:4040/api/tunnels

# Test webhook endpoint manually
curl -X POST https://your-ngrok-url.ngrok-free.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"lead_id":"test123","conversation_id":"conv123","transcript":[],"status":"completed"}'
```

**Solutions**:
- ✅ Verify ngrok is running: `ps aux | grep ngrok`
- ✅ Check backend is accessible: `curl http://localhost:3001/health`
- ✅ Verify Eleven Labs webhook URL is correct in dashboard
- ✅ Check firewall allows outbound HTTPS from ngrok

### Polling Fallback Working But Slow

**Symptom**: Transcripts appear after 10-15 seconds

**Explanation**: This is expected! Polling interval is 5 seconds.

**To Improve**:
1. Set up ngrok for instant webhook delivery (0-2 seconds)
2. Or reduce polling interval in `useTranscript.ts:42`:
   ```typescript
   const interval = setInterval(fetchTranscript, 3000); // 3 seconds
   ```

### Transcript Not Displaying

**Diagnosis**:
```bash
# Check Redis
docker exec -it eleven-labs-redis redis-cli
KEYS *
GET transcript:lead_abc123

# Check conversation ID stored
GET conv:lead_abc123

# Check backend logs
docker-compose logs backend | grep "webhook\|transcript"
```

**Solutions**:
- ✅ Verify conversation ID stored: Should see `conv:lead_abc123`
- ✅ Check API key in `.env`: `VITE_ELEVEN_LABS_API_KEY`
- ✅ Verify call completed in Eleven Labs dashboard
- ✅ Check browser console for errors

### API Polling Errors

**Symptom**: Console shows "API polling failed"

**Explanation**: Normal if webhook is working! Polling is just fallback.

**If webhook NOT working**:
- ✅ Check API key is valid
- ✅ Verify conversation ID format
- ✅ Check Eleven Labs API status: https://status.elevenlabs.io
- ✅ Verify network allows outbound HTTPS to `api.elevenlabs.io`

### CORS Errors

**Symptom**: Browser console shows CORS errors

**Solutions**:
```bash
# Check backend CORS config
# In backend/src/server.ts:30-33

# Verify FRONTEND_URL matches your frontend URL
# backend/.env
FRONTEND_URL=http://localhost:3000
```

### ngrok URL Changes on Restart

**Problem**: Free ngrok URLs change each time ngrok restarts

**Solutions**:
1. **Paid ngrok**: $8/month for persistent subdomain
   ```bash
   ngrok http 3001 --subdomain=my-permanent-name
   ```

2. **Use environment variable**: Update `.env` after each restart
   ```bash
   # Get ngrok URL
   NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | jq -r '.tunnels[0].public_url')
   echo "Update Eleven Labs webhook to: $NGROK_URL/api/webhook"
   ```

3. **Automate updates**: Create script to update webhook URL via Eleven Labs API

---

## Security Best Practices

### 1. Enable Webhook Signature Verification

```bash
# Generate secret
openssl rand -hex 32

# Add to backend/.env
WEBHOOK_SECRET=your-generated-secret-here

# Configure in Eleven Labs dashboard
# Settings → Webhooks → Webhook Secret
```

### 2. Use HTTPS Only (Production)

- ✅ ngrok provides HTTPS by default
- ✅ Cloud platforms provide free SSL
- ❌ NEVER use HTTP webhooks in production

### 3. Rate Limiting (Optional)

Add to `backend/src/server.ts`:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

app.use('/api/webhook', limiter);
```

### 4. IP Whitelisting (If Supported by Network)

Request Eleven Labs IP ranges and configure firewall:

```bash
# Example iptables rule (replace with actual IPs)
sudo iptables -A INPUT -p tcp --dport 3001 -s <elevenlabs-ip> -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3001 -j DROP
```

---

## Testing Checklist

- [ ] Backend health check: `curl http://localhost:3001/health`
- [ ] Redis connection: `docker exec -it eleven-labs-redis redis-cli PING`
- [ ] ngrok tunnel active: Check `http://localhost:4040`
- [ ] Webhook endpoint accessible: `curl https://your-ngrok-url.ngrok-free.app/health`
- [ ] Submit lead form at `http://localhost:3000`
- [ ] Call initiated successfully (check Eleven Labs dashboard)
- [ ] Conversation ID stored in Redis: `GET conv:lead_xxx`
- [ ] After call completion (~2-5 mins):
  - [ ] Webhook received (check backend logs)
  - [ ] Transcript stored in Redis: `GET transcript:lead_xxx`
  - [ ] Frontend displays transcript
- [ ] Test polling fallback (disconnect ngrok, wait for new call)

---

## Monitoring & Debugging

### Monitor Backend Logs

```bash
# All logs
docker-compose logs -f backend

# Webhook only
docker-compose logs -f backend | grep webhook

# Errors only
docker-compose logs -f backend | grep -i error
```

### Monitor ngrok Traffic

```bash
# Web UI (preferred)
open http://localhost:4040

# CLI
curl http://localhost:4040/api/requests | jq
```

### Monitor Redis

```bash
# Connect to Redis CLI
docker exec -it eleven-labs-redis redis-cli

# Monitor all commands in real-time
MONITOR

# Check all keys
KEYS *

# Get specific transcript
GET transcript:lead_abc123

# Check TTL
TTL transcript:lead_abc123
```

### Check Eleven Labs Dashboard

1. Navigate to https://elevenlabs.io/app/conversational-ai
2. View conversation history
3. Check webhook delivery logs
4. Verify call status and transcript

---

## Current Configuration

### Webhook Endpoint (Local - Not Accessible)
```
http://localhost:3001/api/webhook
```

### Webhook ID
```
cb2f0eb9b75646469fec1b09e9de8de1
```

### Events
- `transcript` - Delivered when call completes
- `call_initiation_failure` - Delivered if call fails to connect

### Agent ID
```
agent_3501kf4e3ak0eqkrxg1rttttk881
```

### Phone Number ID
```
phnum_4901kg4yjvgpetqbeknvhgm1stk4
```

---

## Quick Start Commands

### Start Everything

```bash
# Terminal 1: Start application
docker-compose up -d

# Terminal 2: Start ngrok
ngrok http 3001

# Terminal 3: Monitor logs
docker-compose logs -f backend

# Update Eleven Labs webhook URL in dashboard
# Then test at http://localhost:3000
```

### Stop Everything

```bash
# Stop ngrok: Ctrl+C in ngrok terminal

# Stop application
docker-compose down

# Clean up (optional - removes data)
docker-compose down -v
```

---

## Summary

### ✅ What's Working Now (Without ngrok)
- Lead form submission
- Call initiation
- Status polling every 3 seconds
- **Transcript polling fallback every 5 seconds** (NEW!)
- Transcript display in UI
- Conversation ID storage for polling

### 🚀 What ngrok Enables
- **Instant** webhook delivery (0-2 seconds vs 5-10 seconds)
- Lower API usage (webhooks are pushed, not polled)
- Real-time status updates
- Production-ready webhook infrastructure

### 🎯 Recommended Setup
1. **Development**: Use polling fallback (no ngrok needed)
2. **Testing**: Use ngrok for real-time testing
3. **Production**: Deploy backend to cloud with persistent URL

---

## Support & Resources

- **Eleven Labs API Docs**: https://elevenlabs.io/docs/api-reference
- **ngrok Docs**: https://ngrok.com/docs
- **Redis Docs**: https://redis.io/docs
- **Project Issues**: Check `API_TEST_RESULTS.md` for known issues

---

## Need Help?

1. Check troubleshooting section above
2. Review backend logs: `docker-compose logs backend`
3. Check Redis data: `docker exec -it eleven-labs-redis redis-cli`
4. Test webhook manually with curl (see troubleshooting)
5. Verify Eleven Labs dashboard for call status
