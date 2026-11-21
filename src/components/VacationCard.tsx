import { useLiveQuery } from 'dexie-react-hooks'
import { TentTree } from 'lucide-react'
import { useState } from 'react'
import { cancelVacation, endVacationNow, getVacations, scheduleVacation } from '../db'
import { addDays, currentVacation, todayKey } from '../logic'
import { formatDay } from './DayBar'

const MAX_DAYS = 60

/** Schedules, shows and ends vacation mode. Lives in Settings. */
export function VacationCard() {
  const today = todayKey()
  const vacations = useLiveQuery(getVacations, [])
  const vacation = currentVacation(vacations ?? [], today)

  const [start, setStart] = useState(() => addDays(today, 1))
  const [end, setEnd] = useState(() => addDays(today, 7))
  const [error, setError] = useState('')
  const [confirmEnd, setConfirmEnd] = useState(false)

  if (vacations === undefined) return <div className="card" />

  if (vacation) {
    const underWay = vacation.start <= today
    return (
      <div className="card">
        <p className="vacation-status">
          <TentTree size={18} aria-hidden style={{ verticalAlign: '-3px', marginRight: 8 }} />
          {underWay
            ? `On vacation through ${formatDay(vacation.end)}`
            : `Vacation from ${formatDay(vacation.start)} to ${formatDay(vacation.end)}`}
        </p>
        <p>
          {underWay
            ? 'Your XP, level, streaks and scores are paused. It turns off by itself after the last day.'
            : 'It starts by itself that morning and turns off after the last day.'}
        </p>
        {underWay ? (
          confirmEnd ? (
            <div className="confirm">
              <p>End vacation now? From today, things count again. The days already on vacation stay paused.</p>
              <div className="confirm-actions">
                <button className="btn" onClick={() => setConfirmEnd(false)}>
                  Keep vacation
                </button>
                <button
                  className="btn btn-primary"
                  onClick={async () => {
                    await endVacationNow(vacation, today)
                    setConfirmEnd(false)
                  }}
                >
                  End it now
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-block" onClick={() => setConfirmEnd(true)}>
              End vacation now
            </button>
          )
        ) : (
          <button className="btn btn-block" onClick={() => cancelVacation(vacation)}>
            Cancel vacation
          </button>
        )}
      </div>
    )
  }

  const schedule = async () => {
    if (!start || !end) return setError('Pick a first and last day.')
    if (end < start) return setError('The last day has to be on or after the first day.')
    if (addDays(start, MAX_DAYS - 1) < end) return setError(`Keep it to ${MAX_DAYS} days or fewer.`)
    await scheduleVacation({ start, end })
    setError('')
  }

  return (
    <div className="card">
      <p>
        Going away? Pick your dates. You'll still get challenges and can check off what you manage, but
        nothing earns XP and nothing missed counts against you. Streaks and scores pick up where they left
        off.
      </p>
      <div className="vacation-dates">
        <label className="field">
          <span>First day</span>
          <input
            type="date"
            value={start}
            onChange={(e) => {
              setStart(e.target.value)
              if (e.target.value && end < e.target.value) setEnd(e.target.value)
              setError('')
            }}
          />
        </label>
        <label className="field">
          <span>Last day</span>
          <input
            type="date"
            value={end}
            min={start}
            onChange={(e) => {
              setEnd(e.target.value)
              setError('')
            }}
          />
        </label>
      </div>
      {start && start < today && (
        <p className="hint">
          This starts in the past. XP you already earned on those days won't count once they're vacation days.
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-primary btn-block" onClick={schedule}>
        <TentTree size={18} aria-hidden /> Schedule vacation
      </button>
    </div>
  )
}
