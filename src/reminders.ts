// Reminders are handed to the phone's own calendar, because a web app with no server
// can't wake itself up to notify you. This builds the calendar file.

export interface Reminder {
  id: 'morning' | 'evening'
  title: string
  note: string
  time: string // "HH:MM", 24-hour
  on: boolean
}

export const DEFAULT_REMINDERS: Reminder[] = [
  { id: 'morning', title: 'Enter the Cave', note: "Today's challenges are waiting.", time: '06:30', on: true },
  { id: 'evening', title: 'Close out the day', note: 'Check off what you did and write the journal.', time: '21:00', on: true },
]

const pad = (n: number) => String(n).padStart(2, '0')

/** Calendar text has to escape these or the file breaks. */
const esc = (text: string) => text.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n')

/**
 * A calendar file with one event per switched-on reminder, repeating every day with an
 * alert at the event time. Times are "floating": 6:30 means 6:30 wherever the phone is.
 * Each reminder keeps the same id forever, so importing again updates it instead of
 * adding a duplicate.
 */
export function buildIcs(reminders: Reminder[], appUrl: string, now: Date): string {
  const day = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const sequence = Math.floor(now.getTime() / 1000)
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Cave//Reminders//EN', 'CALSCALE:GREGORIAN']
  for (const r of reminders) {
    if (!r.on) continue
    const [h, m] = r.time.split(':')
    lines.push(
      'BEGIN:VEVENT',
      `UID:${r.id}@the-cave`,
      `DTSTAMP:${stamp}`,
      `SEQUENCE:${sequence}`,
      `DTSTART:${day}T${h}${m}00`,
      'DURATION:PT5M',
      'RRULE:FREQ=DAILY',
      `SUMMARY:${esc(r.title)}`,
      `DESCRIPTION:${esc(`${r.note}\n${appUrl}`)}`,
      `URL:${appUrl}`,
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${esc(r.title)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}
