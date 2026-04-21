/**
 * React hooks over {@link useMqttStore}. Prefer these in UI code so connection,
 * telemetry, and menu state stay consistent and subscriptions stay narrow.
 */
export { useMqttConnection } from './useMqttConnection'
export {
  useMqttTelemetry,
  useMqttTopicSnapshot,
  useMqttTelemetryCard,
  useTelemetryTopics,
} from './useMqttTelemetry'
export { useMqttCardMenu } from './useMqttCardMenu'
export { useDisconnectMqttOnUnmount } from './useDisconnectMqttOnUnmount'

export type { ConnectionStatus, TopicSnapshot } from '../store/mqttStore'
export {
  canConnectMqtt,
  telemetryTopics,
  getTopicPanelIcon,
  useMqttStore,
} from '../store/mqttStore'
