import { describe, it, expect } from 'vitest';
import { checkDatabaseConnection } from '../src/config/database.js';

describe('Database Connection', () => {
  it('should connect to SQLite database successfully', async () => {
    const result = await checkDatabaseConnection();
    expect(result.ok).toBe(true);
  });
});
