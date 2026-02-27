#!/usr/bin/env node
/**
 * Load Testing Utility for RenderOwl API
 * 
 * Usage:
 *   node scripts/load-test.js [options]
 * 
 * Options:
 *   --url URL           Target URL (default: http://localhost:8000)
 *   --duration N        Test duration in seconds (default: 30)
 *   --concurrency N     Number of concurrent requests (default: 10)
 *   --rps N             Target requests per second (default: unlimited)
 *   --endpoint PATH     Specific endpoint to test (default: /health)
 *   --method METHOD     HTTP method (default: GET)
 *   --data JSON         Request body data
 *   --auth TOKEN        Authorization token
 * 
 * Examples:
 *   # Health check load test
 *   node scripts/load-test.js --endpoint /health --duration 60 --concurrency 50
 * 
 *   # API endpoint test with auth
 *   node scripts/load-test.js --endpoint /v1/projects --auth "Bearer TOKEN" --concurrency 20
 * 
 *   # POST endpoint test
 *   node scripts/load-test.js --endpoint /v1/renders --method POST --data '{"template_id":"test"}' --auth "Bearer TOKEN"
 */

// Simple load tester without external dependencies
const http = await import('http');
const https = await import('https');
const { URL } = await import('url');

// Parse arguments
const args = process.argv.slice(2);
const options = {
  url: args.find((_, i) => args[i - 1] === '--url') || 'http://localhost:8000',
  duration: parseInt(args.find((_, i) => args[i - 1] === '--duration') || '30'),
  concurrency: parseInt(args.find((_, i) => args[i - 1] === '--concurrency') || '10'),
  rps: parseInt(args.find((_, i) => args[i - 1] === '--rps') || '0') || null,
  endpoint: args.find((_, i) => args[i - 1] === '--endpoint') || '/health',
  method: (args.find((_, i) => args[i - 1] === '--method') || 'GET').toUpperCase(),
  data: args.find((_, i) => args[i - 1] === '--data') || null,
  auth: args.find((_, i) => args[i - 1] === '--auth') || null,
};

// Statistics
const stats = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  statusCodes: {},
  errors: [],
  startTime: null,
  endTime: null,
};

function makeRequest() {
  return new Promise((resolve) => {
    const url = new URL(options.endpoint, options.url);
    const startTime = Date.now();
    
    const client = url.protocol === 'https:' ? https : http;
    
    const reqOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: options.method,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'RenderOwl-LoadTest/1.0',
      },
    };

    if (options.auth) {
      reqOptions.headers['Authorization'] = options.auth;
    }

    if (options.data) {
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(options.data);
    }

    const req = client.request(reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        
        stats.totalRequests++;
        stats.responseTimes.push(responseTime);
        
        const statusKey = res.statusCode.toString();
        stats.statusCodes[statusKey] = (stats.statusCodes[statusKey] || 0) + 1;
        
        if (res.statusCode >= 200 && res.statusCode < 400) {
          stats.successfulRequests++;
        } else {
          stats.failedRequests++;
        }
        
        resolve({ success: res.statusCode < 400, responseTime });
      });
    });

    req.on('error', (error) => {
      stats.totalRequests++;
      stats.failedRequests++;
      stats.errors.push(error.message);
      resolve({ success: false, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      stats.totalRequests++;
      stats.failedRequests++;
      stats.errors.push('Timeout');
      resolve({ success: false, error: 'Timeout' });
    });

    req.setTimeout(30000);

    if (options.data) {
      req.write(options.data);
    }

    req.end();
  });
}

