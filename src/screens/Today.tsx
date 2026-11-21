import { Check, Flame, Plus, RefreshCw, TentTree } from 'lucide-react'
import { useState } from 'react'
import { AREAS, areaOf } from '../areas'
import type { Challenge } from '../challenges'
import { DayBar, formatDay } from '../components/DayBar'
import { swapChallenge, toggleChallenge, toggleHabit, type Habit } from '../db'
import { addDays, habitStreak, isScheduled } from '../logic'
import type { CaveState } from '../useCave'

interface Props {
  cave: CaveState
  today: string
  onAddHabit: () => void
  onManageHabits: () => void
}

export function Today({ cave, today, onAddHabit, onManageHabits }: Props) {
  // Lets you step back to tick off a day you forgot to log. Never forward past today.
  const [offset, setOffset] = useState(0)
  const date = addDays(today, -offset)
  const isToday = offset === 0
  const { level } = cave

  const isDone = (id: string) => cave.doneByHabit.get(id)?.has(date) ?? false
  // On a vacation day you can still check things off, but nothing earns or costs anything.
  const onVacation = cave.paused(date)

  const day = cave.days.get(date)
  const challenges = day?.challenges ?? []
  const challengesDone = challenges.filter((ch) => isDone(ch.id)).length
  const canSwap = isToday && day !== undefined && !day.swapped

  const scheduled = cave.habits.filter((h) => isScheduled(h, date))
  const habitsDone = scheduled.filter((h) => isDone(h.id)).length

  // Challenges are extra credit, so a clean day is about your habits alone.
  const cleanDay = scheduled.length > 0 && habitsDone === scheduled.length

  const tapHabit = async (h: Habit) => {
    if (await toggleHabit(h, date)) navigator.vibrate?.(15)
  }
  const tapChallenge = async (ch: Challenge) => {
    if (await toggleChallenge(ch, date)) navigator.vibrate?.(15)
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

      <DayBar date={date} offset={offset} onOffset={setOffset} />

      {onVacation && (
        <div className="vacation-banner" role="status">
          <TentTree size={22} aria-hidden />
          <div>
            <strong>{isToday ? 'Vacation mode' : 'Vacation day'}</strong>
            <p>
              {isToday && cave.vacation ? `Progress is paused through ${formatDay(cave.vacation.end)}. ` : 'Progress was paused. '}
              Check off what you can. Nothing earns XP, and nothing missed counts against you.
            </p>
          </div>
        </div>
      )}

      {challenges.length > 0 && (
        <>
          <div className="section-head">
            <h2>Challenges</h2>
            <span>
              {challengesDone} of {challenges.length}
            </span>
          </div>
          <ul className="habit-list">
            {challenges.map((ch) => {
              const done = isDone(ch.id)
              const area = areaOf(ch.area)
              return (
                <li key={ch.id} className="row" style={{ '--area': area.color } as React.CSSProperties}>
                  <button className="habit" aria-pressed={done} onClick={() => tapChallenge(ch)}>
                    <span className="check">{done && <Check size={18} strokeWidth={3} aria-hidden />}</span>
                    <span className="habit-body">
                      <span className="habit-name">{ch.text}</span>
                      <span className="habit-meta">{area.name}</span>
                    </span>
                    <span className="habit-xp">{onVacation ? '' : `+${ch.xp}`}</span>
                  </button>
                  {canSwap && !done && (
                    <button
                      className="swap"
                      aria-label={`Swap this challenge: ${ch.text}`}
                      onClick={() => swapChallenge(date, ch.id)}
                    >
                      <RefreshCw size={18} aria-hidden />
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
          {isToday && (
            <p className="hint">
              {day?.swapped ? "You've used today's swap." : 'One swap a day. Use it on the one you least want.'}
            </p>
          )}
        </>
      )}

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
          <h2>No habits scheduled</h2>
          <p>Nothing on your list is set for this day.</p>
          <button className="btn" onClick={onManageHabits}>
            Edit habits
          </button>
        </div>
      ) : (
        <>
          <div className="section-head">
            <h2>Habits</h2>
            <span>
              {habitsDone} of {scheduled.length}
              <button className="link" onClick={onManageHabits}>
                Edit habits
              </button>
            </span>
          </div>
          <ul className="habit-list">
            {scheduled.map((h) => {
              const done = isDone(h.id)
              const streak = habitStreak(h, cave.doneByHabit.get(h.id) ?? new Set(), today, cave.paused)
              const area = areaOf(h.area)
              return (
                <li key={h.id} className="row" style={{ '--area': area.color } as React.CSSProperties}>
                  <button className="habit" aria-pressed={done} onClick={() => tapHabit(h)}>
                    <span className="check">{done && <Check size={18} strokeWidth={3} aria-hidden />}</span>
                    <span className="habit-body">
                      <span className="habit-name">{h.name}</span>
                      <span className="habit-meta">
                        {area.name}
                        {streak > 0 && ` · ${streak} day${streak === 1 ? '' : 's'}`}
                      </span>
                    </span>
                    <span className="habit-xp">{onVacation ? '' : `+${h.xp}`}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {cleanDay && <p className="alldone">Every habit done. That's a clean day.</p>}
    </>
  )
}
