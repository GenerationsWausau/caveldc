// Reminders are handed to the phone's own calendar, because a web app with no server
// can't wake itself up to notify you.
//
// iPhone only offers "Add to Calendar" for a calendar file opened as an ordinary web
// link in Safari. It ignores files an installed web app generates or shares. So the
// build publishes one small calendar file per reminder per time of day, and the app
// links to the right one.

export interface Reminder {
  id: 'morning' | 'evening'
  title: string
  note: string
  time: string // "HH:MM", 24-hour, on a 5-minute step
}

export const DEFAULT_REMINDERS: Reminder[] = [
  { id: 'morning', title: 'Enter the Cave', note: "Today's challenges are waiting.", time: '06:30' },
  { id: 'evening', title: 'Close out the day', note: 'Check off what you did and write the journal.', time: '21:00' },
]

/** Where the app is published. The calendar events link back here. */
export const APP_URL = 'https://generationswausau.github.io/caveldc/'

export const STEP_MINUTES = 5

const pad = (n: number) => String(n).padStart(2, '0')

/** Snaps a time to the nearest step that has a published file. */
export function snapTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const total = Math.round((h * 60 + m) / STEP_MINUTES) * STEP_MINUTES
  const wrapped = total % (24 * 60)
  return `${pad(Math.floor(wrapped / 60))}:${pad(wrapped % 60)}`
}

/** Every time of day a reminder can be set to. */
export function allTimes(): string[] {
  const out: string[] = []
  for (let t = 0; t < 24 * 60; t += STEP_MINUTES) out.push(`${pad(Math.floor(t / 60))}:${pad(t % 60)}`)
  return out
}

/** Path of a reminder's calendar file, relative to the app. */
export function icsPath(id: Reminder['id'], time: string): string {
  return `reminders/${id}-${time.replace(':', '')}.ics`
}

/** Calendar text has to escape these or the file breaks. */
const esc = (text: string) => text.replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n')

/**
 * A calendar file holding one event that repeats every day with an alert at its start.
 * The time is "floating": 6:30 means 6:30 wherever the phone is. A reminder keeps the
 * same id whatever its time, so adding it again at a new time updates the old event
 * in calendars that honour that, instead of adding a second one.
 */
export function buildIcs(reminder: Reminder, appUrl: string, now: Date): string {
  const day = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  const [h, m] = reminder.time.split(':')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//The Cave//Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${reminder.id}@the-cave`,
    `DTSTAMP:${stamp}`,
    `SEQUENCE:${Math.floor(now.getTime() / 1000)}`,
    `DTSTART:${day}T${h}${m}00`,
    'DURATION:PT5M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${esc(reminder.title)}`,
    `DESCRIPTION:${esc(`${reminder.note}\n${appUrl}`)}`,
    `URL:${appUrl}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(reminder.title)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.join('\r\n') + '\r\n'
}
