export const MAX_KEYWORDS = 8;
export const MAX_LABEL_LEN = 32;

/** Slugify a label into a stable keyword id. */
export function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Normalised form for duplicate comparison. */
export function normalizeForCompare(label: string): string {
  return label.trim().toLowerCase();
}

export type ValidateResult =
  | { ok: true }
  | { ok: false; error: 'empty' | 'too-long' | 'duplicate' | 'limit' };

/**
 * Validate a new keyword label against the existing set.
 * Order: empty → too-long → duplicate → limit → ok.
 */
export function validateNewKeyword(
  label: string,
  existing: { label: string }[],
  max: number = MAX_KEYWORDS
): ValidateResult {
  const trimmed = label.trim();
  if (trimmed.length === 0) return { ok: false, error: 'empty' };
  if (trimmed.length > MAX_LABEL_LEN) return { ok: false, error: 'too-long' };

  const norm = normalizeForCompare(trimmed);
  if (existing.some((k) => normalizeForCompare(k.label) === norm)) {
    return { ok: false, error: 'duplicate' };
  }
  if (existing.length >= max) return { ok: false, error: 'limit' };

  return { ok: true };
}
