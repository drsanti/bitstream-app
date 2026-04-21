import type { ReactNode } from 'react'

export function AppWrapper({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 pb-8 pt-4">{children}</div>
  )
}
