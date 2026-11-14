import { useState } from 'react'
import { AREAS } from '../areas'
import {
  addDays,
  bestStreak,
  dayCompletion,
  habitRate,
  habitStreak,
  parseKey,
  scoreTrend,
  weeklyXp,
} from '../logic'
import type { CaveState } from '../useCave'

const CALENDAR_WEEKS = 8
const XP_WEEKS = 12
const TREND_WEEKS = 8
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const SHORT_DATE = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const NO_DATES: Set<string> = new Set()

export function Progress({ cave, today }: { cave: CaveState; today: string }) {
  const { level } = cave

  const weeks = weeklyXp(cave.entries, today, XP_WEEKS)
  const maxXp = Math.max(1, ...weeks.map((w) => w.xp))
  const [pickedWeek, setPickedWeek] = useState(XP_WEEKS - 1)
  const picked = weeks[pickedWeek]

  // Calendar grid: full weeks ending with the current week, oldest first.
  const endOfWeek = addDays(today, 6 - parseKey(today).getDay())
  const cells = Array.from({ length: CALENDAR_WEEKS * 7 }, (_, i) => {
    const key = addDays(endOfWeek, i - (CALENDAR_WEEKS * 7 - 1))
    const future = key > today
    return { key, future, ratio: future ? null : dayCompletion(cave.allHabits, cave.doneByHabit, key, cave.days) }
  })
  const cleanDays = cells.filter((c) => c.ratio === 1).length

  return (
    <>
      <header className="page-head">
        <h1>Progress</h1>
      </header>

      <section className="stats">
        <div className="stat">
          <span className="stat-num">{level.level}</span>
          <span className="stat-label">Level</span>
        </div>
        <div className="stat">
          <span className="stat-num">{cave.totalXp.toLocaleString()}</span>
          <span className="stat-label">Total XP</span>
        </div>
        <div className="stat">
          <span className="stat-num">{cave.streak}</span>
          <span className="stat-label">Day streak</span>
        </div>
      </section>

      <div className="section-head">
        <h2>XP by week</h2>
        <span>
          {SHORT_DATE.format(parseKey(picked.start))} – {SHORT_DATE.format(parseKey(picked.end))}
        </span>
      </div>
      <div className="card">
        <p className="chart-value">
          {picked.xp.toLocaleString()} <small>XP{pickedWeek === XP_WEEKS - 1 ? ' so far this week' : ''}</small>
        </p>
        <div className="xp-chart" role="group" aria-label={`XP earned in each of the last ${XP_WEEKS} weeks`}>
          {weeks.map((w, i) => (
            <button
              key={w.start}
              className="xp-col"
              aria-pressed={i === pickedWeek}
              aria-label={`Week of ${SHORT_DATE.format(parseKey(w.start))}: ${w.xp} XP`}
              onClick={() => setPickedWeek(i)}
            >
              <span className="xp-bar" style={{ height: `${(w.xp / maxXp) * 100}%` }} />
            </button>
          ))}
        </div>
        <div className="chart-axis">
          <span>{SHORT_DATE.format(parseKey(weeks[0].start))}</span>
          <span>This week</span>
        </div>
      </div>

      <div className="section-head">
        <h2>Growth areas</h2>
        <span>Score now · {TREND_WEEKS}-week trend</span>
      </div>
      <ul className="area-list">
        {AREAS.map((a) => {
          const score = cave.scores[a.id]
          const trend = scoreTrend(a.id, cave.allHabits, cave.doneByHabit, today, cave.days, TREND_WEEKS)
          return (
            <li key={a.id} className="area-row" style={{ '--area': a.color } as React.CSSProperties}>
              <div className="area-row-top">
                <span className="area-name">
                  <span className="dot" aria-hidden />
                  {a.name}
                </span>
                <Sparkline values={trend} label={`${a.name} score over the last ${TREND_WEEKS} weeks`} />
                <span className="area-score">{score === null ? '–' : score}</span>
              </div>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${score ?? 0}%` }} />
              </div>
              <span className="area-xp">
                {score === null ? 'Nothing asked of you here yet' : `${cave.xpByArea[a.id].toLocaleString()} XP earned`}
              </span>
            </li>
          )
        })}
      </ul>
      <p className="hint">
        A score is the share of your habits and challenges in that area that you actually did over the last
        30 days. Miss days and it drops.
      </p>

      {cave.habits.length > 0 && (
        <>
          <div className="section-head">
            <h2>Habits</h2>
            <span>Last 30 days</span>
          </div>
          <div className="card table-card">
            <table className="habit-table">
              <thead>
                <tr>
                  <th scope="col">Habit</th>
                  <th scope="col">Done</th>
                  <th scope="col">Streak</th>
                  <th scope="col">Best</th>
                </tr>
              </thead>
              <tbody>
                {cave.habits.map((h) => {
                  const done = cave.doneByHabit.get(h.id) ?? NO_DATES
                  const rate = habitRate(h, done, today)
                  return (
                    <tr key={h.id}>
                      <th scope="row">{h.name}</th>
                      <td>{rate === null ? '–' : `${rate}%`}</td>
                      <td>{habitStreak(h, done, today)}</td>
                      <td>{bestStreak(h, done, today)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="section-head">
        <h2>Last {CALENDAR_WEEKS} weeks</h2>
        <span>
          {cleanDays} clean day{cleanDays === 1 ? '' : 's'}
        </span>
      </div>
      <div className="heat" role="img" aria-label={`Daily completion for the last ${CALENDAR_WEEKS} weeks`}>
        {WEEKDAYS.map((d, i) => (
          <span key={i} className="heat-head">
            {d}
          </span>
        ))}
        {cells.map((c) => (
          <span
            key={c.key}
            className={`heat-cell${c.key === today ? ' is-today' : ''}${c.future ? ' is-future' : ''}`}
            style={c.ratio ? { background: `rgba(224, 154, 53, ${0.2 + c.ratio * 0.8})` } : undefined}
          />
        ))}
      </div>
    </>
  )
}

const SPARK_W = 84
const SPARK_H = 24
const SPARK_PAD = 3

/** A small trend line, 0-100 on a fixed scale so the five areas compare honestly. */
function Sparkline({ values, label }: { values: (number | null)[]; label: string }) {
  const points = values
    .map((v, i) =>
      v === null
        ? null
        : {
            x: SPARK_PAD + (i / (values.length - 1)) * (SPARK_W - SPARK_PAD * 2),
            y: SPARK_PAD + (1 - v / 100) * (SPARK_H - SPARK_PAD * 2),
          },
    )
    .filter((p) => p !== null)
  if (points.length < 2) return <span className="spark-empty" />
  const last = points[points.length - 1]
  return (
    <svg className="spark" width={SPARK_W} height={SPARK_H} viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} role="img" aria-label={label}>
      <polyline points={points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} />
      <circle cx={last.x} cy={last.y} r="3" />
    </svg>
  )
}
