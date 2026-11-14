import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  title: string
  onClose: () => void
  onSubmit: () => void
  children: ReactNode
}

/** A form that slides up from the bottom of the screen. */
export function Sheet({ title, onClose, onSubmit, children }: Props) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <form
        className="sheet"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          onSubmit()
        }}
      >
        <div className="sheet-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
            <X size={20} aria-hidden />
          </button>
        </div>
        {children}
      </form>
    </div>
  )
}
