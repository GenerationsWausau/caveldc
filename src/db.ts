// Everything is stored on the device in IndexedDB. No account, no server.
import Dexie, { type EntityTable } from 'dexie'
import type { AreaId } from './areas'
import { todayKey } from './logic'

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

class CaveDB extends Dexie {
  habits!: EntityTable<Habit, 'id'>
  entries!: EntityTable<Entry, 'id'>

  constructor() {
    super('the-cave')
    this.version(1).stores({
      habits: 'id, area',
      entries: 'id, date, [refId+date]',
    })
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

export async function toggleHabit(habit: Habit, date: string): Promise<boolean> {
  return db.transaction('rw', db.entries, async () => {
    const existing = await db.entries.where('[refId+date]').equals([habit.id, date]).first()
    if (existing) {
      await db.entries.delete(existing.id)
      return false
    }
    await db.entries.add({
      id: uid(),
      date,
      kind: 'habit',
      refId: habit.id,
      area: habit.area,
      xp: habit.xp,
      at: Date.now(),
    })
    return true
  })
}

// ---- backup ----

export interface Backup {
  app: 'the-cave'
  version: 1
  exportedAt: string
  habits: Habit[]
  entries: Entry[]
}

export async function exportBackup(): Promise<Backup> {
  const [habits, entries] = await Promise.all([db.habits.toArray(), db.entries.toArray()])
  return { app: 'the-cave', version: 1, exportedAt: new Date().toISOString(), habits, entries }
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
  await db.transaction('rw', db.habits, db.entries, async () => {
    await db.habits.clear()
    await db.entries.clear()
    await db.habits.bulkAdd(backup.habits)
    await db.entries.bulkAdd(backup.entries)
  })
}

/** Ask the browser not to clear our data when the phone runs low on space. */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
