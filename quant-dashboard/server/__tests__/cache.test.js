import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { getCache, setCache, invalidateCache } from '../utils/cache.js';

// Cache module uses a module-level Map; clear it between tests.
const origKeys = Symbol('origKeys');
const store = Symbol.for('cache:store');

describe('cache', () => {
  beforeEach(() => {
    // Invalidate everything so tests don't leak
    invalidateCache('');
  });

  it('getCache returns null for missing key', () => {
    assert.equal(getCache('nonexistent'), null);
  });

  it('setCache + getCache returns stored data', () => {
    setCache('test', { value: 42 });
    assert.deepEqual(getCache('test'), { value: 42 });
  });

  it('getCache returns null after TTL expires', async () => {
    setCache('ephemeral', 'data', 1); // 1ms TTL
    await new Promise((r) => setTimeout(r, 5));
    assert.equal(getCache('ephemeral'), null);
  });

  it('invalidateCache removes matching keys', () => {
    setCache('alpha:1', 'a');
    setCache('beta:2', 'b');
    setCache('alpha:3', 'c');

    invalidateCache('alpha');
    assert.equal(getCache('alpha:1'), null);
    assert.equal(getCache('alpha:3'), null);
    assert.equal(getCache('beta:2'), 'b');
  });
});
