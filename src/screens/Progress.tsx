import { AREAS } from '../areas'
import { addDays, dayCompletion, parseKey } from '../logic'
import type { CaveState } from '../useCave'

const WEEKS = 8
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

export function Progress({ cave, today }: { cave: CaveState; today: string }) {
  const { level } = cave

  // Calendar grid: full weeks ending with the current week, oldest first.
  const endOfWeek = addDays(today, 6 - parseKey(today).getDay())
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => {
    const key = addDays(endOfWeek, i - (WEEKS * 7 - 1))
    const future = key > today
    return { key, future, ratio: future ? null : dayCompletion(cave.allHabits, cave.doneByHabit, key) }
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
        <h2>Growth areas</h2>
        <span>Last 30 days</span>
      </div>
      <ul className="area-list">
        {AREAS.map((a) => {
          const score = cave.scores[a.id]
          return (
            <li key={a.id} className="area-row" style={{ '--area': a.color } as React.CSSProperties}>
              <div className="area-row-top">
                <span className="area-name">{a.name}</span>
                <span className="area-score">{score === null ? 'No habits yet' : score}</span>
              </div>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${score ?? 0}%` }} />
              </div>
              <span className="area-xp">{cave.xpByArea[a.id].toLocaleString()} XP earned</span>
            </li>
          )
        })}
      </ul>
      <p className="hint">
        A score is the share of what you committed to that you actually did. Miss days and it drops.
      </p>

      <div className="section-head">
        <h2>Last {WEEKS} weeks</h2>
        <span>
          {cleanDays} clean day{cleanDays === 1 ? '' : 's'}
        </span>
      </div>
      <div className="heat" role="img" aria-label={`Daily completion for the last ${WEEKS} weeks`}>
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
