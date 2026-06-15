/**
 * Unified API response helpers.
 */

export function ok(res, data = null, extra = {}) {
  return res.json({ code: 0, data, ts: Date.now(), ...extra });
}

export function fail(res, message = 'Internal error', status = 500) {
  return res.status(status).json({ code: -1, error: message, ts: Date.now() });
}
