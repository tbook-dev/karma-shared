import { clsx, type ClassValue } from "clsx"

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits,
  }).format(value)
}

export function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(value)
}

export function formatEntries(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`
  }

  if (value >= 10_000) {
    return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`
  }

  return formatNumber(value)
}

export function truncateAddress(address: string, prefix = 6, suffix = 4) {
  if (address.length <= prefix + suffix) {
    return address
  }

  return `${address.slice(0, prefix)}...${address.slice(-suffix)}`
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

/**
 * Compact relative time for transaction feeds.
 * < 1 min   → "just now"
 * < 1 hour  → "Xm ago"
 * < 24 hour → "Xh ago"
 * < 7 days  → "Xd ago"
 * else      → "Apr 15, 14:32"
 */
export function formatRelativeTime(value: string | number | Date): string {
  const t = value instanceof Date ? value.getTime() : new Date(value).getTime()
  if (!Number.isFinite(t)) return ""
  const diff = Date.now() - t
  if (diff < 60_000) return "just now"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(t))
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

/**
 * Full timestamp in UTC, en-US ("Apr 20, 2026, 14:45:32 UTC").
 * 24-hour clock so audit trails read unambiguously across timezones.
 * Accepts Date | ISO string | epoch ms.
 */
export function formatTimestamp(value: string | number | Date): string {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(d)
}

/**
 * Clock-time only, UTC + en-US ("14:45:32 UTC"). For in-memory log scrolls
 * where the date is implicit from context.
 */
export function formatLogTime(value: string | number | Date = new Date()): string {
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(d)
}

/**
 * Draw-time display, always in UTC and en-US ("Sat, Apr 25, 2:00 PM UTC").
 * Draws happen at 14:00 UTC on Saturdays, so we pin the timezone to UTC —
 * every user sees the same wall-clock time regardless of browser locale.
 */
export function formatDrawTime(value: string): string {
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(d)
  } catch {
    return value
  }
}

export function getNextDrawTime(now = new Date()) {
  const next = new Date(now)
  const utcDay = next.getUTCDay()
  const daysUntilSaturday = (6 - utcDay + 7) % 7 || 7

  next.setUTCDate(next.getUTCDate() + daysUntilSaturday)
  next.setUTCHours(14, 0, 0, 0)

  return next
}

export function getCountdownParts(targetIso: string) {
  const now = Date.now()
  const target = new Date(targetIso).getTime()
  const diff = Math.max(0, target - now)

  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
  }
}
