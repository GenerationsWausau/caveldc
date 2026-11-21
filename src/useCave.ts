// One hook that reads the database and derives everything the screens show.
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { AREAS, type AreaId } from './areas'
import { db, getVacations, type Day, type Entry, type Habit } from './db'
import {
  areaScore,
  currentVacation,
  dayStreak,
  groupDone,
  levelInfo,
  pausedBy,
  type LevelInfo,
  type Paused,
  type Vacation,
} from './logic'

export interface CaveState {
  ready: boolean
  habits: Habit[] // active habits, in order
  allHabits: Habit[] // includes retired ones, for history
  entries: Entry[] // everything ever checked off, including on vacation
  creditedEntries: Entry[] // only what earned XP: vacation days left out
  paused: Paused // whether a date fell on a vacation
  vacation?: Vacation // under way or coming up
  days: Map<string, Day> // dealt challenges, by date
  doneByHabit: Map<string, Set<string>>
  totalXp: number
  level: LevelInfo
  streak: number
  scores: Record<AreaId, number | null>
  xpByArea: Record<AreaId, number>
}

export function useCave(today: string): CaveState {
  const allHabits = useLiveQuery(() => db.habits.toArray(), [])
  const entries = useLiveQuery(() => db.entries.toArray(), [])
  const dayRows = useLiveQuery(() => db.days.toArray(), [])
  const vacations = useLiveQuery(getVacations, [])

  return useMemo(() => {
    const hs = allHabits ?? []
    const es = entries ?? []
    const doneByHabit = groupDone(es)
    const days = new Map((dayRows ?? []).map((d) => [d.date, d]))
    const paused = pausedBy(vacations ?? [])
    const credited = es.filter((e) => !paused(e.date))
    const totalXp = credited.reduce((sum, e) => sum + e.xp, 0)
    const scores = {} as Record<AreaId, number | null>
    const xpByArea = {} as Record<AreaId, number>
    for (const a of AREAS) {
      scores[a.id] = areaScore(a.id, hs, doneByHabit, today, days, paused)
      xpByArea[a.id] = 0
    }
    // XP from a removed area still counts toward your level, just not toward any area.
    for (const e of credited) if (e.area in xpByArea) xpByArea[e.area] += e.xp
    return {
      ready: allHabits !== undefined && entries !== undefined && dayRows !== undefined && vacations !== undefined,
      habits: hs.filter((h) => !h.archivedOn).sort((a, b) => a.order - b.order),
      allHabits: hs,
      entries: es,
      creditedEntries: credited,
      paused,
      vacation: currentVacation(vacations ?? [], today),
      days,
      doneByHabit,
      totalXp,
      level: levelInfo(totalXp),
      streak: dayStreak(new Set(credited.map((e) => e.date)), today, paused),
      scores,
      xpByArea,
    }
  }, [allHabits, entries, dayRows, vacations, today])
}
