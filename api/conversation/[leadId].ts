import { VercelRequest, VercelResponse } from '@vercel/node';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { leadId } = req.query;

  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
