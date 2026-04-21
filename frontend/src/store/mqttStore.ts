import type { LucideIcon } from 'lucide-react'
import { Activity, Compass, Radio, Thermometer } from 'lucide-react'
import { create } from 'zustand'
import {
  connectBrowserMqtt,
  disconnectBrowserMqtt,
} from '../libs/MQTTClient'
import {
  getInitialJsonViewerTheme,
  type JSONViewerThemeName,
} from '../component/jsonViewerTheme'

/** Suffixes; full MQTT topic = `<MQTT_BASE_TOPIC>/<suffix>` when a prefix is set (matches `mqtt_client_config.h`). */
const TOPIC_SUFFIXES = ['env', 'imu', 'mag'] as const

export function normalizeMqttBaseTopic(s: string): string {
  return s.trim().replace(/^\/+|\/+$/g, '')
}

export function telemetryTopics(prefix: string): string[] {
  const base = normalizeMqttBaseTopic(prefix)
  if (!base) return [...TOPIC_SUFFIXES]
  return TOPIC_SUFFIXES.map((s) => `${base}/${s}`)
}

/** Both fields must be non-empty (after trim / base-topic normalization) before connecting. */
export function canConnectMqtt(baseTopic: string, clientId: string): boolean {
  return normalizeMqttBaseTopic(baseTopic) !== '' && clientId.trim() !== ''
}

export function topicThemeDefaults(prefix: string): Record<string, JSONViewerThemeName> {
  const initial = getInitialJsonViewerTheme()
  return Object.fromEntries(
    telemetryTopics(prefix).map((t) => [t, initial]),
  )
}

export type TopicSnapshot = { payload: string; receivedAt: string }

function topicTail(topic: string): string {
  const i = topic.lastIndexOf('/')
  return i >= 0 ? topic.slice(i + 1) : topic
}

export function getTopicPanelIcon(topic: string): LucideIcon {
  switch (topicTail(topic)) {
    case 'env':
      return Thermometer
    case 'imu':
      return Activity
    case 'mag':
      return Compass
    default:
      return Radio
  }
}

function snapshotMapForPrefix(prefix: string): Record<string, TopicSnapshot | null> {
  return Object.fromEntries(telemetryTopics(prefix).map((t) => [t, null]))
}

const initialMqttBaseTopic =
  import.meta.env.VITE_MQTT_BASE_TOPIC?.trim() ?? 'tesaiot/sensors'

const initialMqttClientId = import.meta.env.VITE_MQTT_CLIENT_ID?.trim() ?? ''

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error'

type MqttStoreState = {
  wsUrl: string
  mqttBaseTopic: string
  /** MQTT CONNECT client id (browser); must be non-empty to connect (set manually or via Bitstream preload). */
  mqttClientId: string
  status: ConnectionStatus
  errorText: string | null
  snapshots: Record<string, TopicSnapshot | null>
  jsonViewerThemesByTopic: Record<string, JSONViewerThemeName>
  openCardMenuTopic: string | null
}

type MqttStoreActions = {
  setWsUrl: (v: string) => void
  setMqttBaseTopic: (v: string) => void
  setMqttClientId: (v: string) => void
  setOpenCardMenuTopic: (v: string | null) => void
  toggleCardMenu: (topic: string) => void
  setJsonViewerTheme: (topic: string, theme: JSONViewerThemeName) => void
  connect: () => void
  disconnect: () => void
}

export const useMqttStore = create<MqttStoreState & MqttStoreActions>(
  (set, get) => ({
    wsUrl: import.meta.env.VITE_MQTT_WS_URL ?? 'ws://localhost:9001/mqtt',
    mqttBaseTopic: initialMqttBaseTopic,
    mqttClientId: initialMqttClientId,
    status: 'idle',
    errorText: null,
    snapshots: snapshotMapForPrefix(initialMqttBaseTopic),
    jsonViewerThemesByTopic: topicThemeDefaults(initialMqttBaseTopic),
    openCardMenuTopic: null,

    setWsUrl: (v) => set({ wsUrl: v }),

    setMqttBaseTopic: (v) =>
      set({
        mqttBaseTopic: v,
        openCardMenuTopic: null,
        snapshots: snapshotMapForPrefix(v),
        jsonViewerThemesByTopic: topicThemeDefaults(v),
        errorText: null,
      }),

    setMqttClientId: (v) => set({ mqttClientId: v, errorText: null }),

    setOpenCardMenuTopic: (v) => set({ openCardMenuTopic: v }),

    toggleCardMenu: (topic) =>
      set((s) => ({
        openCardMenuTopic: s.openCardMenuTopic === topic ? null : topic,
      })),

    setJsonViewerTheme: (topic, theme) =>
      set((s) => ({
        jsonViewerThemesByTopic: { ...s.jsonViewerThemesByTopic, [topic]: theme },
      })),

    disconnect: () => {
      disconnectBrowserMqtt()
      set({ status: 'idle', errorText: null })
    },

    connect: () => {
      const { mqttBaseTopic, mqttClientId, wsUrl } = get()
      if (!canConnectMqtt(mqttBaseTopic, mqttClientId)) {
        const missing: string[] = []
        if (normalizeMqttBaseTopic(mqttBaseTopic) === '') {
          missing.push('MQTT base topic')
        }
        if (!mqttClientId.trim()) {
          missing.push('Client ID')
        }
        set({
          status: 'error',
          errorText: `Required: ${missing.join(' and ')}.`,
        })
        return
      }

      get().disconnect()
      set({ status: 'connecting', errorText: null })

      connectBrowserMqtt({
        wsUrl,
        clientId: mqttClientId.trim(),
        subscribeTopics: telemetryTopics(get().mqttBaseTopic),
        onConnect: () => set({ status: 'connected' }),
        onMessage: (topic, { text, receivedAt }) =>
          set((s) => ({
            snapshots: {
              ...s.snapshots,
              [topic]: { payload: text, receivedAt },
            },
          })),
        onSubscribeError: (err) => set({ errorText: err.message }),
        onError: (message) => set({ errorText: message, status: 'error' }),
        onClose: () =>
          set((s) => ({
            status: s.status === 'connected' ? 'idle' : s.status,
          })),
      })
    },
  }),
)
