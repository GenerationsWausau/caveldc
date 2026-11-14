import { Check, ChevronLeft, ChevronRight, Flame, Plus } from 'lucide-react'
import { useState } from 'react'
import { AREAS, AREA_BY_ID } from '../areas'
import { toggleHabit, type Habit } from '../db'
import { addDays, habitStreak, isScheduled, parseKey } from '../logic'
import type { CaveState } from '../useCave'

const DAY_FMT = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

interface Props {
  cave: CaveState
  today: string
  onAddHabit: () => void
}

export function Today({ cave, today, onAddHabit }: Props) {
  // Lets you step back to tick off a day you forgot to log. Never forward past today.
  const [offset, setOffset] = useState(0)
  const date = addDays(today, -offset)
  const { level } = cave

  const scheduled = cave.habits.filter((h) => isScheduled(h, date))
  const isDone = (h: Habit) => cave.doneByHabit.get(h.id)?.has(date) ?? false
  const doneCount = scheduled.filter(isDone).length

  const toggle = async (h: Habit) => {
    const nowDone = await toggleHabit(h, date)
    if (nowDone) navigator.vibrate?.(15)
  }

  return (
    <>
      <header className="hero">
        <div className="hero-top">
          <div>
            <p className="eyebrow">Level {level.level}</p>
            <h1 className="rank">{level.rank}</h1>
          </div>
          <div className="streak" aria-label={`${cave.streak} day streak`}>
            <Flame size={18} aria-hidden />
            <span>{cave.streak}</span>
          </div>
        </div>
        <div
          className="xpbar"
          role="progressbar"
          aria-valuenow={level.into}
          aria-valuemax={level.needed}
          aria-label="XP toward next level"
        >
          <div className="xpbar-fill" style={{ width: `${(level.into / level.needed) * 100}%` }} />
        </div>
        <p className="xp-label">
          {level.into} / {level.needed} XP to level {level.level + 1}
        </p>
      </header>

      <section className="scores" aria-label="Growth areas, last 30 days">
        {AREAS.map((a) => {
          const score = cave.scores[a.id]
          return (
            <div key={a.id} className="score" style={{ '--area': a.color } as React.CSSProperties}>
              <span className="score-num">{score ?? '–'}</span>
              <span className="score-name">{a.short}</span>
            </div>
          )
        })}
      </section>

      <div className="daybar">
        <button className="icon-btn" aria-label="Previous day" onClick={() => setOffset(offset + 1)}>
          <ChevronLeft size={20} aria-hidden />
        </button>
        <div className="daybar-label">
          <strong>{offset === 0 ? 'Today' : offset === 1 ? 'Yesterday' : DAY_FMT.format(parseKey(date))}</strong>
          {offset === 0 && <span>{DAY_FMT.format(parseKey(date))}</span>}
        </div>
        <button
          className="icon-btn"
          aria-label="Next day"
          disabled={offset === 0}
          onClick={() => setOffset(offset - 1)}
        >
          <ChevronRight size={20} aria-hidden />
        </button>
      </div>

      {cave.habits.length === 0 ? (
        <div className="empty">
          <h2>Enter the cave</h2>
          <p>Nobody comes out stronger by accident. Pick the first habit you'll hold yourself to.</p>
          <button className="btn btn-primary" onClick={onAddHabit}>
            <Plus size={18} aria-hidden /> Add your first habit
          </button>
        </div>
      ) : scheduled.length === 0 ? (
        <div className="empty">
          <h2>Nothing scheduled</h2>
          <p>No habits are set for this day. Rest, or add one.</p>
        </div>
      ) : (
        <>
          <div className="section-head">
            <h2>Habits</h2>
            <span>
              {doneCount} of {scheduled.length}
            </span>
          </div>
          <ul className="habit-list">
            {scheduled.map((h) => {
              const done = isDone(h)
              const streak = habitStreak(h, cave.doneByHabit.get(h.id) ?? new Set(), today)
              const area = AREA_BY_ID[h.area]
              return (
                <li key={h.id}>
                  <button
                    className="habit"
                    aria-pressed={done}
                    style={{ '--area': area.color } as React.CSSProperties}
                    onClick={() => toggle(h)}
                  >
                    <span className="check">{done && <Check size={18} strokeWidth={3} aria-hidden />}</span>
                    <span className="habit-body">
                      <span className="habit-name">{h.name}</span>
                      <span className="habit-meta">
                        {area.name}
                        {streak > 0 && ` · ${streak} day${streak === 1 ? '' : 's'}`}
                      </span>
                    </span>
                    <span className="habit-xp">+{h.xp}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          {doneCount === scheduled.length && (
            <p className="alldone">Every habit done. That's a clean day.</p>
          )}
        </>
      )}
    </>
  )
}
