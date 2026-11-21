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
import { VacationCard } from '../components/VacationCard'
import { todayKey } from '../logic'
import { APP_URL, icsPath, snapTime, STEP_MINUTES, type Reminder } from '../reminders'

// True only inside an iPhone or iPad web app opened from the home screen.
const isIosApp = (navigator as Navigator & { standalone?: boolean }).standalone === true

export function Settings({ onManageHabits }: { onManageHabits: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Backup | null>(null)
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted)
  }, [])

  const reminders = useLiveQuery(getReminders, []) ?? []
  const [copied, setCopied] = useState<Reminder['id'] | null>(null)

  const changeTime = (id: Reminder['id'], time: string) => {
    setCopied(null)
    void saveReminders(reminders.map((r) => (r.id === id ? { ...r, time: snapTime(time) } : r)))
  }

  const fileUrl = (r: Reminder) => APP_URL + icsPath(r.id, r.time)
  // An installed iPhone web app has to pass the link to Safari; only Safari offers
  // "Add to Calendar". Everywhere else the plain link is right.
  const openUrl = (r: Reminder) => (isIosApp ? fileUrl(r).replace(/^https:/, 'x-safari-https:') : fileUrl(r))

  const copyLink = async (r: Reminder) => {
    try {
      await navigator.clipboard.writeText(fileUrl(r))
      setCopied(r.id)
    } catch {
      setCopied(null)
    }
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
        <h2>Vacation</h2>
      </div>
      <VacationCard />

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
            <div className="reminder-top">
              <span className="reminder-title">{r.title}</span>
              <input
                type="time"
                step={STEP_MINUTES * 60}
                aria-label={`${r.title} time`}
                value={r.time}
                onChange={(e) => e.target.value && changeTime(r.id, e.target.value)}
              />
            </div>
            <small>{r.note}</small>
            <div className="reminder-actions">
              <a className="btn btn-primary" href={openUrl(r)} target="_blank" rel="noreferrer">
                <CalendarPlus size={18} aria-hidden /> Add to calendar
              </a>
              <button className="btn" onClick={() => copyLink(r)}>
                {copied === r.id ? 'Copied' : 'Copy link'}
              </button>
            </div>
          </div>
        ))}
        <p className="hint">
          If "Add to calendar" does nothing, tap "Copy link", open Safari or Chrome, and paste it into the
          address bar. Changed a time? Add it again. To stop a reminder, delete its event in your calendar
          app.
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
