// One hook that reads the database and derives everything the screens show.
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { AREAS, type AreaId } from './areas'
import { db, type Day, type Entry, type Habit } from './db'
import { areaScore, dayStreak, groupDone, levelInfo, type LevelInfo } from './logic'

export interface CaveState {
  ready: boolean
  habits: Habit[] // active habits, in order
  allHabits: Habit[] // includes retired ones, for history
  entries: Entry[]
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

  return useMemo(() => {
    const hs = allHabits ?? []
    const es = entries ?? []
    const doneByHabit = groupDone(es)
    const days = new Map((dayRows ?? []).map((d) => [d.date, d]))
    const totalXp = es.reduce((sum, e) => sum + e.xp, 0)
    const scores = {} as Record<AreaId, number | null>
    const xpByArea = {} as Record<AreaId, number>
    for (const a of AREAS) {
      scores[a.id] = areaScore(a.id, hs, doneByHabit, today, days)
      xpByArea[a.id] = 0
    }
    // XP from a removed area still counts toward your level, just not toward any area.
    for (const e of es) if (e.area in xpByArea) xpByArea[e.area] += e.xp
    return {
      ready: allHabits !== undefined && entries !== undefined && dayRows !== undefined,
      habits: hs.filter((h) => !h.archivedOn).sort((a, b) => a.order - b.order),
      allHabits: hs,
      entries: es,
      days,
      doneByHabit,
      totalXp,
      level: levelInfo(totalXp),
      streak: dayStreak(new Set(es.map((e) => e.date)), today),
      scores,
      xpByArea,
    }
  }, [allHabits, entries, dayRows, today])
}
