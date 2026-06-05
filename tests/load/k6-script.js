import http from 'k6/http';
import { check, sleep } from 'k6';

// 1. Stress test configurations & thresholds
export const options = {
  stages: [
    { duration: '5s', target: 20 },  // Ramp-up to 20 users over 5 seconds
    { duration: '10s', target: 20 }, // Stay at 20 users for 10 seconds
    { duration: '5s', target: 0 },   // Ramp-down to 0 users
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],   // Error rate must be less than 1%
    http_req_duration: ['p(95)<300'], // 95% of requests must complete under 300ms
  },
};

// 2. Load script target execution
export default function () {
  const url = 'http://localhost:5000/api/v1/jobs/heavy-cpu';
  const payload = JSON.stringify({ number: 15 });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      // Simulating gateway offloaded authentication header to bypass token checks
      'x-user-id': 'load_test_user_123',
    },
  };

  const response = http.post(url, payload, params);

  check(response, {
    'status is 200': (r) => r.status === 200,
    'calculation is correct': (r) => r.json().data.result === 610, // Fib(15) = 610
  });

  sleep(0.5); // Pause between iterations to simulate real user cadence
}
