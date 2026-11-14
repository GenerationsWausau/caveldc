import { X } from 'lucide-react'
import { useState } from 'react'
import { AREAS, DIFFICULTIES, type AreaId } from '../areas'
import { addHabit, retireHabit, updateHabit, type Habit } from '../db'

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

interface Props {
  habit: Habit | null
  onClose: () => void
}

export function HabitForm({ habit, onClose }: Props) {
  const [name, setName] = useState(habit?.name ?? '')
  const [area, setArea] = useState<AreaId>(habit?.area ?? 'physical')
  const [xp, setXp] = useState(habit?.xp ?? 20)
  const [days, setDays] = useState<number[]>(habit?.days ?? [0, 1, 2, 3, 4, 5, 6])
  const [error, setError] = useState('')
  const [confirmRetire, setConfirmRetire] = useState(false)

  const toggleDay = (d: number) => {
    setError('')
    setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d])
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return setError('Give the habit a name.')
    if (days.length === 0) return setError('Pick at least one day.')
    const draft = { name: trimmed, area, xp, days }
    if (habit) await updateHabit(habit.id, draft)
    else await addHabit(draft)
    onClose()
  }

  const retire = async () => {
    if (!habit) return
    await retireHabit(habit.id)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form className="sheet" onSubmit={save} onClick={(e) => e.stopPropagation()} aria-label="Habit">
        <div className="sheet-head">
          <h2>{habit ? 'Edit habit' : 'New habit'}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden />
          </button>
        </div>

        <label className="field">
          <span>Habit</span>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            placeholder="Read 20 pages"
            maxLength={60}
            autoFocus={!habit}
            enterKeyHint="done"
          />
        </label>

        <fieldset className="field">
          <legend>Growth area</legend>
          <div className="chips">
            {AREAS.map((a) => (
              <button
                type="button"
                key={a.id}
                className="chip"
                aria-pressed={area === a.id}
                style={{ '--area': a.color } as React.CSSProperties}
                onClick={() => setArea(a.id)}
              >
                {a.name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>How hard is it?</legend>
          <div className="chips chips-even">
            {DIFFICULTIES.map((d) => (
              <button
                type="button"
                key={d.xp}
                className="chip"
                aria-pressed={xp === d.xp}
                onClick={() => setXp(d.xp)}
              >
                {d.label} <small>{d.xp} XP</small>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="field">
          <legend>Which days?</legend>
          <div className="chips chips-even">
            {DAYS.map((d, i) => (
              <button
                type="button"
                key={i}
                className="chip chip-day"
                aria-pressed={days.includes(i)}
                aria-label={DAY_NAMES[i]}
                onClick={() => toggleDay(i)}
              >
                {d}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <button type="submit" className="btn btn-primary btn-block">
          {habit ? 'Save changes' : 'Add habit'}
        </button>

        {habit &&
          (confirmRetire ? (
            <div className="confirm">
              <p>Retire this habit? It leaves your daily list. The XP and history it earned stay.</p>
              <div className="confirm-actions">
                <button type="button" className="btn" onClick={() => setConfirmRetire(false)}>
                  Keep it
                </button>
                <button type="button" className="btn btn-danger" onClick={retire}>
                  Retire habit
                </button>
              </div>
            </div>
          ) : (
            <button type="button" className="btn btn-quiet btn-block" onClick={() => setConfirmRetire(true)}>
              Retire habit
            </button>
          ))}
      </form>
    </div>
  )
}
