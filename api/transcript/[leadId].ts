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
