# Renderowl Worker Health Check Server
# Worker exposes a simple HTTP health endpoint

const http = require('http');
const { Queue } = require('bullmq');
const Redis = require('ioredis');

const PORT = process.env.HEALTH_PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL);

const server = http.createServer(async (req, res) => {
  if (req.url === '/health' && req.method === 'GET') {
    try {
      // Check Redis connection
      await redis.ping();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy',
        service: 'renderowl-worker',
        version: '2.0.0',
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      }));
    }
  } else if (req.url === '/ready' && req.method === 'GET') {
    // Readiness check - verify can process jobs
    try {
      const queue = new Queue('video-rendering', { connection: redis });
      const waiting = await queue.getWaitingCount();
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ready',
        waiting_jobs: waiting,
        timestamp: new Date().toISOString(),
      }));
    } catch (error) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'not ready',
        error: error.message,
      }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

server.listen(PORT, () => {
  console.log(`Worker health server running on port ${PORT}`);
});

module.exports = { server };
