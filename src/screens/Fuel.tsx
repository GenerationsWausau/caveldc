import { useLiveQuery } from 'dexie-react-hooks'
import { ChevronRight, Minus, Plus, Target } from 'lucide-react'
import { useState } from 'react'
import { DayBar } from '../components/DayBar'
import { Sheet } from '../components/Sheet'
import {
  addMeal,
  addWater,
  db,
  deleteMeal,
  getTargets,
  saveTargets,
  updateMeal,
  type Meal,
  type MealDraft,
  type Targets,
} from '../db'
import { addDays } from '../logic'

/** Reads an optional whole number from a text field. Empty is fine; anything else must be 0 or more. */
function parseOptional(text: string): number | undefined | 'invalid' {
  const trimmed = text.trim()
  if (!trimmed) return undefined
  if (!/^\d+$/.test(trimmed)) return 'invalid'
  return Number(trimmed)
}

export function Fuel({ today }: { today: string }) {
  const [offset, setOffset] = useState(0)
  const date = addDays(today, -offset)
  const [editing, setEditing] = useState<Meal | 'new' | null>(null)
  const [editingTargets, setEditingTargets] = useState(false)

  const meals = useLiveQuery(() => db.meals.where('date').equals(date).sortBy('at'), [date]) ?? []
  const water = useLiveQuery(() => db.fuel.get(date).then((f) => f?.water ?? 0), [date]) ?? 0
  const targets = useLiveQuery(getTargets, []) ?? {}
  // Names you've logged before, most recent first, to save retyping the usual meals.
  const recent = useLiveQuery(async () => {
    const all = await db.meals.toArray()
    const byName = new Map<string, Meal>()
    for (const m of all.sort((a, b) => b.at - a.at)) {
      if (!byName.has(m.name.toLowerCase())) byName.set(m.name.toLowerCase(), m)
    }
    return [...byName.values()].slice(0, 6)
  }, [])

  const calories = meals.reduce((sum, m) => sum + (m.calories ?? 0), 0)
  const protein = meals.reduce((sum, m) => sum + (m.protein ?? 0), 0)

  return (
    <>
      <header className="page-head">
        <h1>Fuel</h1>
        <button className="btn btn-small" onClick={() => setEditingTargets(true)}>
          <Target size={16} aria-hidden /> Targets
        </button>
      </header>
      <DayBar date={date} offset={offset} onOffset={setOffset} />

      <section className="card totals">
        <Meter label="Calories" value={calories} target={targets.calories} />
        <Meter label="Protein" value={protein} target={targets.protein} unit="g" />
        <div className="water">
          <Meter label="Water" value={water} target={targets.water} unit=" oz" />
          <div className="stepper">
            <button className="btn" aria-label="Remove 8 ounces" disabled={water === 0} onClick={() => addWater(date, -8)}>
              <Minus size={18} aria-hidden />
            </button>
            <button className="btn btn-primary" onClick={() => addWater(date, 8)}>
              <Plus size={18} aria-hidden /> 8 oz
            </button>
            <button className="btn btn-primary" onClick={() => addWater(date, 16)}>
              <Plus size={18} aria-hidden /> 16 oz
            </button>
          </div>
        </div>
      </section>

      <div className="section-head">
        <h2>Meals</h2>
        <span>{meals.length > 0 && `${meals.length} logged`}</span>
      </div>
      {meals.length > 0 && (
        <ul className="habit-list">
          {meals.map((m) => (
            <li key={m.id}>
              <button className="habit meal" onClick={() => setEditing(m)}>
                <span className="habit-body">
                  <span className="habit-name">{m.name}</span>
                  <span className="habit-meta">{mealDetail(m)}</span>
                </span>
                <ChevronRight size={18} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="btn btn-block add-meal" onClick={() => setEditing('new')}>
        <Plus size={18} aria-hidden /> Log a meal
      </button>

      {editing && (
        <MealForm
          meal={editing === 'new' ? null : editing}
          date={date}
          recent={editing === 'new' ? (recent ?? []) : []}
          onClose={() => setEditing(null)}
        />
      )}
      {editingTargets && <TargetsForm targets={targets} onClose={() => setEditingTargets(false)} />}
    </>
  )
}

function mealDetail(m: Meal) {
  const parts = []
  if (m.calories !== undefined) parts.push(`${m.calories} cal`)
  if (m.protein !== undefined) parts.push(`${m.protein}g protein`)
  return parts.join(' · ') || 'No numbers'
}

function Meter({ label, value, target, unit = '' }: { label: string; value: number; target?: number; unit?: string }) {
  return (
    <div>
      <div className="meter-top">
        <span className="meter-label">{label}</span>
        <span className="meter-value">
          {value.toLocaleString()}
          {unit}
          {target ? ` / ${target.toLocaleString()}${unit}` : ''}
        </span>
      </div>
      {target ? (
        <div className="bar">
          <div className="bar-fill meter-fill" style={{ width: `${Math.min(100, (value / target) * 100)}%` }} />
        </div>
      ) : null}
    </div>
  )
}

function MealForm({ meal, date, recent, onClose }: { meal: Meal | null; date: string; recent: Meal[]; onClose: () => void }) {
  const [name, setName] = useState(meal?.name ?? '')
  const [calories, setCalories] = useState(meal?.calories?.toString() ?? '')
  const [protein, setProtein] = useState(meal?.protein?.toString() ?? '')
  const [error, setError] = useState('')

  const save = async () => {
    const cal = parseOptional(calories)
    const pro = parseOptional(protein)
    if (!name.trim()) return setError('Say what you ate.')
    if (cal === 'invalid' || pro === 'invalid') return setError('Use whole numbers for calories and protein.')
    const draft: MealDraft = { name: name.trim(), calories: cal, protein: pro }
    if (meal) await updateMeal(meal.id, draft)
    else await addMeal(date, draft)
    onClose()
  }

  const fill = (m: Meal) => {
    setName(m.name)
    setCalories(m.calories?.toString() ?? '')
    setProtein(m.protein?.toString() ?? '')
    setError('')
  }

  return (
    <Sheet title={meal ? 'Edit meal' : 'Log a meal'} onClose={onClose} onSubmit={save}>
      {recent.length > 0 && (
        <fieldset className="field">
          <legend>Log again</legend>
          <div className="chips">
            {recent.map((m) => (
              <button type="button" key={m.id} className="chip" onClick={() => fill(m)}>
                {m.name}
              </button>
            ))}
          </div>
        </fieldset>
      )}
      <label className="field">
        <span>What you ate</span>
        <input
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setError('')
          }}
          placeholder="Eggs and toast"
          maxLength={80}
          autoFocus={!meal}
        />
      </label>
      <div className="field-row">
        <label className="field">
          <span>Calories (optional)</span>
          <input
            value={calories}
            onChange={(e) => {
              setCalories(e.target.value)
              setError('')
            }}
            inputMode="numeric"
            placeholder="450"
          />
        </label>
        <label className="field">
          <span>Protein, g (optional)</span>
          <input
            value={protein}
            onChange={(e) => {
              setProtein(e.target.value)
              setError('')
            }}
            inputMode="numeric"
            placeholder="30"
          />
        </label>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-block">
        {meal ? 'Save changes' : 'Log meal'}
      </button>
      {meal && (
        <button
          type="button"
          className="btn btn-quiet btn-block"
          onClick={async () => {
            await deleteMeal(meal.id)
            onClose()
          }}
        >
          Delete meal
        </button>
      )}
    </Sheet>
  )
}

function TargetsForm({ targets, onClose }: { targets: Targets; onClose: () => void }) {
  const [calories, setCalories] = useState(targets.calories?.toString() ?? '')
  const [protein, setProtein] = useState(targets.protein?.toString() ?? '')
  const [water, setWaterTarget] = useState(targets.water?.toString() ?? '')
  const [error, setError] = useState('')

  const save = async () => {
    const parsed = [parseOptional(calories), parseOptional(protein), parseOptional(water)]
    if (parsed.includes('invalid')) return setError('Use whole numbers, or leave a target empty.')
    const [cal, pro, wat] = parsed as (number | undefined)[]
    await saveTargets({ calories: cal || undefined, protein: pro || undefined, water: wat || undefined })
    onClose()
  }

  const field = (label: string, value: string, set: (v: string) => void, placeholder: string) => (
    <label className="field">
      <span>{label}</span>
      <input
        value={value}
        onChange={(e) => {
          set(e.target.value)
          setError('')
        }}
        inputMode="numeric"
        placeholder={placeholder}
      />
    </label>
  )

  return (
    <Sheet title="Daily targets" onClose={onClose} onSubmit={save}>
      <p className="sheet-note">Set the numbers you're aiming for each day. Water is in ounces. Leave any of them empty to skip it.</p>
      {field('Calories', calories, setCalories, '2200')}
      {field('Protein, grams', protein, setProtein, '160')}
      {field('Water, ounces', water, setWaterTarget, '64')}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary btn-block">
        Save targets
      </button>
    </Sheet>
  )
}
