/**
 * Server timezone utilities enforcing Indian Standard Time (IST, UTC+05:30)
 * for incoming TermConfig payloads and database synchronization.
 */

/**
 * Parses any date value, ensuring that date strings lacking explicit timezone
 * offsets are parsed strictly as Indian Standard Time (IST, UTC+05:30).
 */
export function parseISTDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // If timezone is already present (Z or +/-offset like +05:30 or -04:00)
  if (trimmed.endsWith('Z') || /[+-]\d{2}(:\d{2})?$/.test(trimmed)) {
    const d = new Date(trimmed);
    return isNaN(d.getTime()) ? null : d;
  }

  // Raw datetime string without timezone (e.g. "2026-09-17T10:00" or "2026-09-17 10:00")
  const normalized = trimmed.replace(' ', 'T');
  const withOffset = normalized.length === 16 ? `${normalized}:00+05:30` : `${normalized}+05:30`;
  const d = new Date(withOffset);
  return isNaN(d.getTime()) ? null : d;
}
