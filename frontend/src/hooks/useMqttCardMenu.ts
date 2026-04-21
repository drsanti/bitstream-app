import { useShallow } from 'zustand/react/shallow'
import { useMqttStore } from '../store/mqttStore'

/**
 * Which telemetry card menu is open (full MQTT topic string or null).
 * Use with a click-outside / Escape effect in a parent grid or layout.
 */
export function useMqttCardMenu() {
  return useMqttStore(
    useShallow((s) => ({
      openCardMenuTopic: s.openCardMenuTopic,
      setOpenCardMenuTopic: s.setOpenCardMenuTopic,
    })),
  )
}
