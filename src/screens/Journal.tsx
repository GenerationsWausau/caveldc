import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { DayBar, formatDay } from '../components/DayBar'
import { db, saveJournal, type JournalDraft, type JournalEntry } from '../db'
import { addDays } from '../logic'

const PROMPTS: { key: keyof JournalDraft; label: string; placeholder: string }[] = [
  { key: 'win', label: 'One win today', placeholder: 'Held my tongue in the staff meeting' },
  { key: 'miss', label: 'Where I fell short', placeholder: 'Skipped the workout and blamed the weather' },
  { key: 'tomorrow', label: 'Tomorrow I will', placeholder: 'Train before breakfast' },
]

const BLANK: JournalDraft = { win: '', miss: '', tomorrow: '', notes: '' }
const SAVE_DELAY_MS = 600

export function Journal({ today }: { today: string }) {
  const [offset, setOffset] = useState(0)
  const date = addDays(today, -offset)

  // Tagged with its date so a day's editor never opens holding the previous day's text.
  const loaded = useLiveQuery(() => db.journal.get(date).then((entry) => ({ date, entry: entry ?? null })), [date])
  const past = useLiveQuery(() => db.journal.orderBy('date').reverse().limit(60).toArray(), [])
  const earlier = (past ?? []).filter((e) => e.date !== date)

  return (
    <>
      <header className="page-head">
        <h1>Journal</h1>
      </header>
      <DayBar date={date} offset={offset} onOffset={setOffset} />

      {loaded?.date === date && <Editor key={date} date={date} initial={loaded.entry} />}

      {earlier.length > 0 && (
        <>
          <div className="section-head">
            <h2>Other entries</h2>
          </div>
          <ul className="habit-list">
            {earlier.map((e) => (
              <li key={e.date}>
                <button className="habit entry" onClick={() => setOffset(daysBetween(e.date, today))}>
                  <span className="habit-body">
                    <span className="habit-meta">{formatDay(e.date)}</span>
                    <span className="entry-preview">{preview(e)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}

function Editor({ date, initial }: { date: string; initial: JournalEntry | null }) {
  const [draft, setDraft] = useState<JournalDraft>(initial ?? BLANK)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const pending = useRef<JournalDraft | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const flush = () => {
    clearTimeout(timer.current)
    const toSave = pending.current
    if (!toSave) return
    pending.current = null
    void saveJournal(date, toSave).then(() => setStatus('saved'))
  }

  // Writes as you type, shortly after you pause. Leaving the screen or the app saves at once.
  const change = (key: keyof JournalDraft, value: string) => {
    const next = { ...draft, [key]: value }
    setDraft(next)
    pending.current = next
    setStatus('saving')
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, SAVE_DELAY_MS)
  }

  const flushRef = useRef(flush)
  useEffect(() => {
    flushRef.current = flush
  })
  useEffect(() => {
    const onHide = () => flushRef.current()
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      flushRef.current()
    }
  }, [])

  return (
    <div className="journal">
      {PROMPTS.map((p) => (
        <label key={p.key} className="field">
          <span>{p.label}</span>
          <textarea
            rows={2}
            value={draft[p.key]}
            placeholder={p.placeholder}
            onChange={(e) => change(p.key, e.target.value)}
            onBlur={flush}
          />
        </label>
      ))}
      <label className="field">
        <span>Anything else</span>
        <textarea
          rows={7}
          value={draft.notes}
          placeholder="Write it out."
          onChange={(e) => change('notes', e.target.value)}
          onBlur={flush}
        />
      </label>
      <p className="save-status" role="status">
        {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : ' '}
      </p>
    </div>
  )
}

function preview(e: JournalEntry) {
  const text = [e.win, e.miss, e.tomorrow, e.notes].find((t) => t.trim()) ?? ''
  return text.length > 90 ? `${text.slice(0, 90).trimEnd()}…` : text
}

function daysBetween(earlier: string, later: string) {
  let n = 0
  for (let key = later; key > earlier; key = addDays(key, -1)) n++
  return n
}
