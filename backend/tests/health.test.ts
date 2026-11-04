import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('GET /api/v1/health', () => {
  it('should return 200 with healthy status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('healthy');
  });

  it('should include uptime and memory information', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.body.data).toHaveProperty('uptime');
    expect(res.body.data).toHaveProperty('memory');
    expect(res.body.data.memory).toHaveProperty('rss');
    expect(res.body.data.memory).toHaveProperty('heapUsed');
  });
});
