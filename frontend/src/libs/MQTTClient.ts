import mqtt, { type MqttClient } from 'mqtt'

/** Truncate very large payloads in the browser UI (same behavior as the dashboard store). */
const MAX_PAYLOAD_PREVIEW_BYTES = 4096

let clientRef: MqttClient | null = null

/** End the current WebSocket MQTT session and clear the active client handle. */
export function disconnectBrowserMqtt(): void {
  clientRef?.end(true)
  clientRef = null
}

export type MqttTelemetryPayload = { text: string; receivedAt: string }

export type BrowserMqttConnectOptions = {
  wsUrl: string
  /** MQTT CONNECT client id; if empty, a random `web-…` id is used. */
  clientId?: string
  subscribeTopics: string[]
  onMessage: (topic: string, payload: MqttTelemetryPayload) => void
  onSubscribeError?: (err: Error) => void
  onConnect?: () => void
  onError?: (message: string) => void
  /** Fired when the socket closes while this instance is still the active client (e.g. broker went away). */
  onClose?: () => void
}

/**
 * Connect over WebSockets (`mqtt.js` + `wsUrl`), subscribe to the given topics, and forward messages.
 * Call {@link disconnectBrowserMqtt} to tear down. Only one active session is tracked at a time.
 */
export function connectBrowserMqtt(options: BrowserMqttConnectOptions): void {
  disconnectBrowserMqtt()

  const {
    wsUrl,
    clientId: clientIdOpt,
    subscribeTopics,
    onMessage,
    onSubscribeError,
    onConnect,
    onError,
    onClose,
  } = options

  const id =
    clientIdOpt?.trim() ||
    `web-${Math.random().toString(16).slice(2, 10)}`
  const client = mqtt.connect(wsUrl, {
    clientId: id,
    clean: true,
    reconnectPeriod: 0,
  })
  clientRef = client

  client.on('connect', () => {
    onConnect?.()
    subscribeTopics.forEach((topic) => {
      client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) onSubscribeError?.(err)
      })
    })
  })

  client.on('message', (topic, payload) => {
    const text =
      payload.byteLength > MAX_PAYLOAD_PREVIEW_BYTES
        ? `${payload.subarray(0, MAX_PAYLOAD_PREVIEW_BYTES).toString()}…`
        : payload.toString()
    const receivedAt = new Date().toISOString().slice(11, 23)
    onMessage(topic, { text, receivedAt })
  })

  client.on('error', (err) => {
    onError?.(err.message)
  })

  client.on('close', () => {
    if (clientRef === client) {
      onClose?.()
    }
  })
}
