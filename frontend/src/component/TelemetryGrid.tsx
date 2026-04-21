import { useEffect } from 'react'
import { TelemetryCard } from './TelemetryCard'
import { useMqttCardMenu, useTelemetryTopics } from '../hooks'

export function TelemetryGrid() {
  const topics = useTelemetryTopics()
  const { openCardMenuTopic, setOpenCardMenuTopic } = useMqttCardMenu()

  useEffect(() => {
    if (openCardMenuTopic === null) return
    const onDown = (e: MouseEvent) => {
      const root = document.querySelector(
        `[data-card-menu="${openCardMenuTopic.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`,
      )
      if (root && !root.contains(e.target as Node)) {
        setOpenCardMenuTopic(null)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenCardMenuTopic(null)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [openCardMenuTopic, setOpenCardMenuTopic])

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {topics.map((topic) => (
        <TelemetryCard key={topic} topic={topic} />
      ))}
    </div>
  )
}
