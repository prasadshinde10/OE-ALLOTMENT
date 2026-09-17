/**
 * Timezone utilities enforcing Indian Standard Time (IST, UTC+05:30)
 * strictly across date-time pickers, display formatting, and API payloads.
 */

const IST_TIMEZONE = 'Asia/Kolkata'

/**
 * Formats a Date object or ISO string into a local "YYYY-MM-DDTHH:mm" string
 * strictly in Indian Standard Time (IST, UTC+05:30) for <input type="datetime-local" />.
 */
export function formatToISTDateTimeInput(dateInput?: Date | string | null): string {
  if (!dateInput) return ''
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return ''

  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(date)
  const partMap: Record<string, string> = {}
  for (const part of parts) {
    partMap[part.type] = part.value
  }

  let hour = partMap['hour'] || '00'
  if (hour === '24') hour = '00'

  return `${partMap['year']}-${partMap['month']}-${partMap['day']}T${hour}:${partMap['minute']}`
}

/**
 * Parses a "YYYY-MM-DDTHH:mm" datetime-local input string, interpreting it
 * explicitly as Indian Standard Time (IST, UTC+05:30), and returns an ISO UTC string.
 */
export function parseISTInputToISO(istDateTimeString?: string | null): string | null {
  if (!istDateTimeString || typeof istDateTimeString !== 'string') return null
  const trimmed = istDateTimeString.trim()
  if (!trimmed) return null

  // If already contains timezone offset (+ or Z), parse directly
  if (trimmed.endsWith('Z') || /[+-]\d{2}(:\d{2})?$/.test(trimmed)) {
    const d = new Date(trimmed)
    return isNaN(d.getTime()) ? null : d.toISOString()
  }

  // Format: YYYY-MM-DDTHH:mm -> append IST offset (+05:30)
  const normalized = trimmed.replace(' ', 'T')
  const withOffset = normalized.length === 16 ? `${normalized}:00+05:30` : `${normalized}+05:30`
  const d = new Date(withOffset)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

/**
 * Formats a Date or ISO string into a human-readable display string
 * strictly in Indian Standard Time (IST, UTC+05:30) with explicit 'IST' label.
 */
export function formatToISTDisplay(
  dateInput?: Date | string | null,
  includeSeconds: boolean = false
): string {
  if (!dateInput) return 'N/A'
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
  if (isNaN(date.getTime())) return 'Invalid Date'

  const options: Intl.DateTimeFormatOptions = {
    timeZone: IST_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }

  if (includeSeconds) {
    options.second = '2-digit'
  }

  return `${date.toLocaleString('en-IN', options)} IST`
}

/**
 * Gets the current time formatted as "YYYY-MM-DDTHH:mm" in IST.
 */
export function getNowInISTInput(): string {
  return formatToISTDateTimeInput(new Date())
}

/**
 * Gets a future time (days from now) formatted as "YYYY-MM-DDTHH:mm" in IST.
 */
export function getFutureInISTInput(days: number): string {
  return formatToISTDateTimeInput(new Date(Date.now() + days * 24 * 60 * 60 * 1000))
}
