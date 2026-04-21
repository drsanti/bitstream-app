# TESAIoT — IoT Applications (web dashboard)

**Vite**, **React**, **TypeScript**, **Zustand** (connection state + per-topic MQTT snapshots), **Tailwind CSS**, **mqtt.js** (MQTT over WebSockets), **lucide-react** (icons), **Recharts** (time-series), and **Apache ECharts** (gauges / combined charts).

The UI title is **TESAIoT** — **IoT Applications**, with telemetry aligned to the firmware JSON envelopes in `firmware` (`sensor`, `sequence`, `parameters`).

## Prerequisites

- Node.js 20+ (recommended)
- An MQTT broker with **WebSockets** enabled for browsers — e.g. **Eclipse Mosquitto** from `applications/backend` (`docker compose up -d`), which exposes **9001** for the app and **1883** for the PSoC firmware.

## Install & run

```bash
npm install
npm run dev
```

Open the printed local URL (usually `http://localhost:5173`). With **`bitstream serve`** running (default `http://127.0.0.1:8787`), the app loads **MQTT base topic**, **Client ID**, and **WebSocket URL** from **`GET /api/v1/mqtt-config/client`** (aligned with **`mqtt_client_config.snapshot.json`**). Then **Connect**. If the API is unreachable, set values manually or use **`VITE_MQTT_*`** in `.env`.

## Configuration

| Source | Meaning |
|--------|---------|
| Default WebSocket | `ws://localhost:9001/mqtt` |
| `.env` | **`VITE_MQTT_WS_URL`** — broker WebSocket URL (use your PC’s LAN IP if the broker runs on another machine). |
| `.env` | **`VITE_MQTT_BASE_TOPIC`** — default **MQTT base topic** (must be non-empty to connect). Must match firmware **`MQTT_BASE_TOPIC`**. Subscriptions are **`<prefix>/env`**, **`<prefix>/imu`**, **`<prefix>/mag`**. |
| `.env` | **`VITE_MQTT_CLIENT_ID`** — default **Client ID** (must be non-empty to connect unless you use Bitstream preload). Browser MQTT CONNECT id. |
| `.env` | **`VITE_BITSTREAM_API_URL`** — Overrides the default **bitstream serve** URL (`http://127.0.0.1:8787`). On load, the dashboard **always** requests **`GET /api/v1/mqtt-config/client`** first (same payload as **`mqtt_client_config.snapshot.json`**) and fills **Client ID**, **MQTT base topic**, and **WebSocket URL** (`mqttWsUrl`) when the server responds. Set **`VITE_BITSTREAM_API_URL=`** (empty) to skip that request and use only **`VITE_MQTT_*`** defaults. |
| `.env` | **`VITE_JSON_VIEWER_THEME`** — default theme for **@uiw/react-json-view** on telemetry cards: `dark`, `light`, `nord`, `vscode`, `basic`, `monokai`, `gruvbox`, `githubLight`, `githubDark`. |

Copy **`.env.example`** to **`.env`** and adjust as needed.

### JSON viewer theme

The tree uses **@uiw/react-json-view** built-in themes.

1. **Card menu** (on each telemetry card) — JSON theme is **per topic** (`env` / `imu` / `mag`).
2. **`VITE_JSON_VIEWER_THEME`** sets the **initial** default for all cards; each card can override for the session.
3. Changing **MQTT base topic** recreates topic keys; themes reset to the env default.

## Examples (tabbed)

| Tab | Content |
|-----|---------|
| **Ex01** | JSON viewer |
| **Ex02** | MQTT snapshot listing |
| **Ex03** | Single-topic JSON with suffix picker |
| **Ex04** | IMU + MAG rolling **Recharts** plots (`imu`, `mag`) |
| **Ex05** | **ENV** dashboard — **needle gauges** (temperature, humidity, pressure, CO₂, PM2.5) and **ECharts** trend charts |

Shared components include **`NeedleGaugeChart`** (`src/component/NeedleGaugeChart.tsx` + `needleGaugeOption.ts`) for reusable dial styling.

## services-tools API (firmware MQTT presets)

The dashboard can call the Node service in `applications/backend/services-tools` over HTTP so users can switch **docker** / **public** broker presets and **`MQTT_BASE_TOPIC`** without the terminal. **CLI and HTTP share one implementation** — see `services-tools/README.md` for routes (`POST /api/v1/mqtt-broker/docker`, `POST /api/v1/mqtt-broker/public`, `POST /api/v1/mqtt-broker/base-topic`, etc.). After changing the topic prefix in firmware, set **`VITE_MQTT_BASE_TOPIC`** to match and restart Vite.

## Build

```bash
npm run build
npm run preview
```

## Lint

```bash
npm run lint
```
