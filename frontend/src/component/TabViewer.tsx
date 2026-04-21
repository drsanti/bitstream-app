import type { ComponentType } from 'react'
import { useId, useState } from 'react'
import { Play, Square } from 'lucide-react'
import { useMqttConnection } from '../hooks'
import { canConnectMqtt } from '../store/mqttStore'

/** One tab: label in the tab strip + component to render in the panel. */
export type TabViewerItem = {
  title: string
  app: ComponentType
}

type TabViewerProps = {
  tabs: TabViewerItem[]
  /** Index into `tabs`; defaults to 0 */
  defaultTab?: number
}

/**
 * Accessible tab strip + single visible panel. Renders `tabs[i].app` for the active tab.
 */
export function TabViewer({ tabs, defaultTab = 0 }: TabViewerProps) {
  const { mqttBaseTopic, mqttClientId, status, connect, disconnect } =
    useMqttConnection()
  const connected = status === 'connected'
  const connecting = status === 'connecting'
  const fieldsReady = canConnectMqtt(mqttBaseTopic, mqttClientId)
  const baseId = useId()
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.min(Math.max(0, defaultTab), Math.max(0, tabs.length - 1)),
  )

  if (tabs.length === 0) {
    return null
  }

  const safeIndex = Math.min(activeIndex, tabs.length - 1)
  const active = tabs[safeIndex]
  const panelId = `${baseId}-panel`
  const activeTabId = `${baseId}-tab-${safeIndex}`
  const ActiveApp = active.app

  return (
    <section aria-label="Tab viewer">
      <div className="flex items-center gap-2 border-b border-slate-800">
        <div role="tablist" className="flex flex-wrap gap-1">
          {tabs.map((tab, i) => {
            const selected = safeIndex === i
            const tabId = `${baseId}-tab-${i}`
            return (
              <button
                key={`${tab.title}-${i}`}
                id={tabId}
                type="button"
                role="tab"
                aria-selected={selected}
                aria-controls={panelId}
                tabIndex={selected ? 0 : -1}
                className={`relative -mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
                  selected
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-200'
                }`}
                onClick={() => setActiveIndex(i)}
              >
                {tab.title}
              </button>
            )
          })}
        </div>
        <div className="ml-auto flex items-center gap-2 pb-1">
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={connect}
            disabled={connecting || connected || !fieldsReady}
            aria-label={connecting ? 'Connecting to MQTT broker' : 'Connect to MQTT broker'}
            title={
              fieldsReady
                ? 'Connect to MQTT broker'
                : 'MQTT base topic and Client ID are required before connect'
            }
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-red-700/70 bg-red-900/40 text-red-300 transition hover:bg-red-800/60 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={disconnect}
            disabled={!connected && !connecting}
            aria-label="Disconnect from MQTT broker"
            title="Disconnect from MQTT broker"
          >
            <Square className="h-3.5 w-3.5" aria-hidden />
          </button>
        </div>
      </div>

      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={activeTabId}
        className="pt-6"
      >
        <ActiveApp />
      </div>
    </section>
  )
}
