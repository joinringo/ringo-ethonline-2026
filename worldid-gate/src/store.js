/**
 * The verified-nullifier store.
 *
 * WHAT THIS IS NOT: the one-credit-per-human fence. That fence is a unique
 * index on `welcome_bonus_verifications.nullifier` in the platform's own
 * database, and it is the only thing that can win a race between two
 * simultaneous claims. This store answers a narrower question: "has this
 * nullifier ever presented a proof that World accepted?"
 *
 * Keeping those two jobs separate matters. If this store were the fence, the
 * gate would be a single point of failure for a payment decision, and an
 * operator restoring it from a backup would silently re-enable claims.
 *
 * `node:sqlite` ships with Node 22, so the service has no runtime
 * dependencies. The PRIMARY KEY on a TEXT column is a real unique index, which
 * is what makes the double-submit path below atomic rather than a read-then-
 * write race.
 */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class NullifierStore {
  constructor(path) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS verified_nullifiers (
        nullifier   TEXT PRIMARY KEY,
        protocol    TEXT NOT NULL,
        action      TEXT,
        verified_at TEXT NOT NULL
      ) STRICT;
    `);
  }

  /**
   * Record a nullifier. Returns true when this was the first time.
   *
   * `ON CONFLICT DO NOTHING` leans on the primary key rather than checking
   * first: two concurrent verifications of the same person cannot both be
   * recorded as new, so a caller counting first-time verifications cannot
   * double-count.
   */
  record(nullifier, protocol, action) {
    const before = this.db
      .prepare('SELECT changes() AS c')  // discarded; kept for clarity of intent
      .get;
    const stmt = this.db.prepare(
      `INSERT INTO verified_nullifiers (nullifier, protocol, action, verified_at)
       VALUES (?, ?, ?, ?) ON CONFLICT(nullifier) DO NOTHING`,
    );
    const res = stmt.run(nullifier, protocol, action ?? null, new Date().toISOString());
    void before;
    return res.changes === 1;
  }

  /** True when this nullifier has presented an accepted proof. */
  has(nullifier) {
    const row = this.db
      .prepare('SELECT 1 AS ok FROM verified_nullifiers WHERE nullifier = ?')
      .get(nullifier);
    return row !== undefined;
  }

  count() {
    return this.db.prepare('SELECT COUNT(*) AS n FROM verified_nullifiers').get().n;
  }

  close() {
    this.db.close();
  }
}
