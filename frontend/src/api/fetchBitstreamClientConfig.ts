/**
 * Default `bitstream serve` origin (override with `VITE_BITSTREAM_API_URL`).
 * The UI loads MQTT fields from `GET /api/v1/mqtt-config/client` (same data as
 * `mqtt_client_config.snapshot.json` on the server).
 */
export const DEFAULT_BITSTREAM_API_URL = 'http://127.0.0.1:8787'

/**
 * Resolve the Bitstream HTTP base URL. Uses `VITE_BITSTREAM_API_URL` when set;
 * otherwise {@link DEFAULT_BITSTREAM_API_URL}. Returns `null` only if
 * `VITE_BITSTREAM_API_URL` is explicitly set to an empty string (skip preload).
 */
export function resolveBitstreamApiBaseUrl(): string | null {
  const raw = import.meta.env.VITE_BITSTREAM_API_URL
  if (raw === '') return null
  const t = typeof raw === 'string' ? raw.trim() : ''
  if (t) return t
  return DEFAULT_BITSTREAM_API_URL
}

/**
 * Response from services-tools `GET /api/v1/mqtt-config/client`
 * (same shape as `/api/v1/mqtt-config/snapshot`).
 */
export type BitstreamClientConfigResponse = {
  ok: boolean
  mqttClientId?: string
  mqttBaseTopic?: string
  mqttBrokerAddress?: string
  mqttTcpPort?: number
  mqttWsPort?: number
  mqttWsUrl?: string
  updatedAt?: string
}

/**
 * Fetches firmware-aligned MQTT client id and base topic from `bitstream serve`.
 * Returns `null` if the request fails or `ok` is false.
 */
export async function fetchBitstreamClientConfig(
  bitstreamBaseUrl: string,
): Promise<BitstreamClientConfigResponse | null> {
  const base = bitstreamBaseUrl.trim().replace(/\/$/, '')
  const url = `${base}/api/v1/mqtt-config/client`
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as BitstreamClientConfigResponse
    return data.ok ? data : null
  } catch {
    return null
  }
}
