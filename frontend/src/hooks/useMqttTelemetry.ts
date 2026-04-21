import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { getInitialJsonViewerTheme } from '../component/jsonViewerTheme'
import {
  telemetryTopics,
  type TopicSnapshot,
  useMqttStore,
} from '../store/mqttStore'

/**
 * Resolved `env` / `imu` / `mag` topic strings for the current MQTT base prefix.
 * Only re-renders when the prefix changes (not on each incoming message).
 */
export function useTelemetryTopics(): string[] {
  const mqttBaseTopic = useMqttStore((s) => s.mqttBaseTopic)
  return useMemo(() => telemetryTopics(mqttBaseTopic), [mqttBaseTopic])
}

/**
 * All topic snapshots and the resolved subscription list for the current MQTT base prefix.
 * Re-renders when any topic receives data or when the prefix changes.
 */
export function useMqttTelemetry() {
  const mqttBaseTopic = useMqttStore((s) => s.mqttBaseTopic)
  const snapshots = useMqttStore((s) => s.snapshots)
  const topics = useMemo(() => telemetryTopics(mqttBaseTopic), [mqttBaseTopic])
  return { snapshots, mqttBaseTopic, topics }
}

/**
 * Subscribe to a single MQTT topic’s latest payload and timestamp only.
 * Prefer this in per-topic panels to limit re-renders when other topics update.
 */
export function useMqttTopicSnapshot(topic: string): {
  snapshot: TopicSnapshot | null
  topic: string
} {
  return useMqttStore(
    useShallow((s) => ({
      snapshot: s.snapshots[topic] ?? null,
      topic,
    })),
  )
}

/**
 * Per-card state for the dashboard: last message, JSON viewer theme, and card menu.
 */
export function useMqttTelemetryCard(topic: string) {
  return useMqttStore(
    useShallow((s) => ({
      snapshot: s.snapshots[topic] ?? null,
      jsonTheme:
        s.jsonViewerThemesByTopic[topic] ?? getInitialJsonViewerTheme(),
      menuOpen: s.openCardMenuTopic === topic,
      toggleCardMenu: s.toggleCardMenu,
      setJsonViewerTheme: s.setJsonViewerTheme,
    })),
  )
}
