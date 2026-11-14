import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { useState } from 'react'
import { AREAS } from '../areas'
import { HabitForm } from '../components/HabitForm'
import type { Habit } from '../db'
import type { CaveState } from '../useCave'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function scheduleLabel(days: number[]) {
  if (days.length === 7) return 'Every day'
  const sorted = [...days].sort()
  if (sorted.join() === '1,2,3,4,5') return 'Weekdays'
  if (sorted.join() === '0,6') return 'Weekends'
  return sorted.map((d) => DAY_NAMES[d]).join(', ')
}

export function Habits({ cave, startNew, onBack }: { cave: CaveState; startNew?: boolean; onBack: () => void }) {
  const [editing, setEditing] = useState<Habit | 'new' | null>(startNew ? 'new' : null)

  return (
    <>
      <button className="link back" onClick={onBack}>
        <ChevronLeft size={18} aria-hidden /> Today
      </button>
      <header className="page-head">
        <h1>Habits</h1>
        <button className="btn btn-primary btn-small" onClick={() => setEditing('new')}>
          <Plus size={16} aria-hidden /> Add habit
        </button>
      </header>

      {cave.habits.length === 0 ? (
        <div className="empty">
          <h2>Choose what you'll be held to</h2>
          <p>Start with one or two you'll actually keep. You can add more as they stick.</p>
        </div>
      ) : (
        AREAS.map((a) => {
          const list = cave.habits.filter((h) => h.area === a.id)
          if (list.length === 0) return null
          return (
            <section key={a.id} style={{ '--area': a.color } as React.CSSProperties}>
              <div className="section-head">
                <h2 className="area-title">{a.name}</h2>
              </div>
              <ul className="habit-list">
                {list.map((h) => (
                  <li key={h.id}>
                    <button className="habit habit-edit" onClick={() => setEditing(h)}>
                      <span className="habit-body">
                        <span className="habit-name">{h.name}</span>
                        <span className="habit-meta">
                          {scheduleLabel(h.days)} · {h.xp} XP
                        </span>
                      </span>
                      <ChevronRight size={18} aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}

      {editing && (
        <HabitForm habit={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />
      )}
    </>
  )
}
