export type AreaId = 'physical' | 'mental' | 'spiritual' | 'relational' | 'financial'

export interface Area {
  id: AreaId
  name: string
  short: string
  color: string
}

// Checked as a set for colour-blind separation on the app's dark surface. Re-run the
// palette validator before changing any of them.
export const AREAS: Area[] = [
  { id: 'physical', name: 'Physical', short: 'Body', color: '#d4574a' },
  { id: 'mental', name: 'Mental', short: 'Mind', color: '#5b84d6' },
  { id: 'spiritual', name: 'Spiritual', short: 'Spirit', color: '#c8842a' },
  { id: 'relational', name: 'Relational', short: 'People', color: '#3f9e7a' },
  { id: 'financial', name: 'Financial', short: 'Money', color: '#a06ad2' },
]

export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<AreaId, Area>

export const DIFFICULTIES = [
  { xp: 10, label: 'Easy' },
  { xp: 20, label: 'Solid' },
  { xp: 30, label: 'Hard' },
] as const
