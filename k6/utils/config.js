// K6 Load Testing Configuration

export const config = {
  // API base URL - can be overridden via K6_VU_API_URL environment variable
  apiBaseUrl: __ENV.K6_VU_API_URL || 'http://localhost:5049',
  
  // Test user prefix
  testUserPrefix: 'loadtest',
  
  // Load pattern stages (ramp-up to 1K users)
  stages: [
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '1m', target: 500 },   // Ramp up to 500 users
    { duration: '2m', target: 1000 },  // Ramp up to 1K users
    { duration: '2m', target: 1000 },  // Hold at 1K
    { duration: '1m', target: 0 },     // Ramp down
  ],
  
  // Performance thresholds
  thresholds: {
    // 95% of requests should complete within 500ms
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    // Error rate should be less than 1%
    http_req_failed: ['rate<0.01'],
    // Minimum throughput
    http_reqs: ['rate>100'],
  },
};
