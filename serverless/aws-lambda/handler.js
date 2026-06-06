// serverless/aws-lambda/handler.js
'use strict';

// Reuse database connection across invocations (Cold Start Optimization)
let cachedDbConnection = null;

async function connectToDatabase() {
  if (cachedDbConnection && cachedDbConnection.readyState === 1) {
    console.log('=> Using existing database connection');
    return cachedDbConnection;
  }

  console.log('=> Creating new database connection');
  // In a real environment, load MONGO_URI from secrets manager or environment
  const mongoose = require('mongoose');
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/prod_db';

  cachedDbConnection = await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
  });

  return cachedDbConnection;
}

module.exports.apiHandler = async (event, context) => {
  // Prevent Lambda from waiting for the Node.js event loop to be empty if connections stay active
  context.callbackWaitsForEmptyEventLoop = false;

  console.log('Received event:', JSON.stringify(event, null, 2));

  try {
    // Connect to database (reused across warm starts)
    await connectToDatabase();

    const path = event.path || '/';
    const method = event.httpMethod || 'GET';

    if (path === '/health' && method === 'GET') {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'healthy',
          database: 'connected',
          timestamp: new Date().toISOString(),
        }),
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Hello from AWS Lambda!',
        path,
        method,
      }),
    };
  } catch (err) {
    console.error('Database connection or execution error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: 'Internal Server Error',
        message: err.message,
      }),
    };
  }
};
