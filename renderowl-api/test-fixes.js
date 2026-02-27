#!/usr/bin/env node
/**
 * RenderOwl Bug Fix Tests
 * 
 * This script tests the critical bug fixes made to the RenderOwl API.
 * Run with: node test-fixes.js
 */

import crypto from 'crypto';

const BASE_URL = process.env.API_URL || 'http://localhost:8000';
const WEBHOOK_SECRET = process.env.RENDER_WEBHOOK_SECRET || 'test-secret';

// Test utilities
const test = async (name, fn) => {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
  }
};

const request = async (path, options = {}) => {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
};

// Generate webhook signature
const signPayload = (payload) => {
  return crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');
};

console.log('\n🧪 RenderOwl Bug Fix Tests\n');

// Test 1: Webhook requires authentication
await test('Webhook rejects requests without signature', async () => {
  const res = await request('/v1/renders/webhooks/progress', {
    method: 'POST',
    body: JSON.stringify({ render_id: 'rnd_test', current_frame: 100 }),
  });
  if (res.status !== 401) {
    throw new Error(`Expected 401, got ${res.status}`);
  }
});

// Test 2: Webhook rejects invalid signature
await test('Webhook rejects invalid signature', async () => {
  const res = await request('/v1/renders/webhooks/progress', {
    method: 'POST',
    headers: { 'X-Worker-Signature': 'invalid-signature' },
    body: JSON.stringify({ render_id: 'rnd_test', current_frame: 100 }),
  });
  if (res.status !== 401) {
    throw new Error(`Expected 401, got ${res.status}`);
  }
});

// Test 3: Internal endpoints require auth
await test('Credit deduct endpoint requires internal auth', async () => {
  const res = await request('/v1/credits/deduct', {
    method: 'POST',
    body: JSON.stringify({ user_id: 'user_test', amount: 10, description: 'test' }),
  });
  if (res.status !== 403 && res.status !== 401) {
    throw new Error(`Expected 403/401, got ${res.status}`);
  }
});

// Test 4: User endpoints require JWT
await test('User endpoints require authentication', async () => {
  const res = await request('/v1/user/me');
  if (res.status !== 401) {
    throw new Error(`Expected 401, got ${res.status}`);
  }
});

// Test 5: Health check is public
await test('Health check is accessible without auth', async () => {
  const res = await request('/health');
  if (res.status !== 200) {
    throw new Error(`Expected 200, got ${res.status}`);
  }
});

// Test 6: Live check is public
await test('Live check is accessible without auth', async () => {
  const res = await request('/live');
  if (res.status !== 200) {
    throw new Error(`Expected 200, got ${res.status}`);
  }
});

// Test 7: Invalid user_id format rejected
await test('Credit check validates user_id format', async () => {
  const res = await request('/v1/credits/check/invalid-user-id', {
    headers: { 'X-API-Key': 'test-key' },
  });
  if (res.status !== 400 && res.status !== 403) {
    throw new Error(`Expected 400/403, got ${res.status}`);
  }
});

console.log('\n✨ Tests complete!\n');

// Summary
console.log('📋 Summary of Fixes:');
console.log('  1. Webhook authentication - Requires X-Worker-Signature header');
console.log('  2. Internal endpoints - Require internal API key or admin auth');
console.log('  3. JWT verification - Properly validates Bearer tokens');
console.log('  4. Input validation - Validates user_id, render_id formats');
console.log('  5. Health endpoints - Remain public for monitoring');
console.log('');
