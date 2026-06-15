import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ok, fail } from '../utils/response.js';

function mockRes() {
  const res = {
    _status: 200,
    _json: null,
    status(s) { this._status = s; return this; },
    json(data) { this._json = data; return this; },
  };
  return res;
}

describe('response helpers', () => {
  it('ok() returns code 0 with data and timestamp', () => {
    const res = mockRes();
    ok(res, { name: 'test' });
    assert.equal(res._json.code, 0);
    assert.deepEqual(res._json.data, { name: 'test' });
    assert.ok(typeof res._json.ts === 'number');
  });

  it('ok() defaults data to null', () => {
    const res = mockRes();
    ok(res);
    assert.equal(res._json.data, null);
  });

  it('ok() merges extra fields', () => {
    const res = mockRes();
    ok(res, null, { message: 'done' });
    assert.equal(res._json.message, 'done');
  });

  it('fail() returns code -1 with error and status', () => {
    const res = mockRes();
    fail(res, 'Something broke', 400);
    assert.equal(res._status, 400);
    assert.equal(res._json.code, -1);
    assert.equal(res._json.error, 'Something broke');
    assert.ok(typeof res._json.ts === 'number');
  });

  it('fail() defaults to 500 status', () => {
    const res = mockRes();
    fail(res, 'Oops');
    assert.equal(res._status, 500);
  });
});
