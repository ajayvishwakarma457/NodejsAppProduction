const { httpRequestsTotal, httpRequestDurationSeconds } = require('../../utils/metrics');

const metricsMiddleware = (req, res, next) => {
  // Exclude metrics endpoint to avoid tracking metrics scrapes
  if (req.path === '/metrics') {
    return next();
  }

  const start = process.hrtime();

  res.on('finish', () => {
    const duration = process.hrtime(start);
    const durationSeconds = duration[0] + duration[1] / 1e9;

    // Get matched route template if available, fallback to normalized path pattern or 'not_found'
    let route = 'not_found';
    
    if (req.route) {
      route = req.route.path;
      if (req.baseUrl) {
        route = req.baseUrl + (route === '/' ? '' : route);
      }
    } else if (res.statusCode !== 404) {
      // Fallback for paths that don't match router templates but completed successfully
      route = req.baseUrl ? req.baseUrl + req.path : req.path;
    }

    const labels = {
      method: req.method,
      route,
      status_code: res.statusCode.toString(),
    };

    httpRequestsTotal.inc(labels);
    httpRequestDurationSeconds.observe(labels, durationSeconds);
  });

  next();
};

module.exports = metricsMiddleware;
