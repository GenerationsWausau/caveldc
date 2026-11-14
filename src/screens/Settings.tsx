import { useLiveQuery } from 'dexie-react-hooks'
import { CalendarPlus, ChevronRight, Download, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  exportBackup,
  getReminders,
  parseBackup,
  restoreBackup,
  saveReminders,
  type Backup,
} from '../db'
import { todayKey } from '../logic'
import { buildIcs, type Reminder } from '../reminders'

export function Settings({ onManageHabits }: { onManageHabits: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  const reminders = useLiveQuery(getReminders, []) ?? []
  const [calendarNote, setCalendarNote] = useState('')

  const changeReminder = (id: Reminder['id'], change: Partial<Reminder>) => {
    setCalendarNote('')
    void saveReminders(reminders.map((r) => (r.id === id ? { ...r, ...change } : r)))
  }

  // Hands the phone a calendar file. Sharing it is the surest way to reach the calendar
  // app from an installed web app; a plain download is the fallback.
  const addToCalendar = async () => {
    const appUrl = new URL('./', window.location.href).href
    const file = new File([buildIcs(reminders, appUrl, new Date())], 'the-cave-reminders.ics', {
      type: 'text/calendar',
    })
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'The Cave reminders' })
        setCalendarNote('Choose your calendar app to finish adding them.')
        return
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
    setCalendarNote('Open the downloaded file to add the reminders to your calendar.')
  }

  const download = async () => {
    const backup = await exportBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `the-cave-backup-${todayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage({ kind: 'ok', text: 'Backup saved to your downloads.' })
  }

  const pickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setPending(parseBackup(await file.text()))
      setMessage(null)
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message })
    }
  }

  const restore = async () => {
    if (!pending) return
    await restoreBackup(pending)
    setPending(null)
    setMessage({ kind: 'ok', text: 'Backup restored.' })
  }

  return (
    <>
      <header className="page-head">
        <h1>Settings</h1>
      </header>

      <div className="section-head">
        <h2>Habits</h2>
      </div>
      <button className="habit" onClick={onManageHabits}>
        <span className="habit-body">
          <span className="habit-name">Edit your habits</span>
          <span className="habit-meta">Add, change or retire the habits on your daily list</span>
        </span>
        <ChevronRight size={18} aria-hidden />
      </button>

      <div className="section-head">
        <h2>Reminders</h2>
      </div>
      <div className="card">
        <p>
          The Cave can't alert you while it's closed, so reminders go into your phone's calendar as daily
          repeating alerts that link back here.
        </p>
        {reminders.map((r) => (
          <div key={r.id} className="reminder">
            <label>
              <input type="checkbox" checked={r.on} onChange={(e) => changeReminder(r.id, { on: e.target.checked })} />
              {r.title}
            </label>
            <input
              type="time"
              aria-label={`${r.title} time`}
              value={r.time}
              disabled={!r.on}
              onChange={(e) => e.target.value && changeReminder(r.id, { time: e.target.value })}
            />
            <small>{r.note}</small>
          </div>
        ))}
        <button className="btn btn-primary btn-block" disabled={!reminders.some((r) => r.on)} onClick={addToCalendar}>
          <CalendarPlus size={18} aria-hidden /> Add to my calendar
        </button>
        {calendarNote && (
          <p className="form-ok" role="status">
            {calendarNote}
          </p>
        )}
        <p className="hint">
          Changed a time? Add them again and your calendar updates the same events. To stop a reminder,
          delete its event in your calendar app.
        </p>
      </div>

      <div className="section-head">
        <h2>Backup</h2>
      </div>
      <div className="card">
        <p>
          Everything lives on this phone only. Save a backup file now and then so a lost or reset phone
          doesn't take your history with it.
        </p>
        <button className="btn btn-block" onClick={download}>
          <Download size={18} aria-hidden /> Save a backup
        </button>
        <button className="btn btn-block" onClick={() => fileInput.current?.click()}>
          <Upload size={18} aria-hidden /> Restore from a backup
        </button>
        <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={pickFile} />

        {pending && (
          <div className="confirm">
            <p>
              This backup from {new Date(pending.exportedAt).toLocaleDateString()} has {pending.habits.length}{' '}
              habits, {pending.entries.length} completions, {pending.journal?.length ?? 0} journal entries and{' '}
              {pending.meals?.length ?? 0} meals. Restoring replaces everything on this phone.
            </p>
            <div className="confirm-actions">
              <button className="btn" onClick={() => setPending(null)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={restore}>
                Replace my data
              </button>
            </div>
          </div>
        )}
        {message && (
          <p className={message.kind === 'error' ? 'form-error' : 'form-ok'} role="status">
            {message.text}
          </p>
        )}
      </div>

      <div className="section-head">
        <h2>About</h2>
      </div>
      <div className="card">
        <p>The Cave · version {__APP_VERSION__}</p>
        {persisted !== null && (
          <p className="hint">
            {persisted
              ? 'Storage is protected: the phone will not clear your data to free up space.'
              : 'Storage is not protected yet. Adding The Cave to your home screen usually fixes this.'}
          </p>
        )}
      </div>
    </>
  )
}
