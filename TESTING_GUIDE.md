# Quick Testing Guide - Polling Fallback Implementation

## What Was Implemented

✅ **Automatic transcript polling fallback** - Your application now polls the Eleven Labs API directly to get transcripts, even though the webhook at `localhost:3001` cannot be reached from the internet.

**No ngrok needed!** The system uses polling as the primary method.

## How to Test

### Step 1: Start the Dockerized Application

```bash
# Make sure you're in the project directory
cd /home/hemang/Desktop/template_Calling_V1

# Start all services (backend, frontend, Redis)
docker-compose up -d

# Verify all containers are running
docker-compose ps

# Expected output:
# NAME                  STATUS
# eleven-labs-backend   Up
# eleven-labs-frontend  Up
# eleven-labs-redis     Up
```

### Step 2: Verify Services are Running

```bash
# Check backend health
curl http://localhost:3001/health
# Expected: {"status":"ok","timestamp":"..."}

# Check frontend is accessible
curl http://localhost:3000
# Expected: HTML content

# Check Redis connection
docker exec -it eleven-labs-redis redis-cli PING
# Expected: PONG
```

### Step 3: Monitor Logs (Optional but Recommended)

Open a new terminal and watch the logs:

```bash
# Watch backend logs
docker-compose logs -f backend

# Or watch all logs
docker-compose logs -f
```

### Step 4: Test Call Flow

1. **Open the application in browser:**
   ```
   http://localhost:3000
   ```

2. **Fill out the lead form:**
   - Username: Test User
   - Company Name: Test Company
   - Company Email: test@example.com
   - Phone Number: +1234567890 (use a real number if testing actual calls)

3. **Submit the form**

4. **Watch what happens:**
   - Status changes to "Initiating" → "Initiated" → "In Progress"
   - Backend logs show call initiation
   - Call connects to the phone number

### Step 5: Monitor Redis Data

While the call is in progress, check Redis:

```bash
# Connect to Redis CLI
docker exec -it eleven-labs-redis redis-cli

# Inside Redis CLI, run these commands:

# Check all keys
KEYS *

# You should see keys like:
# 1) "lead:lead_abc123"
# 2) "lead:status:lead_abc123"
# 3) "conv:lead_abc123"  ← This is the new conversation ID storage!

# Get the conversation ID
GET conv:lead_abc123
# Should return something like: "conv_xyz789..."

# Check transcript (will be empty until call completes)
GET transcript:lead_abc123

# Exit Redis CLI
exit
```

### Step 6: Wait for Call Completion

- Make a test call or wait for existing call to complete (2-5 minutes)
- The frontend automatically polls every 5 seconds
- Watch browser console (F12) for polling activity

### Step 7: Verify Transcript Appears

After the call completes:

1. **Frontend should automatically show transcript** (within 5-15 seconds)

2. **Check Redis again:**
   ```bash
   docker exec -it eleven-labs-redis redis-cli
   GET transcript:lead_abc123
   ```
   Should now show the full transcript JSON!

3. **Backend logs should show:**
   ```
   Connected to Redis
   Backend server running on port 3001
   ```

## Expected Behavior

### ✅ What Should Happen

1. **Call Initiation:**
   - Lead ID generated: `lead_abc123...`
   - Conversation ID stored in Redis: `conv:lead_abc123`
   - Status updates: `initiating` → `initiated` → `in_progress`

2. **During Call:**
   - Frontend polls Redis every 5 seconds
   - No transcript yet (call still in progress)
   - Redis returns `null` for transcript

3. **After Call Completes:**
   - Frontend polls Redis (empty)
   - **Frontend polls Eleven Labs API directly** (fallback)
   - API returns transcript
   - Transcript cached in Redis
   - **Transcript appears in UI within 5-15 seconds**

### ⚠️ What's Expected (Not Errors)

