/** Helpers for mapping app user ids onto Supabase uuid columns. */

/**
 * A uuid column can't hold a Mongo ObjectId. Until users are migrated,
 * `session.user.id` is still an ObjectId, so user links on the Supabase side
 * must be null (re-linked during the users backfill). Returns the id only if
 * it's already a uuid, else null.
 */
export function toUuidOrNull(id?: string | null): string | null {
  return id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
}
