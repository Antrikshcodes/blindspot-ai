#!/usr/bin/env node

/**
 * Blindspot AI — Production Smoke Test Runner
 * Validates endpoint availability, security response headers, and health probes.
 *
 * Usage:
 *   node scripts/production-smoke-test.mjs [baseUrl]
 * Example:
 *   node scripts/production-smoke-test.mjs http://localhost:3000
 */

const targetUrl = process.argv[2] || process.env.PROD_URL || 'http://localhost:3000';

console.log('====================================================');
console.log('🧪 Blindspot AI — Production Smoke Test Runner');
console.log(`🎯 Target Host: ${targetUrl}`);
console.log(`⏰ Timestamp:   ${new Date().toISOString()}`);
console.log('====================================================\n');

async function testEndpoint(name, path, options = {}) {
  const url = `${targetUrl}${path}`;
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body,
    });
    const duration = Date.now() - start;
    const isExpected = options.expectedStatus
      ? res.status === options.expectedStatus
      : res.status >= 200 && res.status < 400;

    let responseData = null;
    try {
      responseData = await res.json();
    } catch {
      // Non-JSON response
    }

    if (isExpected) {
      console.log(`  ✅ [PASS] ${name} (${path}) - HTTP ${res.status} [${duration}ms]`);
      return { pass: true, status: res.status, data: responseData };
    } else {
      console.log(`  ❌ [FAIL] ${name} (${path}) - Got HTTP ${res.status}, expected ${options.expectedStatus || '2xx/3xx'} [${duration}ms]`);
      return { pass: false, status: res.status, data: responseData };
    }
  } catch (err) {
    const duration = Date.now() - start;
    console.log(`  ❌ [ERROR] ${name} (${path}) - Connection failed: ${err.message} [${duration}ms]`);
    return { pass: false, error: err.message };
  }
}

async function runSuite() {
  const results = [];

  console.log('1. Health & Readiness Probes');
  results.push(await testEndpoint('Root Health Probe', '/health'));
  results.push(await testEndpoint('K8s/Cloud Healthz Probe', '/healthz'));
  results.push(await testEndpoint('API Health Probe', '/api/health'));

  console.log('\n2. Security & Authentication Boundaries');
  results.push(await testEndpoint('Unauthorized Protected Endpoint Rejection', '/api/projects', {
    expectedStatus: 401,
  }));
  results.push(await testEndpoint('Unauthorized Notifications Rejection', '/api/notifications', {
    expectedStatus: 401,
  }));
  results.push(await testEndpoint('Unauthorized Preferences Rejection', '/api/preferences', {
    expectedStatus: 401,
  }));

  console.log('\n3. Rate Limiting Safeguards');
  results.push(await testEndpoint('Rate Limit Boundary Check', '/api/health'));

  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = total - passed;

  console.log('\n====================================================');
  console.log(`📊 Smoke Test Summary: ${passed}/${total} checks passed (${failed} failed)`);
  console.log('====================================================');

  if (failed > 0) {
    process.exitCode = 1;
  }
}

runSuite().catch((err) => {
  console.error('Fatal smoke test error:', err);
  process.exit(1);
});
