export type AreaId = 'physical' | 'mental' | 'spiritual' | 'relational' | 'financial'

export interface Area {
  id: AreaId
  name: string
  short: string
  color: string
}

export const AREAS: Area[] = [
  { id: 'physical', name: 'Physical', short: 'Body', color: '#d4574a' },
  { id: 'mental', name: 'Mental', short: 'Mind', color: '#6b93e6' },
  { id: 'spiritual', name: 'Spiritual', short: 'Spirit', color: '#e09a35' },
  { id: 'relational', name: 'Relational', short: 'People', color: '#8fb573' },
  { id: 'financial', name: 'Financial', short: 'Money', color: '#4fb3a6' },
]

export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<AreaId, Area>

export const DIFFICULTIES = [
  { xp: 10, label: 'Easy' },
  { xp: 20, label: 'Solid' },
  { xp: 30, label: 'Hard' },
] as const
