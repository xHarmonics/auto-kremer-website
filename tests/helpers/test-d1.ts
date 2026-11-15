import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function normalizeParam(param: unknown): SQLInputValue {
  if (param === undefined || param === null) return null;
  if (typeof param === 'boolean') return param ? 1 : 0;
  if (
    typeof param === 'number' ||
    typeof param === 'bigint' ||
    typeof param === 'string' ||
    param instanceof Uint8Array
  ) {
    return param;
  }
  return String(param);
}

class SqliteD1PreparedStatement {
  private readonly db: DatabaseSync;
  private readonly sqlText: string;
  private readonly boundParams: SQLInputValue[];

  constructor(db: DatabaseSync, sqlText: string, boundParams: SQLInputValue[] = []) {
    this.db = db;
    this.sqlText = sqlText;
    this.boundParams = boundParams;
  }

  bind(...values: unknown[]): SqliteD1PreparedStatement {
    return new SqliteD1PreparedStatement(
      this.db,
      this.sqlText,
      values.map(normalizeParam)
    );
  }

  async first<T = Record<string, unknown>>(colName?: string): Promise<T | null> {
    const stmt = this.db.prepare(this.sqlText);
    const row = stmt.get(...this.boundParams) as Record<string, unknown> | undefined;
    if (!row) return null;
    if (colName) return (row[colName] as T) ?? null;
    return row as unknown as T;
  }

  async run<T = Record<string, unknown>>() {
    const trimmed = this.sqlText.trim().toUpperCase();
    const stmt = this.db.prepare(this.sqlText);
    if (trimmed.includes('RETURNING ')) {
      const results = stmt.all(...this.boundParams) as unknown as T[];
      return {
        results,
        success: true as const,
        meta: {
          duration: 0,
          size_after: 0,
          rows_read: results.length,
          rows_written: results.length,
          last_row_id: 0,
          changed_db: results.length > 0,
          changes: results.length,
        },
      };
    }
    const info = stmt.run(...this.boundParams);
    return {
      results: [] as T[],
      success: true as const,
      meta: {
        duration: 0,
        size_after: 0,
        rows_read: 0,
        rows_written: Number(info.changes),
        last_row_id: Number(info.lastInsertRowid),
        changed_db: Number(info.changes) > 0,
        changes: Number(info.changes),
      },
    };
  }

  async all<T = Record<string, unknown>>() {
    const stmt = this.db.prepare(this.sqlText);
    const results = stmt.all(...this.boundParams) as unknown as T[];
    return {
      results,
      success: true as const,
      meta: {
        duration: 0,
        size_after: 0,
        rows_read: results.length,
        rows_written: 0,
        last_row_id: 0,
        changed_db: false,
        changes: 0,
      },
    };
  }

  async raw<T = unknown[]>(options?: { columnNames?: boolean }): Promise<T[]> {
    const stmt = this.db.prepare(this.sqlText);
    const rows = stmt.all(...this.boundParams) as Array<Record<string, unknown>>;
    if (options?.columnNames) {
      const cols = rows[0] ? Object.keys(rows[0]) : [];
      return [cols, ...rows.map((r) => Object.values(r))] as unknown as T[];
    }
    return rows.map((r) => Object.values(r)) as unknown as T[];
  }
}

export function createTestD1(options: { seed?: boolean } = { seed: true }): D1Database {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON;');

  const migrationsDir = resolve(import.meta.dirname, '../../drizzle/migrations');
  if (existsSync(migrationsDir)) {
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const file of files) {
      const rawSql = readFileSync(resolve(migrationsDir, file), 'utf8');
      const statements = rawSql.split('--> statement-breakpoint');
      for (const s of statements) {
        if (s.trim()) sqlite.exec(s);
      }
    }
  }

  if (options.seed !== false) {
    const seedPath = resolve(import.meta.dirname, '../../drizzle/seed.sql');
    if (existsSync(seedPath)) {
      sqlite.exec(readFileSync(seedPath, 'utf8'));
    }
  }

  const d1Like = {
    prepare(query: string) {
      return new SqliteD1PreparedStatement(sqlite, query);
    },
    async batch(statements: SqliteD1PreparedStatement[]) {
      const out = [];
      sqlite.exec('BEGIN');
      try {
        for (const stmt of statements) {
          out.push(await stmt.all());
        }
        sqlite.exec('COMMIT');
        return out;
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    },
    async exec(query: string) {
      sqlite.exec(query);
      return { count: 1, duration: 0 };
    },
    async dump() {
      return new ArrayBuffer(0);
    },
    withSession() {
      return this;
    },
  };

  return d1Like as unknown as D1Database;
}
