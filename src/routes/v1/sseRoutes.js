const express = require('express');
const router = express.Router();
const { protect } = require('../../middlewares/v1/authMiddleware');
const appEventEmitter = require('../../utils/appEventEmitter');

router.get('/stream', protect, (req, res) => {
  // 1. Establish Server-Sent Events headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Flush headers immediately
  res.write('\n');

  console.log(`[SSE] User ${req.user.name} established a one-way telemetry stream.`);

  // Send initial connection packet
  res.write(`data: ${JSON.stringify({ type: 'sys-info', text: 'SSE subscription established. Streaming active telemetry...' })}\n\n`);

  // 2. Periodic system telemetry streaming (Mock CPU / Memory stats)
  const telemetryInterval = setInterval(() => {
    const memory = process.memoryUsage();
    const mockCpu = (Math.sin(Date.now() / 20000) * 15 + 20 + Math.random() * 5).toFixed(1); // Oscillating CPU load 5% - 40%
    
    const payload = {
      type: 'telemetry',
      cpu: parseFloat(mockCpu),
      memory: parseFloat((memory.heapUsed / 1024 / 1024).toFixed(2)), // in MB
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };

    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  }, 2000);

  // 3. Real-time event propagation via EventEmitter subscription
  const onUserSignup = (user) => {
    const payload = {
      type: 'user-signup',
      name: user.name,
      email: user.email,
      timestamp: new Date().toISOString(),
    };
    
    // We send this with a custom SSE 'event' identifier
    res.write(`event: user-signup\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  appEventEmitter.on('user:registered', onUserSignup);

  // 4. Memory Leak Protection: Clear timers & event handlers on connection termination
  req.on('close', () => {
    clearInterval(telemetryInterval);
    appEventEmitter.removeListener('user:registered', onUserSignup);
    console.log(`[SSE] Telemetry stream closed for user: ${req.user.name}`);
    res.end();
  });
});

module.exports = router;
