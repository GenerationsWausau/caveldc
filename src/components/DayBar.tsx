import { ChevronLeft, ChevronRight } from 'lucide-react'
import { parseKey } from '../logic'

const DAY_FMT = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' })

export function formatDay(key: string) {
  return DAY_FMT.format(parseKey(key))
}

interface Props {
  date: string
  /** How many days back from today we're looking. 0 is today; it never goes forward past it. */
  offset: number
  onOffset: (offset: number) => void
}

export function DayBar({ date, offset, onOffset }: Props) {
  return (
    <div className="daybar">
      <button className="icon-btn" aria-label="Previous day" onClick={() => onOffset(offset + 1)}>
        <ChevronLeft size={20} aria-hidden />
      </button>
      <div className="daybar-label">
        <strong>{offset === 0 ? 'Today' : offset === 1 ? 'Yesterday' : formatDay(date)}</strong>
        {offset === 0 && <span>{formatDay(date)}</span>}
      </div>
      <button className="icon-btn" aria-label="Next day" disabled={offset === 0} onClick={() => onOffset(offset - 1)}>
        <ChevronRight size={20} aria-hidden />
      </button>
    </div>
  )
}
