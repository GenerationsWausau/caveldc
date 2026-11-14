import { describe, expect, it } from 'vitest'
import { AREAS } from './areas'
import { areasForDay, CHALLENGES, CHALLENGES_PER_DAY, pickChallenge } from './challenges'
import { addDays } from './logic'

describe('challenge library', () => {
  it('has unique ids', () => {
    expect(new Set(CHALLENGES.map((c) => c.id)).size).toBe(CHALLENGES.length)
  })
  it('has enough in every area to go two weeks without a repeat', () => {
    for (const a of AREAS) {
      expect(CHALLENGES.filter((c) => c.area === a.id).length).toBeGreaterThanOrEqual(15)
    }
  })
})

describe('areasForDay', () => {
  it('deals three different areas each day', () => {
    const areas = areasForDay('2026-11-14')
    expect(areas).toHaveLength(CHALLENGES_PER_DAY)
    expect(new Set(areas).size).toBe(CHALLENGES_PER_DAY)
  })
  it('gives every area three turns in any five days, across a clock change', () => {
    for (const start of ['2026-11-14', '2026-03-06', '2026-10-30']) {
      const counts = new Map<string, number>()
      for (let i = 0; i < 5; i++) {
        for (const a of areasForDay(addDays(start, i))) counts.set(a, (counts.get(a) ?? 0) + 1)
      }
      expect([...counts.values()]).toEqual([3, 3, 3, 3, 3])
    }
  })
})

describe('pickChallenge', () => {
  it('stays in the area and avoids recent ones', () => {
    const pool = CHALLENGES.filter((c) => c.area === 'relational')
    const avoid = new Set(pool.slice(1).map((c) => c.id))
    expect(pickChallenge('relational', avoid)).toBe(pool[0])
  })
  it('still returns something when everything was used recently', () => {
    const avoid = new Set(CHALLENGES.map((c) => c.id))
    expect(pickChallenge('mental', avoid).area).toBe('mental')
  })
})
