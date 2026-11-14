// One hook that reads the database and derives everything the screens show.
import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { AREAS, type AreaId } from './areas'
import { db, type Entry, type Habit } from './db'
import { areaScore, dayStreak, groupDone, levelInfo, type LevelInfo } from './logic'

export interface CaveState {
  ready: boolean
  habits: Habit[] // active habits, in order
  allHabits: Habit[] // includes retired ones, for history
  entries: Entry[]
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

  return useMemo(() => {
    const hs = allHabits ?? []
    const es = entries ?? []
    const doneByHabit = groupDone(es)
    const totalXp = es.reduce((sum, e) => sum + e.xp, 0)
    const scores = {} as Record<AreaId, number | null>
    const xpByArea = {} as Record<AreaId, number>
    for (const a of AREAS) {
      scores[a.id] = areaScore(a.id, hs, doneByHabit, today)
      xpByArea[a.id] = 0
    }
    for (const e of es) xpByArea[e.area] += e.xp
    return {
      ready: allHabits !== undefined && entries !== undefined,
      habits: hs.filter((h) => !h.archivedOn).sort((a, b) => a.order - b.order),
      allHabits: hs,
      entries: es,
      doneByHabit,
      totalXp,
      level: levelInfo(totalXp),
      streak: dayStreak(new Set(es.map((e) => e.date)), today),
      scores,
      xpByArea,
    }
  }, [allHabits, entries, today])
}
