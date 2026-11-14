// Everything is stored on the device in IndexedDB. No account, no server.
import Dexie, { type EntityTable } from 'dexie'
import type { AreaId } from './areas'
import {
  areasForDay,
  CHALLENGE_BY_ID,
  pickChallenge,
  REPEAT_GAP_DAYS,
  type Challenge,
} from './challenges'
import { addDays, todayKey } from './logic'
import { DEFAULT_REMINDERS, type Reminder } from './reminders'

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

/** One night's journal: three prompts and a free page. */
export interface JournalEntry {
  date: string
  win: string
  miss: string
  tomorrow: string
  notes: string
  updatedAt: number
}

export interface Meal {
  id: string
  date: string
  name: string
  calories?: number
  protein?: number
  at: number
}

/** Per-day nutrition extras that aren't meals. */
export interface FuelDay {
  date: string
  water: number // ounces
}

/** Daily nutrition targets. Any of them can be left unset. */
export interface Targets {
  calories?: number
  protein?: number
  water?: number // ounces
}

interface Setting {
  key: string
  value: unknown
}

class CaveDB extends Dexie {
  habits!: EntityTable<Habit, 'id'>
  entries!: EntityTable<Entry, 'id'>
  days!: EntityTable<Day, 'date'>
  journal!: EntityTable<JournalEntry, 'date'>
  meals!: EntityTable<Meal, 'id'>
  fuel!: EntityTable<FuelDay, 'date'>
  settings!: EntityTable<Setting, 'key'>

  constructor() {
    super('the-cave')
    this.version(1).stores({
      habits: 'id, area',
      entries: 'id, date, [refId+date]',
    })
    this.version(2).stores({ days: 'date' })
    this.version(3).stores({ journal: 'date', meals: 'id, date', fuel: 'date', settings: 'key' })
  }
}

export const db = new CaveDB()

/**
 * Brings data from the original five areas up to date. 'physical' was split into
 * health and fitness: habits filed there become Health (they can be moved by editing),
 * and challenges follow the library. 'financial' was removed: its habits are retired
 * and its challenges dropped from the days they were dealt, but XP already earned
 * there stays in your total. Safe to run any number of times.
 */
export async function migrateLegacyAreas() {
  const legacy = (area: string) => area === 'physical' || area === 'financial'
  await db.transaction('rw', db.habits, db.entries, db.days, async () => {
    await db.habits
      .filter((h) => legacy(h.area))
      .modify((h) => {
        if ((h.area as string) === 'physical') h.area = 'health'
        else if (!h.archivedOn) h.archivedOn = todayKey()
      })
    await db.entries
      .filter((e) => (e.area as string) === 'physical')
      .modify((e) => {
        e.area = (e.kind === 'challenge' && CHALLENGE_BY_ID.get(e.refId)?.area) || 'health'
      })
    await db.days
      .filter((d) => d.challenges.some((ch) => legacy(ch.area)))
      .modify((d) => {
        d.challenges = d.challenges
          .filter((ch) => (ch.area as string) !== 'financial')
          .map((ch) => (legacy(ch.area) ? { ...ch, area: CHALLENGE_BY_ID.get(ch.id)?.area ?? 'health' } : ch))
      })
  })
}

const OZ_PER_GLASS = 8
const WATER_UNIT_KEY = 'waterUnit'

/**
 * Water was first counted in glasses. Converts logged water and the water target to
 * ounces at 8 oz a glass, once, and records that it has been done.
 */
export async function migrateWaterToOunces() {
  await db.transaction('rw', db.fuel, db.settings, async () => {
    if (await db.settings.get(WATER_UNIT_KEY)) return
    await db.fuel.toCollection().modify((f) => {
      f.water *= OZ_PER_GLASS
    })
    const targets = (await db.settings.get(TARGETS_KEY))?.value as Targets | undefined
    if (targets?.water) await db.settings.put({ key: TARGETS_KEY, value: { ...targets, water: targets.water * OZ_PER_GLASS } })
    await db.settings.put({ key: WATER_UNIT_KEY, value: 'oz' })
  })
}

