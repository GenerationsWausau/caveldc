// Pure rules of the game: dates, streaks, levels and area scores.
// No storage or UI in here so every rule can be tested on its own.
import type { AreaId } from './areas'

export interface HabitLike {
  id: string
  area: AreaId
  days: number[] // weekdays the habit is scheduled, 0 = Sunday
  startDate: string
  archivedOn?: string
}

export interface EntryLike {
  date: string
  refId: string
  area: AreaId
  xp: number
}

// ---- dates (local time, stored as YYYY-MM-DD so they sort as text) ----

export function dateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function parseKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(key: string, n: number): string {
  const d = parseKey(key)
  d.setDate(d.getDate() + n)
  return dateKey(d)
}

export function todayKey(): string {
  return dateKey(new Date())
}

// ---- schedule ----

export function isScheduled(h: HabitLike, key: string): boolean {
  if (key < h.startDate) return false
  if (h.archivedOn && key >= h.archivedOn) return false
  return h.days.includes(parseKey(key).getDay())
}

// ---- streaks ----

/** Consecutive scheduled days completed. Today not being done yet doesn't break it. */
export function habitStreak(h: HabitLike, done: Set<string>, today: string): number {
  let streak = 0
  let key = today
  if (isScheduled(h, key) && !done.has(key)) key = addDays(key, -1)
  while (key >= h.startDate) {
    if (isScheduled(h, key)) {
      if (!done.has(key)) break
      streak++
    }
    key = addDays(key, -1)
  }
  return streak
}

/** Consecutive days with at least one thing completed. */
export function dayStreak(activeDays: Set<string>, today: string): number {
  let key = activeDays.has(today) ? today : addDays(today, -1)
  let streak = 0
  while (activeDays.has(key)) {
    streak++
    key = addDays(key, -1)
  }
  return streak
}

// ---- levels ----

/** XP needed to go from this level to the next. Each level costs 50 more than the last. */
export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 50
}

export interface LevelInfo {
  level: number
  into: number // XP earned inside the current level
  needed: number // XP the current level takes in total
  rank: string
}

const RANKS: [number, string][] = [
  [1, 'Outcast'],
  [3, 'Seeker'],
  [6, 'Torchbearer'],
  [10, 'Journeyman'],
  [15, 'Ironside'],
  [20, 'Warrior'],
  [30, 'Captain'],
  [40, 'Mighty One'],
]

export function rankFor(level: number): string {
  let rank = RANKS[0][1]
  for (const [min, name] of RANKS) if (level >= min) rank = name
  return rank
}

export function levelInfo(totalXp: number): LevelInfo {
  let level = 1
  let left = Math.max(0, totalXp)
  while (left >= xpForLevel(level)) {
    left -= xpForLevel(level)
    level++
  }
  return { level, into: left, needed: xpForLevel(level), rank: rankFor(level) }
}

// ---- area scores ----

export const SCORE_WINDOW_DAYS = 30

/**
 * 0-100: how much of what you committed to in this area you actually did
 * over the last 30 days. Slack off and it drops. Null when nothing was scheduled.
 * Today only counts once it's done, so the score doesn't sag every morning.
 */
export function areaScore(
  area: AreaId,
  habits: HabitLike[],
  doneByHabit: Map<string, Set<string>>,
  today: string,
): number | null {
  let scheduled = 0
  let done = 0
  for (const h of habits) {
    if (h.area !== area) continue
    const set = doneByHabit.get(h.id)
    for (let i = 0; i < SCORE_WINDOW_DAYS; i++) {
      const key = addDays(today, -i)
      if (!isScheduled(h, key)) continue
      const isDone = set?.has(key) ?? false
      if (i === 0 && !isDone) continue
      scheduled++
      if (isDone) done++
    }
  }
  return scheduled === 0 ? null : Math.round((done / scheduled) * 100)
}

/** Share of the day's scheduled habits that got done, 0-1. Null when nothing was scheduled. */
export function dayCompletion(
  habits: HabitLike[],
  doneByHabit: Map<string, Set<string>>,
  key: string,
): number | null {
  let scheduled = 0
  let done = 0
  for (const h of habits) {
    if (!isScheduled(h, key)) continue
    scheduled++
    if (doneByHabit.get(h.id)?.has(key)) done++
  }
  return scheduled === 0 ? null : done / scheduled
}

export function groupDone(entries: EntryLike[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const e of entries) {
    let set = map.get(e.refId)
    if (!set) map.set(e.refId, (set = new Set()))
    set.add(e.date)
  }
  return map
}
