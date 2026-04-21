import { ChevronDown } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'

type CollapsibleCardProps = {
  title: ReactNode
  children: ReactNode
  /** When false (default), the body is hidden until expanded. */
  defaultOpen?: boolean
  className?: string
}

/**
 * Card with a clickable header that toggles the body. Collapsed by default.
 */
export function CollapsibleCard({
  title,
  children,
  defaultOpen = false,
  className = '',
}: CollapsibleCardProps) {
  const baseId = useId()
  const panelId = `${baseId}-panel`
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-800 bg-slate-950/50 shadow-sm ring-1 ring-slate-800/60 ${className}`.trim()}
    >
      <button
        type="button"
        id={`${baseId}-trigger`}
        className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left transition-colors hover:bg-slate-900/80"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-sm font-medium text-slate-200">{title}</span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={`${baseId}-trigger`}
        hidden={!open}
        className="border-t border-slate-800 px-4 pb-4 pt-1"
      >
        {children}
      </div>
    </div>
  )
}