- **Webhook will NOT be called** (because it's localhost - not accessible from internet)
- **This is OK!** The polling fallback handles it automatically
- You might see "API polling" logs in browser console - this is normal and expected

## Troubleshooting

### Issue: Containers won't start

```bash
# Check what's wrong
docker-compose logs

# Stop and restart
docker-compose down
docker-compose up -d
```

### Issue: Port already in use

```bash
# Find what's using the port
sudo lsof -i :3001
sudo lsof -i :3000

# Kill the process or change port in docker-compose.yml
```

### Issue: Transcript not appearing

**Check 1: Conversation ID stored?**
```bash
docker exec -it eleven-labs-redis redis-cli
GET conv:lead_YOUR_LEAD_ID
```
If null, check `.env` for `VITE_ELEVEN_LABS_API_KEY`

**Check 2: Call actually completed?**
- Log into Eleven Labs dashboard
- Check conversation history
- Verify call shows as "completed"

**Check 3: API key valid?**
```bash
# Check .env file
cat .env | grep ELEVEN_LABS_API_KEY

# Test API manually
curl -H "xi-api-key: YOUR_API_KEY" \
  https://api.elevenlabs.io/v1/convai/conversations/CONV_ID
```

**Check 4: Browser console errors?**
- Open DevTools (F12)
- Check Console tab for errors
- Look for network errors to Eleven Labs API

### Issue: Redis connection error

```bash
# Restart Redis container
docker-compose restart redis

# Check Redis logs
docker-compose logs redis

# Verify Redis is accessible
docker exec -it eleven-labs-redis redis-cli PING
```

## Key Files to Check

### Environment Variables (`.env`)
```bash
# Make sure these are set:
VITE_ELEVEN_LABS_API_KEY=your_api_key_here
VITE_AGENT_ID=agent_3501kf4e3ak0eqkrxg1rttttk881
VITE_PHONE_NUMBER_ID=phnum_4901kg4yjvgpetqbeknvhgm1stk4
VITE_REDIS_URL=redis://redis:6379
```

### Backend Environment (`backend/.env`)
```bash
REDIS_URL=redis://redis:6379
PORT=3001
FRONTEND_URL=http://localhost:3000
```

## Monitoring Commands

### Check Application Status
```bash
# All containers
docker-compose ps

# Detailed status
docker stats

# Check logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs redis
```

### Check Redis Data
```bash
# Interactive
docker exec -it eleven-labs-redis redis-cli

# One-off commands
docker exec eleven-labs-redis redis-cli KEYS "*"
docker exec eleven-labs-redis redis-cli GET "transcript:lead_abc123"
```

### Check Network Connectivity
```bash
# Backend health
curl http://localhost:3001/health

# Test backend API
curl -X POST http://localhost:3001/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"lead_id":"test","conversation_id":"test","transcript":[],"status":"completed"}'
```

## Cleanup

### Stop Application
```bash
# Stop containers (keeps data)
docker-compose stop

# Stop and remove containers (keeps data)
docker-compose down

# Stop and remove everything including data
docker-compose down -v
```

### Clear Redis Data
```bash
# Connect to Redis
docker exec -it eleven-labs-redis redis-cli

# Delete all keys
FLUSHALL

# Or delete specific keys
DEL lead:lead_abc123
DEL transcript:lead_abc123
DEL conv:lead_abc123
```

## Success Checklist

Test the full flow and check these off:

- [ ] All containers started successfully
- [ ] Backend health check returns OK
- [ ] Redis responds to PING
- [ ] Frontend loads at http://localhost:3000
- [ ] Form submission creates new lead
- [ ] Conversation ID stored in Redis (`conv:lead_xxx`)
- [ ] Call initiated in Eleven Labs dashboard
- [ ] During call: Status updates to "in_progress"
- [ ] After call: Transcript appears in UI within 15 seconds
- [ ] Transcript data stored in Redis (`transcript:lead_xxx`)
- [ ] Can submit multiple calls in sequence
- [ ] "New Call" button resets form and allows new submission

## What's Different from Before

### Before (Webhook Only)
```
Call completes → Eleven Labs tries webhook → FAILS (localhost not accessible) → No transcript 😞
```

### Now (Polling Fallback)
```
Call completes → Eleven Labs tries webhook → FAILS (localhost not accessible)
               → Frontend polls Redis → Empty
               → Frontend polls Eleven Labs API → Success! → Transcript displayed 😊
```

## Next Steps

Once you verify everything works:

1. ✅ Test with a real phone call (if not already done)
2. ✅ Verify transcript accuracy
3. ✅ Test multiple calls in sequence
4. ✅ Check Redis data persistence (restart containers, data should remain)
5. ✅ Consider adjusting polling interval if needed (currently 5 seconds)

## Notes

- **Polling latency:** 5-15 seconds after call completion (this is expected)
- **No webhook needed:** System works entirely without public endpoint
- **Works in restricted networks:** Only requires outbound HTTPS to Eleven Labs API
- **Automatic caching:** API results stored in Redis to prevent repeated calls
- **Failsafe:** Even if webhook somehow works, polling is harmless (just checks Redis first)

---

**Status:** Ready to test! 🚀

Just run `docker-compose up -d` and open http://localhost:3000
