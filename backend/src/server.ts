import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import Redis from 'ioredis';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const REDIS_TTL_SECONDS = 86400; // 24 hours

// Redis connection - uses REDIS_URL env var (Railway provides this when you add a Redis plugin)
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

// CORS: allow configured frontend URL, or same-origin if not set
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(s => s.trim())
  : [];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, server-to-server, curl)
    if (!origin) return callback(null, true);
    // Allow if in configured origins list
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(null, true); // In production behind Railway, allow all for webhook access
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Types
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

type CallStatus = 'idle' | 'pending' | 'initiating' | 'initiated' | 'in_progress' | 'completed' | 'failed';

// Helper function to map webhook status
const mapStatus = (webhookStatus: string): CallStatus => {
  const statusMap: Record<string, CallStatus> = {
    'ringing': 'in_progress',
    'in-progress': 'in_progress',
    'completed': 'completed',
    'failed': 'failed',
    'busy': 'failed',
    'no-answer': 'failed',
  };
  return statusMap[webhookStatus.toLowerCase()] || 'completed';
};

// Helper function to verify webhook signature
const verifyWebhookSignature = async (signature: string, body: string): Promise<boolean> => {
  const webhookSecret = process.env.WEBHOOK_SECRET;
  if (!webhookSecret) {
    return true;
  }

  const crypto = await import('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  return signature === expectedSignature;
};

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Endpoints

// Get transcript by lead ID
app.get('/api/transcript/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const data = await redis.get(`transcript:${leadId}`);

    if (!data) {
      return res.status(404).json({ error: 'Transcript not found' });
    }

    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Error fetching transcript:', error);
    res.status(500).json({ error: 'Failed to fetch transcript' });
  }
});

// Get call status by lead ID
app.get('/api/status/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const status = await redis.hget(`lead:status:${leadId}`, 'status');

    if (!status) {
      return res.status(404).json({ error: 'Status not found' });
    }

    res.json({ status });
  } catch (error) {
    console.error('Error fetching status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
});

// Save lead
app.post('/api/lead', async (req: Request, res: Response) => {
  try {
    const { leadId, data } = req.body;
    await redis.setex(`lead:${leadId}`, REDIS_TTL_SECONDS, JSON.stringify(data));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving lead:', error);
    res.status(500).json({ error: 'Failed to save lead' });
  }
});

// Update call status
app.put('/api/status/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { status } = req.body;
    await redis.hset(`lead:status:${leadId}`, 'status', status, 'updatedAt', new Date().toISOString());
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Save conversation ID
app.post('/api/conversation/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { conversationId } = req.body;
    await redis.setex(`conv:${leadId}`, REDIS_TTL_SECONDS, conversationId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving conversation ID:', error);
    res.status(500).json({ error: 'Failed to save conversation ID' });
  }
});

// Get conversation ID
app.get('/api/conversation/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const conversationId = await redis.get(`conv:${leadId}`);

    if (!conversationId) {
      return res.status(404).json({ error: 'Conversation ID not found' });
    }

    res.json({ conversationId });
  } catch (error) {
    console.error('Error fetching conversation ID:', error);
    res.status(500).json({ error: 'Failed to fetch conversation ID' });
  }
});

// Save transcript
app.post('/api/transcript/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const transcript = req.body;
    await redis.setex(`transcript:${leadId}`, REDIS_TTL_SECONDS, JSON.stringify(transcript));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving transcript:', error);
    res.status(500).json({ error: 'Failed to save transcript' });
  }
});

