import { useShallow } from 'zustand/react/shallow'
import { useMqttStore } from '../store/mqttStore'

/**
 * WebSocket URL, MQTT base topic prefix, connection lifecycle, and last broker error.
 * Use for connection forms, connect/disconnect buttons, and status indicators.
 */
export function useMqttConnection() {
  return useMqttStore(
    useShallow((s) => ({
      wsUrl: s.wsUrl,
      setWsUrl: s.setWsUrl,
      mqttBaseTopic: s.mqttBaseTopic,
      setMqttBaseTopic: s.setMqttBaseTopic,
      mqttClientId: s.mqttClientId,
      setMqttClientId: s.setMqttClientId,
      status: s.status,
      errorText: s.errorText,
      connect: s.connect,
      disconnect: s.disconnect,
      /** True while subscribed and receiving (UI can show “live”). */
      isConnected: s.status === 'connected',
      isConnecting: s.status === 'connecting',
      hasError: s.status === 'error',
      /** False while connected or connecting — disable editing URL/prefix if you mirror the dashboard. */
      canEditConnectionFields: s.status !== 'connecting' && s.status !== 'connected',
    })),
  )
}
