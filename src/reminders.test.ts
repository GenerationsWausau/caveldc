import { describe, expect, it } from 'vitest'
import { buildIcs, DEFAULT_REMINDERS } from './reminders'

describe('buildIcs', () => {
  const now = new Date(2026, 10, 14, 8, 0, 0)
  const ics = buildIcs(DEFAULT_REMINDERS, 'https://example.test/app/', now)

  it('makes a daily repeating event with an alert for each reminder', () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2)
    expect(ics.match(/RRULE:FREQ=DAILY/g)).toHaveLength(2)
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2)
    expect(ics).toContain('DTSTART:20261114T063000')
    expect(ics).toContain('DTSTART:20261114T210000')
    expect(ics).toContain('UID:morning@the-cave')
  })
  it('uses calendar line endings and escapes commas', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    const withComma = buildIcs([{ ...DEFAULT_REMINDERS[0], title: 'Up, now' }], 'https://x.test/', now)
    expect(withComma).toContain('SUMMARY:Up\\, now')
  })
  it('leaves out reminders that are switched off', () => {
    const one = buildIcs([DEFAULT_REMINDERS[0], { ...DEFAULT_REMINDERS[1], on: false }], 'https://x.test/', now)
    expect(one.match(/BEGIN:VEVENT/g)).toHaveLength(1)
    expect(one).not.toContain('evening@the-cave')
  })
})
