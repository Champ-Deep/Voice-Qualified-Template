import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379', {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  console.log('Connected to Redis');
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
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
    console.warn('Webhook secret not configured');
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
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Endpoints for frontend

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
    await redis.setex(`lead:${leadId}`, 86400, JSON.stringify(data));
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
    await redis.setex(`conv:${leadId}`, 86400, conversationId);
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
    await redis.setex(`transcript:${leadId}`, 86400, JSON.stringify(transcript));
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving transcript:', error);
    res.status(500).json({ error: 'Failed to save transcript' });
  }
});

// Webhook endpoint
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

    await redis.setex(`transcript:${lead_id}`, 86400, JSON.stringify(transcriptData));

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

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
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
