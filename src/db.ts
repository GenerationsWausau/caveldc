// Everything is stored on the device in IndexedDB. No account, no server.
import Dexie, { type EntityTable } from 'dexie'
import type { AreaId } from './areas'
import { areasForDay, pickChallenge, REPEAT_GAP_DAYS, type Challenge } from './challenges'
import { addDays, todayKey } from './logic'

export interface Habit {
  id: string
  name: string
  area: AreaId
  days: number[]
  xp: number
  startDate: string
  archivedOn?: string
  order: number
}

/** One line in the XP ledger: something you completed on a given day. */
export interface Entry {
  id: string
  date: string
  kind: 'habit' | 'challenge'
  refId: string
  area: AreaId
  xp: number
  at: number
}

/** The challenges dealt for one date. Stored so they stay put once you've seen them. */
export interface Day {
  date: string
  challenges: Challenge[] // snapshots, so old days survive edits to the library
  swapped: boolean
}

class CaveDB extends Dexie {
  habits!: EntityTable<Habit, 'id'>
  entries!: EntityTable<Entry, 'id'>
  days!: EntityTable<Day, 'date'>

  constructor() {
    super('the-cave')
    this.version(1).stores({
      habits: 'id, area',
      entries: 'id, date, [refId+date]',
    })
    this.version(2).stores({ days: 'date' })
  }
}

export const db = new CaveDB()

const uid = () => crypto.randomUUID()

export type HabitDraft = Pick<Habit, 'name' | 'area' | 'days' | 'xp'>

export async function addHabit(draft: HabitDraft) {
  const count = await db.habits.count()
  await db.habits.add({ ...draft, id: uid(), startDate: todayKey(), order: count })
}

export async function updateHabit(id: string, draft: HabitDraft) {
  await db.habits.update(id, draft)
}

/** Retiring hides a habit from now on but keeps the XP and history it earned. */
export async function retireHabit(id: string) {
  await db.habits.update(id, { archivedOn: todayKey() })
}

/** Marks something done for a date, or un-marks it. Returns whether it is now done. */
async function toggleEntry(
  kind: Entry['kind'],
  ref: { id: string; area: AreaId; xp: number },
  date: string,
): Promise<boolean> {
  return db.transaction('rw', db.entries, async () => {
    const existing = await db.entries.where('[refId+date]').equals([ref.id, date]).first()
    if (existing) {
      await db.entries.delete(existing.id)
      return false
    }
    await db.entries.add({ id: uid(), date, kind, refId: ref.id, area: ref.area, xp: ref.xp, at: Date.now() })
    return true
  })
}

export const toggleHabit = (habit: Habit, date: string) => toggleEntry('habit', habit, date)
export const toggleChallenge = (challenge: Challenge, date: string) =>
  toggleEntry('challenge', challenge, date)

// ---- daily challenges ----

async function recentChallengeIds(date: string): Promise<Set<string>> {
  const recent = await db.days.where('date').between(addDays(date, -REPEAT_GAP_DAYS), date, true, false).toArray()
  return new Set(recent.flatMap((d) => d.challenges.map((ch) => ch.id)))
}

/** Deals the day's challenges the first time the day is opened. Safe to call repeatedly. */
export async function ensureDay(date: string) {
  await db.transaction('rw', db.days, async () => {
    if (await db.days.get(date)) return
    const avoid = await recentChallengeIds(date)
    const challenges = areasForDay(date).map((area) => {
      const pick = pickChallenge(area, avoid)
      avoid.add(pick.id)
      return pick
    })
    await db.days.add({ date, challenges, swapped: false })
  })
}

/** Trades one challenge for another from the same area. One swap per day. */
export async function swapChallenge(date: string, challengeId: string) {
  await db.transaction('rw', db.days, db.entries, async () => {
    const day = await db.days.get(date)
    if (!day || day.swapped) return
    const index = day.challenges.findIndex((ch) => ch.id === challengeId)
    if (index === -1) return
    const done = await db.entries.where('[refId+date]').equals([challengeId, date]).first()
    if (done) return
    const avoid = await recentChallengeIds(date)
    day.challenges.forEach((ch) => avoid.add(ch.id))
    const challenges = [...day.challenges]
    challenges[index] = pickChallenge(day.challenges[index].area, avoid)
    await db.days.put({ ...day, challenges, swapped: true })
  })
}

// ---- backup ----

export interface Backup {
  app: 'the-cave'
  version: 1
  exportedAt: string
  habits: Habit[]
  entries: Entry[]
  days?: Day[] // absent in backups made before daily challenges existed
}

export async function exportBackup(): Promise<Backup> {
  const [habits, entries, days] = await Promise.all([
    db.habits.toArray(),
    db.entries.toArray(),
    db.days.toArray(),
  ])
  return { app: 'the-cave', version: 1, exportedAt: new Date().toISOString(), habits, entries, days }
}

export function parseBackup(text: string): Backup {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error("That file isn't a Cave backup.")
  }
  const b = data as Partial<Backup>
  if (b?.app !== 'the-cave' || !Array.isArray(b.habits) || !Array.isArray(b.entries)) {
    throw new Error("That file isn't a Cave backup.")
  }
  return b as Backup
}

/** Replaces everything on this device with the backup. */
export async function restoreBackup(backup: Backup) {
  await db.transaction('rw', db.habits, db.entries, db.days, async () => {
    await db.habits.clear()
    await db.entries.clear()
    await db.days.clear()
    await db.habits.bulkAdd(backup.habits)
    await db.entries.bulkAdd(backup.entries)
    await db.days.bulkAdd(backup.days ?? [])
  })
}

/** Ask the browser not to clear our data when the phone runs low on space. */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
