const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const Redis = require('ioredis');

const redisClient = new Redis();
const store = new RedisStore({
  client: redisClient,
  prefix: 'test-sess:',
});

store.set('123', { cookie: {}, user: 'test' }, (err) => {
  if (err) {
    console.error('STORE SET ERROR:', err);
  } else {
    console.log('STORE SET SUCCESS!');
    store.get('123', (err, session) => {
      if (err) {
        console.error('STORE GET ERROR:', err);
      } else {
        console.log('STORE GET SUCCESS:', session);
      }
      process.exit(0);
    });
  }
});