// Initiate outbound call via ElevenLabs — keeps API key server-side
app.post('/api/calls/initiate', async (req: Request, res: Response) => {
  const elevenlabsApiKey = process.env.ELEVENLABS_API_KEY;
  const agentId = process.env.AGENT_ID;
  const phoneNumberId = process.env.PHONE_NUMBER_ID;

  if (!elevenlabsApiKey || !agentId || !phoneNumberId) {
    return res.status(500).json({ error: 'ElevenLabs credentials not configured on server' });
  }

  try {
    const body = req.body as Record<string, any>;

    // Support two calling conventions:
    // 1. Frontend shape:  { leadId, formData: { username, companyName, companyEmail, phoneNumber } }
    // 2. ChampIQ shape:   { call_id, phone_number, script, call_type, metadata: { prospect_id, ... } }
    let toNumber: string;
    let leadId: string;
    let leadName: string;
    let company: string;
    let email: string;
    let script: string | undefined;

    if (body.formData) {
      // Frontend convention
      const fd = body.formData as { username: string; companyName: string; companyEmail: string; phoneNumber: string };
      leadId = body.leadId as string;
      toNumber = fd.phoneNumber;
      leadName = fd.username;
      company = fd.companyName;
      email = fd.companyEmail;
    } else {
      // ChampIQ convention
      leadId = (body.metadata?.prospect_id as string) || (body.call_id as string);
      toNumber = body.phone_number as string;
      leadName = (body.metadata?.lead_name as string) || '';
      company = (body.metadata?.company as string) || '';
      email = (body.metadata?.email as string) || '';
      script = body.script as string | undefined;
    }

    if (!toNumber) {
      return res.status(400).json({ error: 'phone_number / formData.phoneNumber is required' });
    }

    const dynamicVariables: Record<string, string> = {
      lead_name: leadName,
      leadId: leadId,
      company: company,
      email: email,
    };
    if (script) dynamicVariables.script = script;

    const payload = {
      agent_id: agentId,
      agent_phone_number_id: phoneNumberId,
      to_number: toNumber,
      conversation_initiation_client_data: {
        type: 'conversation_initiation_client_data',
        dynamic_variables: dynamicVariables,
      },
    };

    const upstream = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': elevenlabsApiKey,
      },
      body: JSON.stringify(payload),
    });

    const data = await upstream.json() as Record<string, unknown>;

    if (!upstream.ok) {
      console.error('ElevenLabs API error:', data);
      return res.status(upstream.status).json({ error: (data.message as string) || 'ElevenLabs API error' });
    }

    // Store the conversation ID keyed by leadId for later status polling
    if (data.conversation_id && leadId) {
      await redis.setex(`conv:${leadId}`, REDIS_TTL_SECONDS, data.conversation_id as string);
      await redis.hset(`lead:status:${leadId}`, 'status', 'initiated', 'updatedAt', new Date().toISOString());
    }

    console.log(`Call initiated for lead ${leadId}, conversation: ${data.conversation_id}`);
    res.json({ ...data, call_id: data.conversation_id, status: 'initiated' });
  } catch (error) {
    console.error('Error initiating call:', error);
    res.status(500).json({ error: 'Failed to initiate call' });
  }
});

// Webhook endpoint - ElevenLabs sends post-call data here
app.post('/api/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-webhook-signature'] as string;
    const body = JSON.stringify(req.body);

    // Verify signature if configured
    if (signature) {
      const isValid = await verifyWebhookSignature(signature, body);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' });
      }
    }

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

    await redis.setex(`transcript:${lead_id}`, REDIS_TTL_SECONDS, JSON.stringify(transcriptData));

    // Update call status
    const callStatus = mapStatus(status);
    await redis.hset(
      `lead:status:${lead_id}`,
      'status',
      callStatus,
      'updatedAt',
      new Date().toISOString()
    );

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
});

// Serve frontend static files (built React app)
const publicPath = path.join(__dirname, '..', 'public');
const indexPath = path.join(publicPath, 'index.html');

app.use(express.static(publicPath));

// SPA fallback - serve index.html for any non-API route
app.get('*', (req: Request, res: Response) => {
  // Don't serve index.html for API routes that weren't matched
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('Error serving index.html:', err);
      res.status(500).json({ error: 'Frontend not available' });
    }
  });
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await redis.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await redis.quit();
  process.exit(0);
});
