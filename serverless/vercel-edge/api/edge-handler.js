// serverless/vercel-edge/api/edge-handler.js

// Declare Edge runtime for Vercel deployment compilation
const config = {
  runtime: 'edge',
};

async function handler(request) {
  try {
    const url = new URL(request.url);
    const queryName = url.searchParams.get('name') || 'Guest';

    const clientIp = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const clientGeo = request.headers.get('x-vercel-ip-country') || 'US';

    return new Response(
      JSON.stringify({
        message: `Hello ${queryName} from Vercel Edge Functions!`,
        ip: clientIp,
        country: clientGeo,
        timestamp: new Date().toISOString(),
        runtime: 'V8 Isolate',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'X-Vercel-Cache': 'MISS',
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: 'Edge runtime failure',
        message: err.message,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

module.exports = handler;
module.exports.config = config;
