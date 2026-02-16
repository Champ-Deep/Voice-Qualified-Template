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
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

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
