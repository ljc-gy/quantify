import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initDb, prepare, run } from '../utils/initDb.js';

describe('database write helpers', () => {
  beforeEach(async () => {
    await initDb();
  });

  it('run only executes the requested statement and persists once', () => {
    run("INSERT INTO system_config (key, value, description) VALUES ('test_write_helper', '1', 'test') ON CONFLICT(key) DO UPDATE SET value='1'");

    const row = prepare('SELECT value FROM system_config WHERE key = ?').get('test_write_helper');
    assert.equal(row.value, '1');
  });
});
