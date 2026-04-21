import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {children}
    </span>
  )
}