/** Brings data saved by any older version up to date. Safe to run any number of times. */
async function migrate() {
  await migrateLegacyAreas()
  await migrateWaterToOunces()
}

// Runs once each time the database opens, ahead of anything the screens ask for.
db.on('ready', migrate, true)

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

// ---- journal ----

export type JournalDraft = Pick<JournalEntry, 'win' | 'miss' | 'tomorrow' | 'notes'>

/** Saves the night's entry. An entry with nothing written is removed rather than kept blank. */
export async function saveJournal(date: string, draft: JournalDraft) {
  const empty = !Object.values(draft).some((text) => text.trim())
  if (empty) await db.journal.delete(date)
  else await db.journal.put({ date, ...draft, updatedAt: Date.now() })
}

// ---- nutrition ----

export type MealDraft = Pick<Meal, 'name' | 'calories' | 'protein'>

export async function addMeal(date: string, draft: MealDraft) {
  await db.meals.add({ ...draft, id: uid(), date, at: Date.now() })
}

export async function updateMeal(id: string, draft: MealDraft) {
  // put, not update: clearing calories or protein has to actually remove the old number.
  const meal = await db.meals.get(id)
  if (meal) await db.meals.put({ id, date: meal.date, at: meal.at, ...draft })
}

export async function deleteMeal(id: string) {
  await db.meals.delete(id)
}

/** Adds or removes ounces. Reads and writes in one step so quick taps all count. */
export async function addWater(date: string, delta: number) {
  await db.transaction('rw', db.fuel, async () => {
    const current = (await db.fuel.get(date))?.water ?? 0
    await db.fuel.put({ date, water: Math.max(0, current + delta) })
  })
}

const TARGETS_KEY = 'targets'

export async function getTargets(): Promise<Targets> {
  return ((await db.settings.get(TARGETS_KEY))?.value as Targets | undefined) ?? {}
}

export async function saveTargets(targets: Targets) {
  await db.settings.put({ key: TARGETS_KEY, value: targets })
}

const REMINDERS_KEY = 'reminders'

export async function getReminders(): Promise<Reminder[]> {
  return ((await db.settings.get(REMINDERS_KEY))?.value as Reminder[] | undefined) ?? DEFAULT_REMINDERS
}

export async function saveReminders(reminders: Reminder[]) {
  await db.settings.put({ key: REMINDERS_KEY, value: reminders })
}

// ---- backup ----

export interface Backup {
  app: 'the-cave'
  version: 1
  exportedAt: string
  habits: Habit[]
  entries: Entry[]
  // Everything below is absent in backups made before that feature existed.
  days?: Day[]
  journal?: JournalEntry[]
  meals?: Meal[]
  fuel?: FuelDay[]
  settings?: Setting[]
}

export async function exportBackup(): Promise<Backup> {
  const [habits, entries, days, journal, meals, fuel, settings] = await Promise.all([
    db.habits.toArray(),
    db.entries.toArray(),
    db.days.toArray(),
    db.journal.toArray(),
    db.meals.toArray(),
    db.fuel.toArray(),
    db.settings.toArray(),
  ])
  return {
    app: 'the-cave',
    version: 1,
    exportedAt: new Date().toISOString(),
    habits,
    entries,
    days,
    journal,
    meals,
    fuel,
    settings,
  }
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
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    await db.habits.bulkAdd(backup.habits)
    await db.entries.bulkAdd(backup.entries)
    await db.days.bulkAdd(backup.days ?? [])
    await db.journal.bulkAdd(backup.journal ?? [])
    await db.meals.bulkAdd(backup.meals ?? [])
    await db.fuel.bulkAdd(backup.fuel ?? [])
    await db.settings.bulkAdd(backup.settings ?? [])
  })
  await migrate()
}

/** Ask the browser not to clear our data when the phone runs low on space. */
export async function requestPersistence(): Promise<boolean> {
  if (!navigator.storage?.persist) return false
  if (await navigator.storage.persisted()) return true
  return navigator.storage.persist()
}
