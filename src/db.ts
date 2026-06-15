// D1 database wrapper — replaces the sql.js initDb.js
// Provides a similar prepare() API to minimize route changes

export interface Env {
  DB: D1Database;
}

export function prepare(db: D1Database, sql: string) {
  return {
    all(...params: any[]) {
      if (params.length === 0) {
        return db.prepare(sql).all();
      }
      return db.prepare(sql).bind(...params).all();
    },
    get(...params: any[]) {
      if (params.length === 0) {
        return db.prepare(sql).first();
      }
      return db.prepare(sql).bind(...params).first();
    },
    async run(...params: any[]) {
      const stmt = params.length === 0 ? db.prepare(sql) : db.prepare(sql).bind(...params);
      await stmt.run();
      // Get last insert rowid
      const lastRow = await db.prepare("SELECT last_insert_rowid() as id").first<{ id: number }>();
      return { lastInsertRowid: lastRow?.id || 0 };
    },
  };
}

export async function run(db: D1Database, sql: string, params: any[] = []) {
  if (params.length === 0) {
    await db.prepare(sql).run();
  } else {
    await db.prepare(sql).bind(...params).run();
  }
}
