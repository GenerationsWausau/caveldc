import { describe, expect, it } from 'vitest'
import { allTimes, buildIcs, DEFAULT_REMINDERS, icsPath, snapTime } from './reminders'

describe('buildIcs', () => {
  const now = new Date(2026, 10, 14, 8, 0, 0)
  const ics = buildIcs(DEFAULT_REMINDERS[0], 'https://example.test/app/', now)

  it('makes one daily repeating event with an alert', () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1)
    expect(ics).toContain('RRULE:FREQ=DAILY')
    expect(ics).toContain('BEGIN:VALARM')
    expect(ics).toContain('DTSTART:20261114T063000')
    expect(ics).toContain('UID:morning@the-cave')
    expect(ics).toContain('URL:https://example.test/app/')
  })
  it('uses calendar line endings and escapes commas', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    const withComma = buildIcs({ ...DEFAULT_REMINDERS[0], title: 'Up, now' }, 'https://x.test/', now)
    expect(withComma).toContain('SUMMARY:Up\\, now')
  })
})

describe('reminder times', () => {
  it('snaps to the nearest five minutes, wrapping at midnight', () => {
    expect(snapTime('06:32')).toBe('06:30')
    expect(snapTime('06:33')).toBe('06:35')
    expect(snapTime('23:58')).toBe('00:00')
  })
  it('publishes a file for every snapped time', () => {
    const times = allTimes()
    expect(times).toHaveLength(288)
    expect(times).toContain(snapTime('21:07'))
    expect(icsPath('evening', '21:05')).toBe('reminders/evening-2105.ics')
  })
})
