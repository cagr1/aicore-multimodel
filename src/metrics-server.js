// Metrics Server - HTTP server for Prometheus metrics
import http from 'http';
import telemetry from './telemetry/index.js';

/**
 * Create metrics HTTP endpoint
 */
export function createMetricsServer(port = 9090) {
  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    const url = new URL(req.url, `http://localhost:${port}`);
    
    // /metrics endpoint - Prometheus format
    if (url.pathname === '/metrics') {
      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.writeHead(200);
      res.end(telemetry.getMetrics());
      return;
    }
    
    // /metrics/json endpoint - JSON format for debugging
    if (url.pathname === '/metrics/json') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify(telemetry.getMetricsJSON(), null, 2));
      return;
    }
    
    // /health endpoint
    if (url.pathname === '/health') {
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      return;
    }
    
    // 404 for other paths
    res.writeHead(404);
    res.end('Not Found');
  });
  
  server.listen(port, () => {
    console.error(`[Metrics] Server running on port ${port}`);
    console.error(`[Metrics] Metrics available at http://localhost:${port}/metrics`);
  });
  
  return server;
}

/**
 * Start metrics server if enabled
 */
export function startMetricsServer() {
  const port = parseInt(process.env.METRICS_PORT || '9090', 10);
  const enabled = process.env.METRICS_ENABLED !== 'false';
  
  if (enabled) {
    return createMetricsServer(port);
  }
  
  return null;
}

export default { createMetricsServer, startMetricsServer };
