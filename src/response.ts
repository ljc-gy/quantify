// Unified API response helpers (Cloudflare Workers version)

export function ok(data: any = null, extra: Record<string, any> = {}) {
  return Response.json({ code: 0, data, ts: Date.now(), ...extra });
}

export function fail(message: string = 'Internal error', status: number = 500) {
  return Response.json({ code: -1, error: message, ts: Date.now() }, { status });
}
