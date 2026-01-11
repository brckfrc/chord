# Chord Load Testing Guide

> **Purpose:** Guide for running K6 load tests to validate Chord API performance under high concurrent load (1K users).

This document explains how to set up, run, and interpret K6 load tests for Chord's critical API endpoints.

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Installation](#installation)
4. [Running Tests](#running-tests)
5. [Test Scenarios](#test-scenarios)
6. [Interpreting Results](#interpreting-results)
7. [CI/CD Integration](#cicd-integration)
8. [Troubleshooting](#troubleshooting)

---

## Overview

Chord uses **K6** for load testing to validate API performance under realistic load conditions. The test suite focuses on critical endpoints:

- **Authentication**: Register, Login, Get Current User
- **Guild Management**: Create Guild, List Guilds, Get Guild Details
- **Messaging**: List Messages, Send Message, Edit Message
- **Voice**: Get Voice Token

### Load Pattern

The default test configuration uses a **ramp-up pattern** optimized for YunoHost deployment:

- **0 → 50 users** over 1 minute (slow start)
- **50 → 200 users** over 2 minutes
- **200 → 500 users** over 1 minute
- **500 → 1K users** over 2 minutes (peak load)
- **Hold at 1K users** for 2 minutes
- **Ramp down** to 0 over 1 minute

**Total duration**: ~9 minutes

### Performance Thresholds

Tests validate the following performance criteria:

- **Response Time**: 95% of requests complete within 500ms (p95 < 500ms)
- **Error Rate**: Less than 1% of requests fail
- **Throughput**: Minimum 100 requests per second
- **Success Rate**: > 99% of requests succeed

---

## Prerequisites

Before running load tests, ensure:

1. **K6 is installed** (see [Installation](#installation))
2. **API is running** (development or test environment)
3. **Database is accessible** (test data will be created)
4. **Sufficient resources** (CPU, memory, network bandwidth)

### Recommended System Resources

- **CPU**: 4+ cores recommended for 1K concurrent users
- **Memory**: 8GB+ RAM
- **Network**: Stable connection to API server
- **Database**: SQL Server with adequate connection pool

---

## Installation

### Install K6

**macOS (Homebrew):**

```bash
brew install k6
```

**Linux (Debian/Ubuntu):**

```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
Download installer from [k6.io/download](https://k6.io/docs/getting-started/installation/)

**Docker (Alternative):**

```bash
docker pull grafana/k6:latest
```

### Verify Installation

```bash
k6 version
```

Expected output: `k6 v0.x.x`

---

## Running Tests

### Method 1: Manual Execution (Recommended)

**Full Load Test (1K users):**

```bash
npm run test:load
```

**Smoke Test (10 users, 30 seconds):**

```bash
npm run test:load:smoke
```

**Custom Configuration:**

```bash
# Override API URL
K6_VU_API_URL=http://localhost:5049 k6 run k6/load-test.js

# Custom VU count and duration
k6 run k6/load-test.js --vus 100 --duration 2m

# Export results to JSON/HTML
k6 run --out json=results.json --out html=report.html k6/load-test.js
```

### Method 2: Docker Execution

**Using Docker Compose:**

**Option 1: Run with test environment (Recommended)**

```bash
# Start test environment and run load test together
# This ensures network is created and K6 can connect to api-test:80
docker compose -f docker-compose.test.yml -f docker-compose.load-test.yml run --rm k6-load-test

# Run smoke test (10 users, 30 seconds)
docker compose -f docker-compose.test.yml -f docker-compose.load-test.yml run --rm k6-load-test run load-test.js --vus 10 --duration 30s
```

**Option 2: Test environment already running**

```bash
# Step 1: Start test environment (creates chord-test-network)
docker compose -f docker-compose.test.yml up -d

# Step 2: Run load test (uses existing network)
docker compose -f docker-compose.load-test.yml run --rm k6-load-test

# Run smoke test
docker compose -f docker-compose.load-test.yml run --rm k6-load-test run load-test.js --vus 10 --duration 30s
```

**Important:** Test environment must be started first to create the network. If you see "network not found" error, use Option 1 instead.

**Option 3: Production URL (⚠️ Not Recommended)**

```bash
# Test against production (default: https://chord.borak.dev)
docker compose -f docker-compose.load-test.yml run --rm k6-load-test run load-test.js --vus 10 --duration 30s
```

**⚠️ Important Warning:**
- **Cloudflare/DDoS Protection**: Production URLs behind Cloudflare or DDoS protection will block high-volume load tests from external IPs
- **Rate Limiting**: You'll see high error rates (90%+) due to rate limiting
- **Recommended**: Use **Option 1** (test environment) instead for accurate load testing

**Option 4: Server-Side Testing (For Production Load Tests)**

If you need to test production, run K6 **inside the production server** to bypass Cloudflare:

**Option 4a: Using Docker Compose (Recommended)**

```bash
# On production server
# Connect to production API container via Docker network (chord-network)
# This uses the internal Docker hostname (chord-api-green:80) instead of localhost
K6_VU_API_URL=http://chord-api-green:80 docker compose -f docker-compose.load-test.yml run --rm k6-load-test run load-test.js --vus 10 --duration 30s
```

**Option 4b: Using Native K6 Installation**

```bash
# On production server
# 1. Install K6
curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xvz
sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/

# 2. Clone/copy K6 scripts to server
# 3. Run test against production API (use the port exposed by Docker, e.g., 5003)
cd /path/to/k6
K6_VU_API_URL=http://localhost:5003 k6 run load-test.js --vus 10 --duration 30s
```

**Note:** Option 4a is recommended as it uses Docker networking and doesn't require exposing ports or installing K6 natively.

**Important for YunoHost Deployment:**

When testing against YunoHost production server, you must enable rate limiting bypass. There are two ways to do this:

**Method 1: GitHub Repository Variable (Recommended - Automatic)**

1. Go to your GitHub repository: `https://github.com/YOUR_USERNAME/chord/settings/variables/actions`
2. Click "New repository variable"
3. Name: `RateLimiting__AllowLoadTestBypass`
4. Value: `true` (or `false` to disable)
5. Save

The next auto-deploy will automatically enable/disable bypass based on this variable.

**Method 2: Manual (One-time)**

```bash
# Set environment variable to enable bypass
export RateLimiting__AllowLoadTestBypass=true

# Restart API container with bypass enabled
docker compose -f docker-compose.deploy.yml -f docker-compose.yunohost.yml --profile green up -d --force-recreate

# Then run K6 test
K6_VU_API_URL=http://chord-api-green:80 docker compose -f docker-compose.load-test.yml run --rm k6-load-test run load-test.js --vus 10 --duration 30s
```

**Note:** Method 1 is recommended as it persists across deployments. Method 2 is temporary and will be lost after the next auto-deploy.

**Note:** 
- **Option 1** is recommended: K6 uses `chord-test-network` to connect to `api-test:80` (works on Linux, no `host.docker.internal` needed)
- To override the default command, provide the full K6 command after the service name (e.g., `run load-test.js --vus 10`)
- Default API URL is `https://chord.borak.dev` (production). Override with `K6_VU_API_URL` for test environment
- **Rate Limiting Bypass**: K6 tests include `X-Load-Test: true` header to bypass rate limiting when `RateLimiting:AllowLoadTestBypass` is enabled

**Using Docker directly:**

```bash
docker run --rm -i -v $(pwd)/k6:/scripts grafana/k6:latest run /scripts/load-test.js
```

### Method 3: Test Environment Integration

**Run against test environment:**

```bash
# Start test environment
docker compose -f docker-compose.test.yml up -d

# Wait for services to be healthy
sleep 30

# Run load test (API accessible at localhost:5049)
npm run test:load

# Cleanup
docker compose -f docker-compose.test.yml down -v
```

---

## Test Scenarios

### 1. Authentication Flow (`auth-flow.js`)

**Endpoints tested:**

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login with credentials
- `GET /api/auth/me` - Get current user (protected)

**Test data:**

- Each Virtual User (VU) creates unique credentials
- Format: `loadtest_{VU}_{ITER}_{timestamp}`
- Password: `LoadTestPassword123!`

### 2. Guild Management Flow (`guild-flow.js`)

**Endpoints tested:**

- `POST /api/guilds` - Create guild
- `GET /api/guilds` - List user's guilds
- `GET /api/guilds/{id}` - Get guild details

**Prerequisites:**

- Requires authenticated user (from auth-flow)
- Each VU creates own guilds (no conflicts)

### 3. Messaging Flow (`message-flow.js`)

**Endpoints tested:**

- `GET /api/channels/{channelId}/messages` - List messages (paginated)
- `POST /api/channels/{channelId}/messages` - Send message
- `PUT /api/channels/{channelId}/messages/{id}` - Edit message

**Prerequisites:**

- Requires guild and channel (created in guild-flow)
- Uses default "general" text channel from guild creation

### 4. Voice Token Flow (`voice-flow.js`)

**Endpoints tested:**

- `POST /api/voice/token` - Get LiveKit voice token

**Prerequisites:**

- Requires voice channel (created with guild)
- Validates token response structure

---

## Interpreting Results

### Console Output

K6 provides real-time metrics during test execution:

```
running (8m00.0s), 0000/1000 VUs, 15234 complete and 0 interrupted iterations
default ✓ [======================================] 1000 VUs  8m0s

     ✓ get me status is 200
     ✓ create guild status is 201
     ✓ send message status is 201
     ✓ get voice token status is 200

     checks.........................: 100.00% ✓ 45678  ✗ 0
     data_received..................: 12 MB   25 kB/s
     data_sent......................: 8.5 MB  18 kB/s
     http_req_blocked...............: avg=1.2ms   min=0s     med=0s      max=45ms
     http_req_connecting............: avg=0.5ms   min=0s     med=0s      max=20ms
     http_req_duration..............: avg=45ms    min=12ms   med=38ms    max=890ms
       { expected_response:true }...: avg=45ms    min=12ms   med=38ms    max=890ms
     http_req_failed................: 0.01%  ✓ 4      ✗ 45674
     http_reqs......................: 45678  95.16/s
     iteration_duration.............: avg=1.2s     min=0.5s    med=1.1s    max=3.5s
     iterations....................: 11420  23.79/s
     vus............................: 1000    min=0     max=1000
     vus_max........................: 1000    min=1000  max=1000
```

### Key Metrics

**Response Time (`http_req_duration`):**

- **avg**: Average response time (target: < 200ms)
- **p(95)**: 95th percentile (target: < 500ms)
- **p(99)**: 99th percentile (target: < 1000ms)
- **max**: Maximum response time (should be reasonable)

**Error Rate (`http_req_failed`):**

- Should be < 1% for healthy system
- Check failed requests for patterns (timeouts, 500 errors, etc.)

**Throughput (`http_reqs`):**

- Requests per second (target: > 100 req/s)
- Higher is better (indicates system can handle load)

**Checks:**

- Percentage of assertions that passed
- Should be 100% (all checks pass)

### HTML Report

Generate HTML report for detailed analysis:

```bash
k6 run --out html=report.html k6/load-test.js
```

Open `report.html` in browser to view:

- Response time distribution
- Request rate over time
- Error breakdown
- Threshold pass/fail status

### Threshold Validation

Tests pass if all thresholds are met:

- ✅ `http_req_duration: ['p(95)<500']` - 95% of requests < 500ms
- ✅ `http_req_failed: ['rate<0.01']` - Error rate < 1%
- ✅ `http_reqs: ['rate>100']` - Throughput > 100 req/s

If thresholds fail, investigate:

- Database connection pool exhaustion
- API rate limiting
- Network latency
- Resource constraints (CPU, memory)

---

## CI/CD Integration

### GitHub Actions (Optional)

Add scheduled load tests to CI/CD:

```yaml
# .github/workflows/load-test.yml
name: Load Test

on:
  schedule:
    - cron: "0 2 * * 0" # Weekly on Sunday at 2 AM
  workflow_dispatch: # Manual trigger

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install K6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Start Test Environment
        run: docker compose -f docker-compose.test.yml up -d

      - name: Wait for API
        run: |
          timeout 60 bash -c 'until curl -f http://localhost:5049/health; do sleep 2; done'

      - name: Run Load Test
        run: npm run test:load
        env:
          K6_VU_API_URL: http://localhost:5049

      - name: Upload Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: k6-results
          path: k6/results/
```

**Note:** Load tests are resource-intensive. Run them:

- **Scheduled**: Weekly or monthly
- **On release**: Before major deployments
- **Not on every commit**: Too expensive

---

## YunoHost Deployment Testing

### Rate Limiting Bypass Configuration

For YunoHost production deployments, load tests require rate limiting bypass to avoid 429 (Too Many Requests) errors.

**Configuration Methods:**

**Method 1: GitHub Repository Variable (Recommended - Automatic)**

This method persists across deployments and is managed via GitHub:

1. **Add Repository Variable:**
   - Go to: `https://github.com/YOUR_USERNAME/chord/settings/variables/actions`
   - Click "New repository variable"
   - Name: `RateLimiting__AllowLoadTestBypass`
   - Value: `true` (to enable) or `false` (to disable)
   - Save

2. **Next Auto-Deploy Will Apply:**
   - GitHub Actions will automatically pass this variable to the deployment script
   - API containers will start with bypass enabled/disabled based on the variable
   - No manual intervention needed

3. **Run Load Test:**
   ```bash
   # Connect via Docker network (bypasses Cloudflare)
   K6_VU_API_URL=http://chord-api-green:80 docker compose -f docker-compose.load-test.yml run --rm k6-load-test run load-test.js --vus 10 --duration 30s
   ```

**Method 2: Manual (Temporary)**

For one-time testing without waiting for auto-deploy:

1. **Enable Bypass in API Container:**
   ```bash
   # Set environment variable
   export RateLimiting__AllowLoadTestBypass=true
   
   # Restart API container with bypass enabled
   docker compose -f docker-compose.deploy.yml -f docker-compose.yunohost.yml --profile green up -d --force-recreate
   ```

2. **Verify Bypass is Enabled:**
   ```bash
   # Check environment variable
   docker exec chord-api-green printenv | grep RATE
   # Should show: RateLimiting__AllowLoadTestBypass=true
   ```

3. **Run Load Test:**
   ```bash
   # Connect via Docker network (bypasses Cloudflare)
   K6_VU_API_URL=http://chord-api-green:80 docker compose -f docker-compose.load-test.yml run --rm k6-load-test run load-test.js --vus 10 --duration 30s
   ```

**Important Notes:**
- **Method 1 is recommended** - persists across deployments, no manual steps needed
- **Method 2 is temporary** - will be lost after next auto-deploy
- **Security:** Set variable to `false` after testing (Method 1) or restart without variable (Method 2)
- **Default:** Bypass is disabled (`false`) by default for security

**How It Works:**

- K6 tests include `X-Load-Test: true` header in all requests
- API middleware checks this header when `AllowLoadTestBypass=true`
- Rate limiting is bypassed for requests with this header
- All bypassed requests are logged for monitoring

**Security Note:**

- Bypass is **disabled by default** (`AllowLoadTestBypass=false`)
- Only enable for load testing, disable after tests complete
- Bypass only works with `X-Load-Test: true` header (not for regular users)

### Server Control Commands

Use these commands on the production server to monitor and troubleshoot load tests:

**Check API Logs:**
```bash
# View recent API logs
docker logs --tail 50 chord-api-green

# Monitor real-time API logs
docker logs -f chord-api-green

# Check for rate limiting messages
docker logs chord-api-green | grep -i "rate limit"

# Check for load test bypass messages
docker logs chord-api-green | grep -i "bypass"
```

**Check Rate Limiting Configuration:**
```bash
# Check environment variables
docker exec chord-api-green printenv | grep RATE

# Check appsettings.json
docker exec chord-api-green cat appsettings.json | grep -A 3 RateLimiting
```

**Check Network Connectivity:**
```bash
# Verify API container is on chord-network
docker network inspect chord_chord-network | grep -A 10 chord-api-green

# Check container IP address
docker inspect chord-api-green | grep -A 5 "Networks"

# Test connectivity from K6 container (if running)
docker exec chord-k6-load-test curl -v http://chord-api-green:80/health
```

**Check Container Status:**
```bash
# List all chord containers
docker ps | grep chord

# Check API container resource usage
docker stats --no-stream chord-api-green

# Check container health
docker inspect chord-api-green | grep -A 10 "State"
```

**Test API Endpoints:**
```bash
# Health check
curl http://localhost:5003/health

# Test register endpoint (should work with bypass enabled)
curl -X POST http://localhost:5003/api/auth/register \
  -H "Content-Type: application/json" \
  -H "X-Load-Test: true" \
  -d '{"username":"testuser","email":"test@test.com","password":"Test123!"}'
```

---

## Troubleshooting

### Common Issues

#### 1. "Connection refused" or "ECONNREFUSED"

**Problem:** API is not running or not accessible.

**Solution:**

```bash
# Check if API is running
curl http://localhost:5049/health

# Start API if needed (creates test network)
docker compose -f docker-compose.test.yml up -d
```

#### 1a. "lookup host.docker.internal: no such host" (Linux)

**Problem:** `host.docker.internal` doesn't work on Linux (only Docker Desktop).

**Solution:**

K6 is configured to use `chord-test-network` and connect to `api-test:80`. This works on all platforms:

```bash
# Ensure test environment is running (creates network)
docker compose -f docker-compose.test.yml up -d

# K6 will automatically use api-test:80 via test network
docker compose -f docker-compose.load-test.yml run --rm k6-load-test
```

If you need to test against a different API URL, override with environment variable:

```bash
K6_VU_API_URL=http://your-api-url:port docker compose -f docker-compose.load-test.yml run --rm k6-load-test
```

#### 2. High Error Rate (> 1%)

**Problem:** System is overloaded or rate limiting is active.

**Solutions:**

- **For YunoHost:** Enable rate limiting bypass (see [YunoHost Deployment Testing](#yunohost-deployment-testing))
- Check backend rate limiting settings (may need to increase for load testing)
- Verify database connection pool size
- Check API logs for errors
- Reduce load (use smoke test first)

#### 2b. Rate Limiting Errors (429 Too Many Requests)

**Problem:** Rate limiting is blocking load test requests.

**Symptoms:**
- 429 status codes in test results
- "Rate limit exceeded" messages in API logs
- High `http_req_failed` percentage

**Solutions:**

1. **Enable Rate Limiting Bypass via GitHub Variable (Recommended):**
   - Go to: `https://github.com/YOUR_USERNAME/chord/settings/variables/actions`
   - Add variable: `RateLimiting__AllowLoadTestBypass` = `true`
   - Wait for next auto-deploy or trigger manual deploy
   - Variable will be automatically applied to API containers

2. **Enable Rate Limiting Bypass Manually (Temporary):**
   ```bash
   export RateLimiting__AllowLoadTestBypass=true
   docker compose -f docker-compose.deploy.yml -f docker-compose.yunohost.yml --profile green up -d --force-recreate
   ```

3. **Verify Bypass is Working:**
   ```bash
   # Check environment variable
   docker exec chord-api-green printenv | grep RATE
   # Should show: RateLimiting__AllowLoadTestBypass=true
   
   # Check logs for bypass messages
   docker logs chord-api-green | grep -i "bypass"
   # Should see: "Rate limiting bypassed for load test request"
   ```

4. **Verify K6 Headers:**
   - K6 tests automatically include `X-Load-Test: true` header
   - Check test logs to confirm headers are sent
   - Verify API code includes bypass logic (check commit hash matches latest)

5. **Check if New Code is Deployed:**
   ```bash
   # Check container commit hash
   docker inspect chord-api-green | grep -i "revision"
   # Should match latest commit with bypass logic
   ```

#### 2a. High Error Rate on Production URL (90%+ failures)

**Problem:** Testing against production URL (`https://chord.borak.dev`) from external IP triggers Cloudflare/DDoS protection.

**Symptoms:**
- 90%+ request failures
- Register/Login endpoints fail
- Some endpoints work (get me, create guild) but most fail

**Solutions:**

1. **Use Test Environment (Recommended):**
   ```bash
   # Test environment bypasses Cloudflare
   docker compose -f docker-compose.test.yml -f docker-compose.load-test.yml run --rm k6-load-test run load-test.js --vus 10 --duration 30s
   ```

2. **Run from Production Server:**
   ```bash
   # SSH into production server
   # Run K6 against localhost API (bypasses Cloudflare)
   K6_VU_API_URL=http://localhost:5049 k6 run load-test.js --vus 10 --duration 30s
   ```

3. **Temporarily Disable Cloudflare (Not Recommended):**
   - Only for testing, re-enable immediately after
   - Security risk if left disabled

#### 3. Slow Response Times (p95 > 500ms)

**Problem:** System performance degradation under load.

**Solutions:**

- Check database query performance
- Verify Redis connection (SignalR backplane)
- Monitor CPU and memory usage
- Check network latency
- Review API logs for slow queries

#### 4. "Too many open files" (Linux)

**Problem:** System file descriptor limit too low.

**Solution:**

```bash
# Increase file descriptor limit
ulimit -n 65536

# Or permanently in /etc/security/limits.conf
* soft nofile 65536
* hard nofile 65536
```

#### 5. Test Data Accumulation

**Problem:** Test creates many users/guilds in database.

**Solutions:**

- Use test database (isolated from production)
- Clean up test data after runs
- Use database snapshots for consistent state

### Performance Tips

1. **Start Small**: Run smoke test (10 users) before full load test
2. **Monitor Resources**: Watch CPU, memory, database connections during test
3. **Check Logs**: Review API logs for errors or warnings
4. **Database Optimization**: Ensure indexes exist on frequently queried columns
5. **Connection Pooling**: Verify database connection pool is sized appropriately

### Getting Help

If load tests consistently fail:

1. Check API health: `curl http://localhost:5049/health`
2. Review API logs for errors
3. Verify database is accessible and responsive
4. Check Redis connection (for SignalR)
5. Reduce load and test incrementally (100 → 500 → 1K users)

---

## Next Steps

After load testing:

1. **Analyze Results**: Review HTML report for bottlenecks
2. **Optimize**: Address slow endpoints or high error rates
3. **Re-test**: Verify improvements with subsequent load tests
4. **Document**: Record baseline performance metrics
5. **Monitor**: Set up production monitoring to track performance over time

---

**Document Version:** 1.0  
**Last Updated:** 2026
