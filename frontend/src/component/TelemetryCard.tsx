import { createElement } from 'react'
import { Braces, ChevronDown, Circle, Clock, Menu } from 'lucide-react'
import JSONViewer from './JSONViewer'
import { FieldLabel } from './FieldLabel'
import {
  JSON_VIEWER_THEME_LABELS,
  JSON_VIEWER_THEME_OPTIONS,
  type JSONViewerThemeName,
} from './jsonViewerTheme'
import { getTopicPanelIcon, useMqttTelemetryCard } from '../hooks'

type Props = { topic: string }

export function TelemetryCard({ topic }: Props) {
  const {
    snapshot,
    jsonTheme,
    menuOpen,
    toggleCardMenu,
    setJsonViewerTheme,
  } = useMqttTelemetryCard(topic)

  return (
    <section
      className={`relative flex flex-col overflow-visible rounded-xl border border-slate-800 bg-slate-900/50 shadow-lg shadow-black/20 ${
        menuOpen ? 'z-40' : 'z-0'
      }`}
    >
      <h2 className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-3 font-mono text-sm font-medium text-emerald-400">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
            {createElement(getTopicPanelIcon(topic), {
              className: 'h-4 w-4',
              'aria-hidden': true,
            })}
          </span>
          <span className="truncate">{topic}</span>
        </div>
        <div className="relative shrink-0" data-card-menu={topic}>
          <button
            type="button"
            className="rounded-lg p-1.5 text-slate-400 outline-none hover:bg-slate-800 hover:text-white focus-visible:ring-2 focus-visible:ring-emerald-500/50"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={`Panel menu for ${topic}`}
            onClick={() => toggleCardMenu(topic)}
          >
            <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 top-full z-100 mt-1 w-[min(calc(100vw-2rem),16rem)] rounded-lg border border-slate-700 bg-slate-900 p-3 shadow-xl ring-1 ring-black/40"
            >
              <div className="mb-2">
                <FieldLabel icon={Braces}>JSON theme</FieldLabel>
              </div>
              <div className="relative">
                <Braces
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden
                />
                <select
                  className="w-full cursor-pointer appearance-none rounded-lg border border-slate-700 bg-slate-950 py-2 pl-10 pr-10 text-sm text-white outline-none ring-emerald-500/50 focus:ring-2"
                  value={jsonTheme}
                  onChange={(e) => {
                    const next = e.target.value as JSONViewerThemeName
                    setJsonViewerTheme(topic, next)
                  }}
                  aria-label={`JSON viewer color theme for ${topic}`}
                >
                  {JSON_VIEWER_THEME_OPTIONS.map((id) => (
                    <option key={id} value={id}>
                      {JSON_VIEWER_THEME_LABELS[id]}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  aria-hidden
                />
              </div>
            </div>
          ) : null}
        </div>
      </h2>
      <div className="flex min-h-48 flex-1 flex-col overflow-auto rounded-b-xl p-3">
        {snapshot == null ? (
          <span className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
            <Circle className="h-3 w-3 text-slate-600" aria-hidden />
            Waiting for data…
          </span>
        ) : (
          <>
            <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
              <Clock className="h-3 w-3 shrink-0 text-slate-600" aria-hidden />
              Last update {snapshot.receivedAt}
            </div>
            <JSONViewer
              value={snapshot.payload}
              theme={jsonTheme}
              maxHeight="min(50vh, 420px)"
              collapsed={2}
            />
          </>
        )}
      </div>
    </section>
  )
}
