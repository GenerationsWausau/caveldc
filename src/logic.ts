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

/** The challenges dealt on one date. */
export interface DayLike {
  date: string
  challenges: { id: string; area: AreaId }[]
}

const NO_DAYS: ReadonlyMap<string, DayLike> = new Map()

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

/** Ids of everything asked of you on a date: scheduled habits plus that day's challenges. */
function commitments(
  habits: HabitLike[],
  days: ReadonlyMap<string, DayLike>,
  key: string,
  area?: AreaId,
): string[] {
  const ids: string[] = []
  for (const h of habits) {
    if ((!area || h.area === area) && isScheduled(h, key)) ids.push(h.id)
  }
  for (const ch of days.get(key)?.challenges ?? []) {
    if (!area || ch.area === area) ids.push(ch.id)
  }
  return ids
}

/**
 * 0-100: how much of what was asked of you in this area you actually did over the
 * last 30 days, habits and challenges alike. Slack off and it drops. Null when
 * nothing was asked. Today only counts once it's done, so the score doesn't sag
 * every morning.
 */
export function areaScore(
  area: AreaId,
  habits: HabitLike[],
  doneById: Map<string, Set<string>>,
  today: string,
  days: ReadonlyMap<string, DayLike> = NO_DAYS,
): number | null {
  let asked = 0
  let done = 0
  for (let i = 0; i < SCORE_WINDOW_DAYS; i++) {
    const key = addDays(today, -i)
    for (const id of commitments(habits, days, key, area)) {
      const isDone = doneById.get(id)?.has(key) ?? false
      if (i === 0 && !isDone) continue
      asked++
      if (isDone) done++
    }
  }
  return asked === 0 ? null : Math.round((done / asked) * 100)
}

/** Share of the day's habits and challenges that got done, 0-1. Null when nothing was asked. */
export function dayCompletion(
  habits: HabitLike[],
  doneById: Map<string, Set<string>>,
  key: string,
  days: ReadonlyMap<string, DayLike> = NO_DAYS,
): number | null {
  const ids = commitments(habits, days, key)
  if (ids.length === 0) return null
  return ids.filter((id) => doneById.get(id)?.has(key)).length / ids.length
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
