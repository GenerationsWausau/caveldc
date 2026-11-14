// 'fitness' is shown as "Physical". The id differs on purpose: an older version used
// 'physical' for what is now split into health and fitness, and 'financial' for an area
// that has been removed. Neither old id may be reused; see migrateLegacyAreas in db.ts.
export type AreaId = 'health' | 'fitness' | 'mental' | 'spiritual' | 'relational'

export interface Area {
  id: AreaId
  name: string
  short: string
  color: string
}

// Checked as a set for colour-blind separation on the app's dark surface. Re-run the
// palette validator before changing any of them.
export const AREAS: Area[] = [
  { id: 'health', name: 'Health', short: 'Health', color: '#a06ad2' },
  { id: 'fitness', name: 'Physical', short: 'Physical', color: '#d4574a' },
  { id: 'mental', name: 'Mental', short: 'Mind', color: '#5b84d6' },
  { id: 'spiritual', name: 'Spiritual', short: 'Spirit', color: '#c8842a' },
  { id: 'relational', name: 'Relational', short: 'People', color: '#3f9e7a' },
]

export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<AreaId, Area>

/** Looks up an area, with a neutral stand-in so stray data can never crash a screen. */
export function areaOf(id: string): Area {
  return AREA_BY_ID[id as AreaId] ?? { id: 'health', name: 'Other', short: 'Other', color: '#7d7366' }
}

export const DIFFICULTIES = [
  { xp: 10, label: 'Easy' },
  { xp: 20, label: 'Solid' },
  { xp: 30, label: 'Hard' },
] as const
