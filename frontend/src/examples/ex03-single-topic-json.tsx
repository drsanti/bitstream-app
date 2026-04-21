import { useMemo, useState } from 'react'
import {
  useMqttConnection,
  useMqttTopicSnapshot,
  useTelemetryTopics,
} from '../hooks'

type Suffix = 'env' | 'imu' | 'mag'

function resolveTopic(topics: string[], suffix: Suffix): string {
  return (
    topics.find((t) => t === suffix || t.endsWith(`/${suffix}`)) ?? topics[0] ?? ''
  )
}

function ParsedPayload({ payload }: { payload: string }) {
  const result = useMemo(() => {
    try {
      const value = JSON.parse(payload) as unknown
      return { ok: true as const, value }
    } catch {
      return { ok: false as const, message: 'Payload is not valid JSON.' }
    }
  }, [payload])

  if (!result.ok) {
    return (
      <p className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
        {result.message}
      </p>
    )
  }

  return (
    <pre className="max-h-64 overflow-auto rounded border border-slate-800 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-300">
      {typeof result.value === 'object' && result.value !== null
        ? JSON.stringify(result.value, null, 2)
        : String(result.value)}
    </pre>
  )
}

/**
 * Example: one telemetry stream via `useMqttTopicSnapshot` (narrow store subscription),
 * optional suffix picker, and defensive JSON parsing of the payload.
 */
export function Ex03SingleTopicJson() {
  const { isConnected, status } = useMqttConnection()
  const topics = useTelemetryTopics()
  const [suffix, setSuffix] = useState<Suffix>('env')
  const fullTopic = useMemo(() => resolveTopic(topics, suffix), [topics, suffix])
  const { snapshot } = useMqttTopicSnapshot(fullTopic)

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        Uses <code className="text-emerald-400">useMqttTopicSnapshot</code> so this panel
        only tracks one MQTT topic in the store. Connection:{' '}
        <span className={isConnected ? 'text-emerald-400' : 'text-slate-500'}>{status}</span>.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Topic suffix
        </span>
        {(['env', 'imu', 'mag'] as const).map((s) => (
          <button
            key={s}
            type="button"
            className={`rounded-lg px-3 py-1.5 font-mono text-xs ${
              suffix === s
                ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
            }`}
            onClick={() => setSuffix(s)}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">
        <p className="font-mono text-xs text-emerald-400">{fullTopic || '—'}</p>
        {!fullTopic ? (
          <p className="mt-2 text-sm text-slate-500">No topics resolved from MQTT base prefix.</p>
        ) : !snapshot ? (
          <p className="mt-2 text-sm text-slate-500">
            No message yet for this topic — connect and publish telemetry.
          </p>
        ) : (
          <>
            <p className="mt-2 text-[11px] text-slate-500">Last update {snapshot.receivedAt}</p>
            <div className="mt-3">
              <ParsedPayload payload={snapshot.payload} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
