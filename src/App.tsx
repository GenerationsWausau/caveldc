import { BarChart3, Flame, NotebookPen, Settings as SettingsIcon, Utensils } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ensureDay, requestPersistence } from './db'
import { todayKey } from './logic'
import { Fuel } from './screens/Fuel'
import { Habits } from './screens/Habits'
import { Journal } from './screens/Journal'
import { Progress } from './screens/Progress'
import { Settings } from './screens/Settings'
import { Today } from './screens/Today'
import { useCave } from './useCave'

// 'habits' is a screen reached from Today or Settings, not a tab of its own.
type Tab = 'today' | 'progress' | 'journal' | 'fuel' | 'settings' | 'habits'

const TABS: { id: Tab; label: string; icon: typeof Flame }[] = [
  { id: 'today', label: 'Today', icon: Flame },
  { id: 'progress', label: 'Progress', icon: BarChart3 },
  { id: 'journal', label: 'Journal', icon: NotebookPen },
  { id: 'fuel', label: 'Fuel', icon: Utensils },
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

  // Each screen starts at its top rather than wherever the last one was scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [tab])

  // Deal today's challenges the first time the app is opened each day.
  useEffect(() => {
    void ensureDay(today)
  }, [today])

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
            }} onManageHabits={() => {
              setStartNewHabit(false)
              setTab('habits')
            }} />}
        {tab === 'progress' && <Progress cave={cave} today={today} />}
        {tab === 'journal' && <Journal today={today} />}
        {tab === 'fuel' && <Fuel today={today} />}
        {tab === 'habits' && <Habits cave={cave} startNew={startNewHabit} onBack={() => setTab('today')} />}
        {tab === 'settings' && <Settings onManageHabits={() => setTab('habits')} />}
      </main>

      <nav className="tabs" aria-label="Main">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className="tab"
            aria-current={tab === id || (tab === 'habits' && id === 'today') ? 'page' : undefined}
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
