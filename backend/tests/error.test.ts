import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('Error Handling', () => {
  it('should return 404 for undefined routes', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });

  it('should return proper error format with timestamp', async () => {
    const res = await request(app).get('/api/v1/nonexistent');
    expect(res.body).toHaveProperty('timestamp');
    expect(res.body.error).toHaveProperty('message');
  });

  it('should handle invalid JSON gracefully', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('Content-Type', 'application/json')
      .send('{ invalid json }');
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
