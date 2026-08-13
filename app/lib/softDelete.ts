/**
 * SOFT-DELETE HELPERS
 * ===================
 * Deliberately separate from `db.ts`: this module holds no Prisma client, so
 * importing it never pulls the database in. Tests that mock `db.ts` (there are
 * dozens) would otherwise have to re-export this constant from every mock, and
 * forgetting one turns into a module-resolution crash rather than a clear
 * failure.
 */

/**
 * Opts a single query out of the soft-delete filter injected by the
 * tenant-guard extension, matching rows in any deletion state.
 *
 * Usage: `db.user.findFirst({ where: { email, ...INCLUDE_DELETED } })`
 *
 * Expressed as a real Prisma filter (`deletedAt IS NULL OR IS NOT NULL`)
 * rather than a custom marker key, for two reasons: Prisma's generated
 * `WhereInput` types reject unknown keys, and `exactOptionalPropertyTypes`
 * rejects a bare `deletedAt: undefined`. Spreading this puts a `deletedAt`
 * constraint inside a top-level `OR`, which is exactly what the guard looks
 * for when deciding whether the caller has taken control of the filter.
 *
 * Use it only where a deleted row still matters:
 *   - uniqueness checks against `@unique` columns, which Postgres enforces
 *     regardless of deletion (`users.email`, `companies.name`/`domain`);
 *   - the admin console's delete/restore lookups.
 *
 * Not `as const`: Prisma's generated `OR` is a mutable array type, so a
 * readonly tuple is rejected.
 */
export const INCLUDE_DELETED: {
  OR: ({ deletedAt: null } | { deletedAt: { not: null } })[];
} = {
  OR: [{ deletedAt: null }, { deletedAt: { not: null } }],
};
