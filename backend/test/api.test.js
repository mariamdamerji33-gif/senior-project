'use strict';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../app');

describe('HTTP API', () => {
  test('GET / returns service metadata', async () => {
    const res = await request(app).get('/').expect('Content-Type', /json/).expect(200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.service, 'autism-platform-api');
    assert.ok(String(res.body.health || '').includes('/api/health'));
  });

  test('GET /api/health returns structured JSON', async () => {
    const res = await request(app).get('/api/health').expect('Content-Type', /json/).expect(200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.service, 'autism-platform-api');
    assert.ok(['ok', 'error', 'unknown'].includes(res.body.database));
    assert.equal(typeof res.body.serviceRoleKeyConfigured, 'boolean');
    assert.equal(typeof res.body.supabaseUrlConfigured, 'boolean');
    assert.ok(String(res.body.envFileHint || '').includes('.env'));
  });

  test('GET /login redirects to frontend in development', async () => {
    const res = await request(app).get('/login');
    assert.ok([302, 404].includes(res.status), `unexpected status ${res.status}`);
    if (res.status === 302) {
      assert.ok(res.headers.location, 'redirect should include Location');
    }
  });

  test('unknown API path returns 404 JSON', async () => {
    const res = await request(app).get('/api/no-such-route-xyz').expect('Content-Type', /json/).expect(404);
    assert.ok(res.body.error);
    assert.ok(String(res.body.path || '').length > 0);
  });

  test('GET /console returns HTML', async () => {
    const res = await request(app).get('/console').expect('Content-Type', /html/).expect(200);
    assert.ok(String(res.text || '').length > 200);
  });

  test('GET /api/auth/csrf-token returns token', async () => {
    const res = await request(app).get('/api/auth/csrf-token').expect('Content-Type', /json/).expect(200);
    assert.ok(typeof res.body.token === 'string' && res.body.token.length > 0);
  });

  test('POST /api/auth/registration-status rejects invalid email', async () => {
    const res = await request(app)
      .post('/api/auth/registration-status')
      .send({ email: 'not-an-email' })
      .expect('Content-Type', /json/)
      .expect(400);
    assert.ok(res.body.error);
  });

  test('POST /api/auth/registration-status accepts valid email shape', async () => {
    const res = await request(app)
      .post('/api/auth/registration-status')
      .send({ email: 'feature-smoke-check@example.com' })
      .expect('Content-Type', /json/)
      .expect(200);
    assert.ok(typeof res.body.status === 'string');
  });
});
