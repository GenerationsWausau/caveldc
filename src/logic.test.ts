import { describe, expect, it } from 'vitest'
import {
  addDays,
  areaScore,
  dateKey,
  dayStreak,
  groupDone,
  habitStreak,
  isScheduled,
  levelInfo,
  type HabitLike,
} from './logic'

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6]
const habit = (over: Partial<HabitLike> = {}): HabitLike => ({
  id: 'h1',
  area: 'physical',
  days: EVERY_DAY,
  startDate: '2026-01-01',
  ...over,
})

describe('dates', () => {
  it('adds days across month and year ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
  })
  it('formats local dates', () => {
    expect(dateKey(new Date(2026, 10, 4))).toBe('2026-11-04')
  })
})

describe('isScheduled', () => {
  it('respects weekdays, start date and retirement', () => {
    // 2026-11-14 is a Saturday
    expect(isScheduled(habit({ days: [6] }), '2026-11-14')).toBe(true)
    expect(isScheduled(habit({ days: [1] }), '2026-11-14')).toBe(false)
    expect(isScheduled(habit({ startDate: '2026-11-15' }), '2026-11-14')).toBe(false)
    expect(isScheduled(habit({ archivedOn: '2026-11-14' }), '2026-11-14')).toBe(false)
  })
})

describe('habitStreak', () => {
  const today = '2026-11-14'
  it('counts back from today', () => {
    const done = new Set(['2026-11-14', '2026-11-13', '2026-11-12'])
    expect(habitStreak(habit(), done, today)).toBe(3)
  })
  it("keeps the streak alive while today isn't done yet", () => {
    const done = new Set(['2026-11-13', '2026-11-12'])
    expect(habitStreak(habit(), done, today)).toBe(2)
  })
  it('breaks on a missed scheduled day', () => {
    const done = new Set(['2026-11-14', '2026-11-12'])
    expect(habitStreak(habit(), done, today)).toBe(1)
  })
  it('skips days the habit is not scheduled', () => {
    // Mon/Wed/Fri habit: Fri 13th, Wed 11th, Mon 9th
    const h = habit({ days: [1, 3, 5] })
    const done = new Set(['2026-11-13', '2026-11-11', '2026-11-09'])
    expect(habitStreak(h, done, today)).toBe(3)
  })
  it('stops at the start date', () => {
    const h = habit({ startDate: '2026-11-13' })
    expect(habitStreak(h, new Set(['2026-11-13', '2026-11-14']), today)).toBe(2)
  })
})

describe('dayStreak', () => {
  it('counts consecutive active days and tolerates an unfinished today', () => {
    expect(dayStreak(new Set(['2026-11-13', '2026-11-12']), '2026-11-14')).toBe(2)
    expect(dayStreak(new Set(['2026-11-14', '2026-11-13']), '2026-11-14')).toBe(2)
    expect(dayStreak(new Set(['2026-11-12']), '2026-11-14')).toBe(0)
  })
})

describe('levelInfo', () => {
  it('starts at level 1', () => {
    expect(levelInfo(0)).toMatchObject({ level: 1, into: 0, needed: 100, rank: 'Outcast' })
  })
  it('levels up at the thresholds', () => {
    expect(levelInfo(99).level).toBe(1)
    expect(levelInfo(100)).toMatchObject({ level: 2, into: 0, needed: 150 })
    expect(levelInfo(250)).toMatchObject({ level: 3, into: 0, needed: 200, rank: 'Seeker' })
  })
})

describe('areaScore', () => {
  const today = '2026-11-14'
  it('is null with nothing scheduled', () => {
    expect(areaScore('mental', [habit()], new Map(), today)).toBeNull()
  })
  it('is the share of scheduled days done, ignoring an unfinished today', () => {
    const h = habit({ startDate: '2026-11-11' }) // 11, 12, 13 count; 14 pending
    const done = groupDone([
      { date: '2026-11-11', refId: 'h1', area: 'physical', xp: 10 },
      { date: '2026-11-13', refId: 'h1', area: 'physical', xp: 10 },
    ])
    expect(areaScore('physical', [h], done, today)).toBe(67)
  })
  it('counts challenges dealt in that area alongside habits', () => {
    const days = new Map([
      ['2026-11-13', { date: '2026-11-13', challenges: [{ id: 'men-01', area: 'mental' as const }] }],
      ['2026-11-12', { date: '2026-11-12', challenges: [{ id: 'men-02', area: 'mental' as const }] }],
    ])
    const done = groupDone([{ date: '2026-11-13', refId: 'men-01', area: 'mental', xp: 30 }])
    expect(areaScore('mental', [], done, today, days)).toBe(50)
    expect(areaScore('physical', [], done, today, days)).toBeNull()
  })
  it('counts today once it is done', () => {
    const h = habit({ startDate: '2026-11-14' })
    const done = groupDone([{ date: '2026-11-14', refId: 'h1', area: 'physical', xp: 10 }])
    expect(areaScore('physical', [h], done, today)).toBe(100)
  })
})
