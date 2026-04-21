import { useEffect } from 'react'
import { useMqttStore } from '../store/mqttStore'

/** Call once near the app root so navigating away tears down the MQTT session. */
export function useDisconnectMqttOnUnmount() {
  useEffect(() => {
    return () => useMqttStore.getState().disconnect()
  }, [])
}
