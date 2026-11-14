import { BarChart3, Flame, ListChecks, Settings as SettingsIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { requestPersistence } from './db'
import { todayKey } from './logic'
import { Habits } from './screens/Habits'
import { Progress } from './screens/Progress'
import { Settings } from './screens/Settings'
import { Today } from './screens/Today'
import { useCave } from './useCave'

type Tab = 'today' | 'progress' | 'habits' | 'settings'

const TABS: { id: Tab; label: string; icon: typeof Flame }[] = [
  { id: 'today', label: 'Today', icon: Flame },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'habits', label: 'Habits', icon: ListChecks },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
]

/** Today's date, refreshed when the app comes back to the front (so midnight rolls over). */
function useToday() {
  const [today, setToday] = useState(todayKey)
  useEffect(() => {
    const refresh = () => setToday(todayKey())
    document.addEventListener('visibilitychange', refresh)
    const timer = setInterval(refresh, 60_000)
    return () => {
      document.removeEventListener('visibilitychange', refresh)
      clearInterval(timer)
    }
  }, [])
  return today
}

export default function App() {
  const [tab, setTab] = useState<Tab>('today')
  const [startNewHabit, setStartNewHabit] = useState(false)
  const today = useToday()
  const cave = useCave(today)
  const [levelUp, setLevelUp] = useState<number | null>(null)
  const lastLevel = useRef<number | null>(null)

  useEffect(() => {
    void requestPersistence()
  }, [])

  useEffect(() => {
    if (!cave.ready) return
    const prev = lastLevel.current
    lastLevel.current = cave.level.level
    if (prev !== null && cave.level.level > prev) {
      setLevelUp(cave.level.level)
      navigator.vibrate?.([40, 60, 120])
    }
  }, [cave.ready, cave.level.level])

  if (!cave.ready) return <div className="app" />

  return (
    <div className="app">
      <main className="screen">
        {tab === 'today' && <Today cave={cave} today={today} onAddHabit={() => {
              setStartNewHabit(true)
              setTab('habits')
            }} />}
        {tab === 'progress' && <Progress cave={cave} today={today} />}
        {tab === 'habits' && <Habits cave={cave} startNew={startNewHabit} />}
        {tab === 'settings' && <Settings />}
      </main>

      <nav className="tabs" aria-label="Main">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className="tab"
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => {
              setStartNewHabit(false)
              setTab(id)
            }}
          >
            <Icon size={22} aria-hidden />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {levelUp !== null && (
        <div className="levelup" role="dialog" aria-label="Level up" onClick={() => setLevelUp(null)}>
          <p className="levelup-kicker">Level up</p>
          <p className="levelup-num">{levelUp}</p>
          <p className="levelup-rank">{cave.level.rank}</p>
          <button className="btn btn-primary">Keep going</button>
        </div>
      )}
    </div>
  )
}
