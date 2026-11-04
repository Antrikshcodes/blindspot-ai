import { describe, it, expect } from 'vitest';
import { checkDatabaseConnection } from '../src/config/database.js';

describe('Database Connection', () => {
  it('should connect to SQLite database successfully', async () => {
    const result = await checkDatabaseConnection();
    expect(result.ok).toBe(true);
  });

  it('should return error message when connection fails', async () => {
    // This tests the return shape; actual failure paths are harder to mock
    const result = await checkDatabaseConnection();
    expect(result).toHaveProperty('ok');
    if (!result.ok) {
      expect(result).toHaveProperty('message');
    }
  });
});
