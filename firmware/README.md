# PSoC™ 6 MQTT Sensors

![Cover Image](docs/assets/ps5-mqtt-sensors-cover.png)

---

A ModusToolbox™ application for the Infineon **CY8CKIT-062S2-AI** (PSoC™ 6 AI Evaluation Board) that connects to Wi‑Fi and acts as an MQTT sensor node. It publishes **compact JSON** on separate topics for **ENV** (environment bundle), **IMU** (accelerometer + gyroscope, optional die temperature), and **MAG** (magnetometer, optional BMM350 die temperature), plus a classic **LED** subscribe/publish demo on `ledstatus`.

---

![Board Image](docs/assets/psoc6-edited.jpg)

---


## Features

- **Wi‑Fi + MQTT** — Connects to a configurable broker over Wi‑Fi (WPA2); broker host/port and topics are set in `configs/mqtt_client_config.h`.
- **JSON telemetry** — Each sensor group uses a documented JSON shape (see [MQTT topics and payloads](#mqtt-topics-and-payloads)). Top-level **`client-id`** is **`MQTT_CLIENT_ID`** from `mqtt_client_config.h` on every message.
  - **ENV** — `sensor` (`env-mixed` or `env-sim`), **`client-id`**, `sequence`, `parameters` with five metrics: `temperature`, `humidity`, `pressure_hpa`, `co2_ppm`, `pm25_ugm3`. **`env-mixed`**: real **BMI270** die temperature for `parameters.temperature` when the IMU is up and **`imu_read_temperature()`** succeeds; other fields are simulated. **`env-sim`**: all five values from `sim_driver.c`.
  - **IMU** — Top-level `sensor` (`imu`), **`client-id`**, `chip` (e.g. `BMI270`, `ICM-20948`), `sequence`, `parameters` with optional `tc` (BMI270 die °C) and `ax`…`gz`.
  - **MAG** — Top-level `sensor` (`mag`), **`client-id`**, `chip` (e.g. `BMM350`, `BMM150`), `sequence`, `parameters` with optional `tc` (BMM350 die °C) and `mx`/`my`/`mz` (µT).
- **Independent sequence counters** — `sequence` is a `uint32_t` per topic, incremented once per publish on that topic (starts at **1**, wraps after **4294967295**).
- **Auto-detect sensors** — Probes I2C and supports BMI270/ICM-20948 (IMU) and BMM350/BMM150 (magnetometer).
- **Shared I2C** — `i2c_driver` + mutex for IMU and MAG.
- **Drivers** — `imu_driver`, `mag_driver`, `sim_driver` (random ENV fields when not using real BMI270 temperature).

---

## Hardware

| Item | Description |
|------|-------------|
| **Board** | [CY8CKIT-062S2-AI](https://www.infineon.com/cms/en/product/evaluation-boards/cy8ckit-062s2-ai-psoc-6-ai-evaluation-board/) (PSoC™ 6 AI Evaluation Board) |
| **IMU** | BMI270 or ICM-20948 (I2C) |
| **Magnetometer** | BMM350 or BMM150 (shared I2C bus) |
| **Connectivity** | On-board Wi‑Fi (CYW43439), KitProg3 for programming/debug |

Schematic and block diagram links can be added under a `docs/` folder (e.g. `docs/assets/`, `docs/datasheet/`) if you maintain them in the repo.

---

## Prerequisites

- **ModusToolbox™** 3.x (with ModusToolbox IDE or standalone tools).
- **getlibs** — Run once to fetch Wi‑Fi and other dependent libraries:

  ```bash
  make getlibs
  ```

- **Wi‑Fi credentials** — Set your network in `configs/wifi_config.h` (see [Configuration](#configuration)).

### Developer tooling (optional)

In the **ps6-ws** workspace, **`applications/backend/services-tools`** provides the **`bitstream`** CLI to patch `mqtt_client_config.h` (**`MQTT_BROKER_ADDRESS`**, **`MQTT_BASE_TOPIC`**, **`MQTT_CLIENT_ID`**, or all three via **`bitstream mqtt-client-id …`**) and `wifi_config.h` (SSID/password) without hand-editing. See that folder’s **README** for install and commands.

### Browser dashboard (TESAIoT)

**`frontend`** is the **TESAIoT** web dashboard (Vite + React). Point it at the same broker over WebSockets (e.g. **`ws://<your_PC_LAN_IP>:9001`** when using Mosquitto from `applications/backend`) and set **MQTT base topic** to match **`MQTT_BASE_TOPIC`** here (default **`tesaiot/sensors`**) so the UI subscribes to **`tesaiot/sensors/env`**, **`/imu`**, **`/mag`**. See that folder’s **README** for install, **Ex01–Ex05** examples, and **`VITE_MQTT_*`** variables.

---

## Configuration

### Wi‑Fi (`configs/wifi_config.h`)

Edit your network credentials here (replace the placeholder strings):

```c
#define WIFI_SSID "YOUR_SSID"
#define WIFI_PASSWORD "YOUR_PASSWORD"
```

| Macro | Description |
|-------|-------------|
| `WIFI_SSID` | Access point name |
| `WIFI_PASSWORD` | Passphrase |
| `WIFI_SECURITY` | e.g. `CY_WCM_SECURITY_WPA2_AES_PSK` |

### MQTT (`configs/mqtt_client_config.h`)

| Macro | Default | Description |
|-------|---------|-------------|
| `MQTT_BROKER_ADDRESS` | `broker.emqx.io` | **Broker hostname or IPv4** — set to your **PC’s LAN IPv4** when using Mosquitto in Docker on that PC, or to a **public hostname** (e.g. `broker.emqx.io`). Do not use `localhost` or `127.0.0.1` for a PC on the LAN — on the board those refer to the board itself. |
| `MQTT_PORT` | `1883` | Broker port (non-TLS); matches Mosquitto TCP in `applications/backend`. |
| `MQTT_CLIENT_ID` | `psoc6-mqtt-client-1` | String embedded in each telemetry JSON payload as **`"client-id"`** (ENV / IMU / MAG). Patch with **`bitstream mqtt-broker client-id`** or set together with broker + base topic via **`bitstream mqtt-client-id …`** (see services-tools **README**). |
| `MQTT_BASE_TOPIC` | `tesaiot/sensors` | Prefix for sensor topics; **`MQTT_ENV_TOPIC`**, **`MQTT_IMU_TOPIC`**, **`MQTT_MAG_TOPIC`** are **`MQTT_BASE_TOPIC` + `/env`**, `/imu`, `/mag`. |
| `MQTT_ENV_TOPIC` | `tesaiot/sensors/env` | ENV JSON: `env-mixed` / `env-sim`, `sequence`, `parameters` (5 metrics) |
| `MQTT_IMU_TOPIC` | `tesaiot/sensors/imu` | IMU JSON: `imu`, `chip`, `sequence`, `parameters` (`tc` optional, `ax`…`gz`) |
| `MQTT_MAG_TOPIC` | `tesaiot/sensors/mag` | MAG JSON: `mag`, `chip`, `sequence`, `parameters` (`tc` optional BMM350, `mx`…`mz`) |
| `MQTT_PUB_TOPIC` / `MQTT_SUB_TOPIC` | `ledstatus` | LED demo: subscribe receives `TURN ON` / `TURN OFF`; payload is **plain text**, not JSON |

**Local broker (Docker):** run `docker compose up -d` in `applications/backend`, then set `MQTT_BROKER_ADDRESS` to your **PC’s IPv4** on the same network as the kit.

**Public broker:** set `MQTT_BROKER_ADDRESS` to the hostname (default `broker.emqx.io` or another public broker).

---

## Build and program

From the project root:

```bash
# Fetch libraries (first time only)
make getlibs

# Build
make build

# Program the board (KitProg3)
make program
```

For a clean build:

```bash
make clean
make build
```

**Programming (KitProg3)**  
If `make program` fails with a CMSIS-DAP or “unable to find a matching CMSIS-DAP device” error:

1. Confirm the board is connected via USB and the KitProg3 port is visible.
2. Put the board in the correct link (e.g. “KitProg3 CMSIS-DAP” if your board has a link selector).
3. Try another USB port or cable; close other tools that might be using the probe.
4. See [ModusToolbox programming documentation](https://infineon.github.io/mtb-super-manifest/mtb_user_guide.html#programming-and-debugging) for your exact kit.

---

## Project structure

```
firmware/
├── configs/
│   ├── mqtt_client_config.h   # Broker, MQTT_BASE_TOPIC, topics, QoS (Bitstream can patch)
│   └── wifi_config.h          # SSID, password, security (Bitstream can patch)
├── source/
│   ├── main.c
│   ├── mqtt_task.c / .h       # Wi‑Fi + MQTT connect; creates subscriber/publisher tasks
│   ├── publisher_task.c       # Queue-driven publish (MQTT_PUB_TOPIC)
│   ├── subscriber_task.c      # MQTT_SUB_TOPIC + LED control strings
│   ├── led_control_task.c
│   ├── led_sensor_task.c
│   └── sensors/
│       ├── sensor_task.c / .h # ENV / IMU / MAG JSON over MQTT (1 s interval)
│       ├── i2c_driver.c / .h
│       ├── imu_driver.c / .h  # BMI270 / ICM-20948
│       ├── mag_driver.c / .h  # BMM350 / BMM150 (+ BMM350 `tc` in driver)
│       └── sim_driver.c / .h  # Random ENV fields when simulating
├── Makefile
└── README.md
```

---

## MQTT topics and payloads

**Full topic paths** on the broker are **`MQTT_BASE_TOPIC`/env**, **`MQTT_BASE_TOPIC`/imu**, **`MQTT_BASE_TOPIC`/mag** (with the default **`MQTT_BASE_TOPIC`** of **`tesaiot/sensors`**, that is **`tesaiot/sensors/env`**, **`/imu`**, **`/mag`**). In the tables below, **`env`**, **`imu`**, and **`mag`** refer to those **suffixes** and the JSON shape, not bare single-segment topic names.

Publish interval is **1 s** (`SENSOR_PUBLISH_INTERVAL_MS` in `source/sensors/sensor_task.h`). Payloads are UTF‑8 compact JSON; internal buffers are **384** bytes for ENV/IMU and **320** bytes for MAG (`sensor_task.c`).

**Key order (as emitted):**

- **`env`**: `sensor`, **`client-id`**, `sequence`, `parameters` (inside `parameters`: `temperature`, `humidity`, `pressure_hpa`, `co2_ppm`, `pm25_ugm3`). **`client-id`** matches **`MQTT_CLIENT_ID`** in `mqtt_client_config.h`.
- **`imu`**: `sensor`, **`client-id`**, `chip`, `sequence`, `parameters` — with **`tc`** first when present, then `ax`…`gz`.
- **`mag`**: `sensor`, **`client-id`**, `chip`, `sequence`, `parameters` — with **`tc`** first when present, then `mx`, `my`, `mz`.

| Topic | Top-level | `parameters` |
|-------|-----------|----------------|
| `env` | **`sensor`**, **`client-id`**, **`sequence`** | `temperature`, `humidity`, `pressure_hpa`, `co2_ppm`, `pm25_ugm3` |
| `imu` | **`sensor`**, **`client-id`**, **`chip`**, **`sequence`** | optional **`tc`** (°C, **BMI270** die when readable), **`ax`…`gz`** |
| `mag` | **`sensor`**, **`client-id`**, **`chip`**, **`sequence`** | optional **`tc`** (°C, **BMM350** when `temp_valid`), **`mx`**, **`my`**, **`mz`** |

Example **`env`**: `{"sensor":"env-mixed","client-id":"psoc6-mqtt-client-1","sequence":42,"parameters":{"temperature":25.3,"humidity":42,"pressure_hpa":1005.2,"co2_ppm":650,"pm25_ugm3":18.5}}`  
Example **`imu`** (BMI270): `{"sensor":"imu","client-id":"psoc6-mqtt-client-1","chip":"BMI270","sequence":47,"parameters":{"tc":35.1,"ax":0.02,"ay":-0.03,"az":2.46,"gx":-0.001,"gy":-0.003,"gz":-0.004}}` — **ICM-20948** (or any path where die temperature is not published) omits **`tc`**; **`parameters`** then starts with **`ax`**.  
Example **`mag`** (BMM350): `{"sensor":"mag","client-id":"psoc6-mqtt-client-1","chip":"BMM350","sequence":47,"parameters":{"tc":36.3,"mx":-47.1,"my":43.9,"mz":9.8}}` — **BMM150** omits **`tc`**.

### ENV: `env-mixed` vs `env-sim`

- **`env-mixed`** — IMU initialized and **`imu_read_temperature()`** succeeds: `parameters.temperature` is the **BMI270 die** reading (°C). Humidity, pressure, CO₂, and PM2.5 are still drawn from **`sim_driver`**.
- **`env-sim`** — No usable IMU temperature (no IMU or read failed): all five **`parameters`** fields come from **`sim_driver`**.

### Simulated ranges (`sim_driver.c`)

When a value is simulated, it is chosen uniformly at random within:

| Field | Range |
|-------|--------|
| `temperature` | 15.0–35.0 °C |
| `humidity` | 30–90 % |
| `pressure_hpa` | 990–1020 hPa |
| `co2_ppm` | 400–1200 ppm |
| `pm25_ugm3` | 5.0–55.0 µg/m³ |

- **ENV**: **`sequence`** — own counter per topic (starts at **1**; `uint32_t`, wraps after **4294967295**).
- **IMU**: Top-level **`chip`**. **`parameters.tc`** — IMU die temperature when included (**BMI270** path). **`ax`…`gz`** — accel (m/s²) and gyro (rad/s).
- **MAG**: Top-level **`chip`**. **`parameters.tc`** — on-chip temperature when included (**BMM350**). **`mx`/`my`/`mz`** in µT.

---

## Understanding IMU and MAG values

### IMU (`imu` topic)

Top-level **`chip`**: **`BMI270`** or **`ICM-20948`**. Inside **`parameters`**: optional **`tc`** (°C, **BMI270** die only); **`ax`**, **`ay`**, **`az`** (m/s²); **`gx`**, **`gy`**, **`gz`** (rad/s).

Example (BMI270):

`{"sensor":"imu","client-id":"psoc6-mqtt-client-1","chip":"BMI270","sequence":3,"parameters":{"tc":34.2,"ax":-0.01,"ay":-1.15,"az":2.28,"gx":-0.470,"gy":-0.155,"gz":-0.094}}`

- **Accelerometer (`ax/ay/az`)**:
  - When the board is stationary, the accelerometer measures **gravity**. The total magnitude should be close to **9.81 m/s²**:
    \[
    |a|=\sqrt{ax^2+ay^2+az^2}\approx 9.81
    \]
  - Each axis value is the component of gravity (plus any motion) along that axis. Which axis shows \( \pm 9.81 \) depends on how the board is oriented.
- **Gyroscope (`gx/gy/gz`)**:
  - `0 rad/s` means “not rotating”. Small non-zero readings are normal (noise/bias).
  - To convert to degrees/s: \( \text{deg/s} = \text{rad/s} \times 57.2958 \).

### MAG (`mag` topic)

Top-level **`chip`**: **`BMM150`** or **`BMM350`**. Inside **`parameters`**: optional **`tc`** (°C, **BMM350** on-chip temp); **`mx`**, **`my`**, **`mz`**: magnetic field (**µT**).

Notes:
- Earth’s field magnitude is typically on the order of **25–65 µT** depending on location, but **nearby metal, magnets, USB cables, and current draw** can change readings significantly.
- When you rotate the board, the `mx/my/mz` components should change (the vector rotates with the sensor).

---


## References

- [CY8CKIT-062S2-AI product page](https://www.infineon.com/cms/en/product/evaluation-boards/cy8ckit-062s2-ai-psoc-6-ai-evaluation-board/)
- [ModusToolbox user guide](https://infineon.github.io/mtb-super-manifest/mtb_user_guide.html)
- [PSoC 6 technical reference](https://infineon.github.io/mtb-pdl-cat1/pdl_api_reference_manual/html/index.html)
