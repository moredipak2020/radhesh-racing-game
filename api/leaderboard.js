import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    try {
      // Fetch the top 5 scores from the 'leaderboard' sorted set
      const scores = await kv.zrange('leaderboard', 0, 4, { rev: true, withScores: true });
      
      // Ensure it returns a uniform format: [{ name: 'Player1', score: 5000 }, ...]
      const formattedScores = [];
      if (scores && scores.length > 0) {
        if (typeof scores[0] === 'object' && scores[0].member) {
            // New Vercel KV SDK format: [{ member: 'Dipak', score: 5000 }]
            for (const entry of scores) {
                formattedScores.push({ name: entry.member, score: entry.score });
            }
        } else {
            // Fallback for flat array format: ['Dipak', 5000, 'Radhesh', 4000]
            for (let i = 0; i < scores.length; i += 2) {
              formattedScores.push({ name: scores[i], score: scores[i+1] });
            }
        }
      }

      return res.status(200).json(formattedScores);
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  } 

  if (req.method === 'POST') {
    try {
      let { name, score } = req.body;
      if (!name) name = 'Anonymous Racer';
      if (score === undefined) return res.status(400).json({ error: 'Missing score' });
      
      // Add the score to the Redis Sorted Set
      // Use ZADD, member is the player name, score is their points
      await kv.zadd('leaderboard', { score: score, member: name });
      
      return res.status(200).json({ success: true });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
