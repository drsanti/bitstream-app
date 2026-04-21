import {
  type ConnectionStatus,
  type TopicSnapshot,
  useMqttConnection,
  useMqttTelemetry,
} from '../hooks'

function MqttConnectionSummary({
  mqttBaseTopic,
  status,
  isConnected,
  errorText,
}: {
  mqttBaseTopic: string
  status: ConnectionStatus
  isConnected: boolean
  errorText: string | null
}) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-300">
      <p className="font-medium text-slate-200">MQTT base topic</p>
      <code className="mt-1 block font-mono text-emerald-400">
        {mqttBaseTopic || '(bare topics)'}
      </code>
      <p className="mt-2 text-xs text-slate-500">
        Connection:{' '}
        <span className={isConnected ? 'text-emerald-400' : 'text-slate-400'}>
          {status}
        </span>
        {errorText ? (
          <span className="ml-2 text-red-400" role="alert">
            — {errorText}
          </span>
        ) : null}
      </p>
    </div>
  )
}


function MqttTopicSnapshotsList({
  topics,
  snapshots,
}: {
  topics: string[]
  snapshots: Record<string, TopicSnapshot | null>
}) {
  return (
    <ul className="space-y-3">
      {topics.map((topic) => {
        const snap = snapshots[topic]
        return (
          <li
            key={topic}
            className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950/60"
          >
            <div className="border-b border-slate-800 px-3 py-2 font-mono text-xs text-emerald-400">
              {topic}
            </div>
            <div className="px-3 py-2 text-[11px] text-slate-500">
              {snap ? (
                <>Last update {snap.receivedAt}</>
              ) : (
                <>No message yet — connect above and publish to this topic.</>
              )}
            </div>
            {snap ? (
              <pre className="max-h-48 overflow-auto border-t border-slate-800 bg-slate-950 p-3 font-mono text-xs leading-relaxed text-slate-300">
                {snap.payload}
              </pre>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * Example: read live MQTT snapshots from the shared Zustand store via hooks
 * (`useMqttStore` under the hood).
 */
export function Ex02GetMqttData() {
  const { status, isConnected, errorText } = useMqttConnection()
  const { snapshots, mqttBaseTopic, topics } = useMqttTelemetry()

  return (
    <div className="space-y-4">
      <MqttConnectionSummary
        mqttBaseTopic={mqttBaseTopic}
        status={status}
        isConnected={isConnected}
        errorText={errorText}
      />

      <MqttTopicSnapshotsList topics={topics} snapshots={snapshots} />
    </div>
  )
}
