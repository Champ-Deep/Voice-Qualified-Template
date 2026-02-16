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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-webhook-signature');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