async function runLoadTest() {
  console.log('\n🚀 RenderOwl Load Test\n');
  console.log('Configuration:');
  console.log(`  URL: ${options.url}${options.endpoint}`);
  console.log(`  Method: ${options.method}`);
  console.log(`  Duration: ${options.duration}s`);
  console.log(`  Concurrency: ${options.concurrency}`);
  console.log(`  Target RPS: ${options.rps || 'unlimited'}`);
  console.log();

  stats.startTime = Date.now();
  
  const endTime = stats.startTime + (options.duration * 1000);
  let requestInterval = null;
  
  // RPS throttling
  if (options.rps) {
    const intervalMs = 1000 / (options.rps / options.concurrency);
    requestInterval = setInterval(() => {
      if (Date.now() >= endTime) return;
      makeRequest().catch(() => {});
    }, intervalMs);
  }

  // Run concurrent workers
  const workers = [];
  for (let i = 0; i < options.concurrency; i++) {
    workers.push(
      (async () => {
        while (Date.now() < endTime) {
          if (!options.rps) {
            await makeRequest();
          } else {
            await new Promise(r => setTimeout(r, 10));
          }
        }
      })()
    );
  }

  // Progress indicator
  const progressInterval = setInterval(() => {
    const elapsed = ((Date.now() - stats.startTime) / 1000).toFixed(1);
    const progress = Math.min(100, ((Date.now() - stats.startTime) / (options.duration * 1000)) * 100).toFixed(1);
    process.stdout.write(`\r  Progress: ${progress}% | Requests: ${stats.totalRequests} | Elapsed: ${elapsed}s`);
  }, 1000);

  await Promise.all(workers);
  
  clearInterval(progressInterval);
  if (requestInterval) clearInterval(requestInterval);
  
  stats.endTime = Date.now();
  
  // Print results
  printResults();
}

function printResults() {
  console.log('\n\n📊 Results\n');
  
  const duration = (stats.endTime - stats.startTime) / 1000;
  const responseTimes = stats.responseTimes.sort((a, b) => a - b);
  
  console.log('Requests:');
  console.log(`  Total: ${stats.totalRequests.toLocaleString()}`);
  console.log(`  Successful: ${stats.successfulRequests.toLocaleString()}`);
  console.log(`  Failed: ${stats.failedRequests.toLocaleString()}`);
  console.log(`  Success rate: ${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(2)}%`);
  console.log(`  Throughput: ${(stats.totalRequests / duration).toFixed(2)} req/s`);
  console.log();
  
  if (responseTimes.length > 0) {
    const avg = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const min = responseTimes[0];
    const max = responseTimes[responseTimes.length - 1];
    const p50 = responseTimes[Math.floor(responseTimes.length * 0.5)];
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)];
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)];
    
    console.log('Response Times:');
    console.log(`  Min: ${min}ms`);
    console.log(`  Avg: ${avg.toFixed(2)}ms`);
    console.log(`  Max: ${max}ms`);
    console.log(`  P50: ${p50}ms`);
    console.log(`  P95: ${p95}ms`);
    console.log(`  P99: ${p99}ms`);
    console.log();
  }
  
  if (Object.keys(stats.statusCodes).length > 0) {
    console.log('Status Codes:');
    for (const [code, count] of Object.entries(stats.statusCodes).sort()) {
      console.log(`  ${code}: ${count}`);
    }
    console.log();
  }
  
  if (stats.errors.length > 0) {
    const errorCounts = {};
    for (const error of stats.errors) {
      errorCounts[error] = (errorCounts[error] || 0) + 1;
    }
    
    console.log('Errors:');
    for (const [error, count] of Object.entries(errorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)) {
      console.log(`  ${error}: ${count}`);
    }
    console.log();
  }
  
  // Performance rating
  const successRate = stats.successfulRequests / stats.totalRequests;
  const avgResponse = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  
  console.log('Performance Rating:');
  if (successRate > 0.99 && avgResponse < 100) {
    console.log('  🟢 Excellent');
  } else if (successRate > 0.95 && avgResponse < 500) {
    console.log('  🟢 Good');
  } else if (successRate > 0.90 && avgResponse < 1000) {
    console.log('  🟡 Acceptable');
  } else {
    console.log('  🔴 Needs Improvement');
  }
  console.log();
}

// Run the test
runLoadTest().catch(console.error);
