import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import type { LucideIcon } from "lucide-react";
import {
  CloudFog,
  Droplets,
  Gauge,
  Leaf,
  Thermometer,
} from "lucide-react";
import { NeedleGaugeChart } from "../component/NeedleGaugeChart";
import {
  useMqttConnection,
  useMqttTopicSnapshot,
  useTelemetryTopics,
} from "../hooks";

/** Matches `sensor_task.c` ENV publish interval (~1 Hz). */
const SAMPLE_INTERVAL_SEC = 1;
const MAX_POINTS = 180;

/** Matches firmware ENV JSON: `parameters.temperature`, `humidity`, … */
type EnvPoint = {
  sequence: number;
  sensor: string;
  temperature: number;
  humidity: number;
  pressure_hpa: number;
  co2_ppm: number;
  pm25_ugm3: number;
};

type EnvChartRow = EnvPoint & { tSec: number };

function resolveEnvTopic(topics: string[]): string {
  return topics.find((t) => t === "env" || t.endsWith("/env")) ?? "";
}

function parseEnvPoint(payload: string): EnvPoint | null {
  try {
    const raw = JSON.parse(payload) as {
      sensor?: string;
      sequence?: number;
      parameters?: {
        temperature?: number;
        humidity?: number;
        pressure_hpa?: number;
        co2_ppm?: number;
        pm25_ugm3?: number;
      };
    };
    const p = raw.parameters;
    if (
      !p ||
      typeof p.temperature !== "number" ||
      typeof p.humidity !== "number" ||
      typeof p.pressure_hpa !== "number" ||
      typeof p.co2_ppm !== "number" ||
      typeof p.pm25_ugm3 !== "number"
    ) {
      return null;
    }
    return {
      sequence: typeof raw.sequence === "number" ? raw.sequence : 0,
      sensor: typeof raw.sensor === "string" ? raw.sensor : "env",
      temperature: p.temperature,
      humidity: p.humidity,
      pressure_hpa: p.pressure_hpa,
      co2_ppm: p.co2_ppm,
      pm25_ugm3: p.pm25_ugm3,
    };
  } catch {
    return null;
  }
}

const chartText = "#cbd5e1";
const chartMuted = "#64748b";
const chartGrid = "#1e293b";
function baseChartTheme(): Pick<
  EChartsOption,
  "backgroundColor" | "textStyle" | "tooltip"
> {
  return {
    backgroundColor: "transparent",
    textStyle: {
      color: chartText,
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
    },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(15, 23, 42, 0.95)",
      borderColor: chartGrid,
      textStyle: { color: chartText, fontSize: 12 },
    },
  };
}

/** Presets for ENV dashboard needle gauges (customize via {@link NeedleGaugeChart} props elsewhere). */
const ENV_NEEDLE_GAUGES: {
  id: string;
  title: string;
  /** Shown at top-left of the card (semantic cue for the metric). */
  icon: LucideIcon;
  min: number;
  max: number;
  unit: string;
  splitNumber: number;
  accent: string;
  track: [number, string][];
  detailColor: string;
  cardClass: string;
  value: (p: EnvPoint) => number;
}[] = [
  {
    id: "temp",
    title: "Temperature",
    icon: Thermometer,
    min: -10,
    max: 55,
    unit: "°C",
    splitNumber: 5,
    accent: "#fb923c",
    track: [
      [0.2, "#1c1917"],
      [0.55, "#431407"],
      [1, "#9a3412"],
    ],
    detailColor: "#fed7aa",
    cardClass:
      "border-l-orange-500/35 bg-gradient-to-br from-orange-950/25 via-slate-950/80 to-slate-950 ring-orange-500/10",
    value: (p) => p.temperature,
  },
  {
    id: "humidity",
    title: "Humidity",
    icon: Droplets,
    min: 0,
    max: 100,
    unit: "%",
    splitNumber: 4,
    accent: "#38bdf8",
    track: [
      [0.25, "#0c4a6e"],
      [0.55, "#164e63"],
      [1, "#0e7490"],
    ],
    detailColor: "#bae6fd",
    cardClass:
      "border-l-sky-400/35 bg-gradient-to-br from-sky-950/25 via-slate-950/80 to-slate-950 ring-sky-500/10",
    value: (p) => p.humidity,
  },
  {
    id: "pressure",
    title: "Pressure",
    icon: Gauge,
    min: 900,
    max: 1100,
    unit: " hPa",
    splitNumber: 4,
    accent: "#a78bfa",
    track: [
      [0.2, "#1e1b4b"],
      [0.5, "#312e81"],
      [1, "#4c1d95"],
    ],
    detailColor: "#ddd6fe",
    cardClass:
      "border-l-violet-400/35 bg-gradient-to-br from-violet-950/25 via-slate-950/80 to-slate-950 ring-violet-500/10",
    value: (p) => p.pressure_hpa,
  },
  {
    id: "co2",
    title: "CO₂",
    icon: Leaf,
    min: 300,
    max: 2000,
    unit: " ppm",
    splitNumber: 4,
    accent: "#fbbf24",
    track: [
      [0.25, "#14532d"],
      [0.55, "#854d0e"],
      [1, "#92400e"],
    ],
    detailColor: "#fef08a",
    cardClass:
      "border-l-amber-400/35 bg-gradient-to-br from-amber-950/25 via-slate-950/80 to-slate-950 ring-amber-500/10",
    value: (p) => p.co2_ppm,
  },
  {
    id: "pm25",
    title: "PM2.5",
    icon: CloudFog,
    min: 0,
    max: 150,
    unit: " µg/m³",
    splitNumber: 5,
    accent: "#fb7185",
    track: [
      [0.2, "#1e293b"],
      [0.5, "#831843"],
      [1, "#9f1239"],
    ],
    detailColor: "#fecdd3",
    cardClass:
      "border-l-rose-400/35 bg-gradient-to-br from-rose-950/25 via-slate-950/80 to-slate-950 ring-rose-500/10",
    value: (p) => p.pm25_ugm3,
  },
];

function dualLineTrendOption(
  title: string,
  data: EnvChartRow[],
  series: [
    { key: keyof EnvChartRow; name: string; color: string; yName: string },
    { key: keyof EnvChartRow; name: string; color: string; yName: string },
  ],
): EChartsOption {
  return {
    ...baseChartTheme(),
    title: {
      text: title,
      left: "center",
      top: 0,
      textAlign: "center",
      textStyle: { color: chartText, fontSize: 13, fontWeight: 600 },
    },
    grid: { left: 48, right: 52, top: 36, bottom: 28 },
    legend: {
      data: [series[0].name, series[1].name],
      top: 2,
      right: 0,
      textStyle: { color: chartMuted, fontSize: 11 },
    },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: data.map((d) => d.tSec),
      axisLine: { lineStyle: { color: chartGrid } },
      axisLabel: {
        color: chartMuted,
        fontSize: 10,
        formatter: (v: string) => `${v}s`,
      },
      name: "t @ 1 Hz",
      nameTextStyle: { color: chartMuted, fontSize: 10 },
      nameGap: 22,
    },
    yAxis: [
      {
        type: "value",
        name: series[0].yName,
        nameTextStyle: { color: series[0].color, fontSize: 10 },
        axisLine: { show: true, lineStyle: { color: chartGrid } },
        axisLabel: { color: chartMuted, fontSize: 10 },
        splitLine: { lineStyle: { color: chartGrid, opacity: 0.6 } },
      },
      {
        type: "value",
        name: series[1].yName,
        nameTextStyle: { color: series[1].color, fontSize: 10 },
        position: "right",
        axisLine: { show: true, lineStyle: { color: chartGrid } },
        axisLabel: { color: chartMuted, fontSize: 10 },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: series[0].name,
        type: "line",
        smooth: true,
        showSymbol: false,
        yAxisIndex: 0,
        lineStyle: { width: 2, color: series[0].color },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${series[0].color}55` },
              { offset: 1, color: `${series[0].color}08` },
            ],
          },
        },
        data: data.map((d) => d[series[0].key] as number),
      },
      {
        name: series[1].name,
        type: "line",
        smooth: true,
        showSymbol: false,
        yAxisIndex: 1,
        lineStyle: { width: 2, color: series[1].color },
        data: data.map((d) => d[series[1].key] as number),
      },
    ],
  };
}

function singleLineTrendOption(
  title: string,
  data: EnvChartRow[],
  name: string,
  color: string,
  yName: string,
  key: keyof EnvChartRow,
): EChartsOption {
  return {
    ...baseChartTheme(),
    title: {
      text: title,
      left: "center",
      top: 0,
      textAlign: "center",
      textStyle: { color: chartText, fontSize: 13, fontWeight: 600 },
    },
    grid: { left: 48, right: 16, top: 36, bottom: 28 },
    xAxis: {
      type: "category",
      boundaryGap: false,
      data: data.map((d) => d.tSec),
      axisLine: { lineStyle: { color: chartGrid } },
      axisLabel: {
        color: chartMuted,
        fontSize: 10,
        formatter: (v: string) => `${v}s`,
      },
      name: "t @ 1 Hz",
      nameTextStyle: { color: chartMuted, fontSize: 10 },
      nameGap: 22,
    },
    yAxis: {
      type: "value",
      name: yName,
      nameTextStyle: { color, fontSize: 10 },
      axisLine: { lineStyle: { color: chartGrid } },
      axisLabel: { color: chartMuted, fontSize: 10 },
      splitLine: { lineStyle: { color: chartGrid, opacity: 0.6 } },
    },
    series: [
      {
        name,
        type: "line",
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2, color },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: `${color}44` },
              { offset: 1, color: `${color}08` },
            ],
          },
        },
        data: data.map((d) => d[key] as number),
      },
    ],
  };
}

/**
 * Example: ENV telemetry dashboard — gauges and trends using **Apache ECharts**
 * (`echarts`, `echarts-for-react`). Payload shape matches `sensor_task.c` ENV JSON.
 */
type Ex05Tab = "gauges" | "trends";

export function Ex05EnvDashboard() {
  const ex05BaseId = useId();
  const [ex05Tab, setEx05Tab] = useState<Ex05Tab>("gauges");

  const { isConnected, status } = useMqttConnection();
  const topics = useTelemetryTopics();
  const envTopic = useMemo(() => resolveEnvTopic(topics), [topics]);
  const { snapshot } = useMqttTopicSnapshot(envTopic);

  const [points, setPoints] = useState<EnvPoint[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const lastSampleKeyRef = useRef<string | null>(null);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- append one sample per new MQTT snapshot */
    if (!snapshot?.payload) return;
    const sampleKey = `${snapshot.receivedAt}\0${snapshot.payload}`;
    if (lastSampleKeyRef.current === sampleKey) return;
    lastSampleKeyRef.current = sampleKey;
    const row = parseEnvPoint(snapshot.payload);
    if (!row) {
      setParseError(
        "Expected ENV JSON with parameters.temperature, humidity, pressure_hpa, co2_ppm, pm25_ugm3.",
      );
      return;
    }
    setParseError(null);
    setPoints((prev) => [...prev, row].slice(-MAX_POINTS));
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [snapshot]);

  const chartData: EnvChartRow[] = useMemo(
    () =>
      points.map((p, i) => ({
        ...p,
        tSec: i * SAMPLE_INTERVAL_SEC,
      })),
    [points],
  );

  const latest = points[points.length - 1];

  const optClimate = useMemo(
    () =>
      chartData.length
        ? dualLineTrendOption("Climate — temperature & humidity", chartData, [
            {
              key: "temperature",
              name: "Temperature",
              color: "#fb923c",
              yName: "°C",
            },
            { key: "humidity", name: "Humidity", color: "#38bdf8", yName: "%" },
          ])
        : null,
    [chartData],
  );

  const optPressure = useMemo(
    () =>
      chartData.length
        ? singleLineTrendOption(
            "Barometric pressure",
            chartData,
            "Pressure",
            "#a78bfa",
            "hPa",
            "pressure_hpa",
          )
        : null,
    [chartData],
  );

  const optAir = useMemo(
    () =>
      chartData.length
        ? dualLineTrendOption("Air quality — CO₂ & PM2.5", chartData, [
            { key: "co2_ppm", name: "CO₂", color: "#fbbf24", yName: "ppm" },
            {
              key: "pm25_ugm3",
              name: "PM2.5",
              color: "#fb7185",
              yName: "µg/m³",
            },
          ])
        : null,
    [chartData],
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-slate-400">
        ENV topic:{" "}
        <code className="font-mono text-emerald-400">{envTopic || "—"}</code> ·
        Connection:{" "}
        <span className={isConnected ? "text-emerald-400" : "text-slate-500"}>
          {status}
        </span>
      </p>

      {!snapshot ? (
        <p className="text-sm text-slate-500">
          No ENV messages yet — connect and ensure the device publishes to the
          ENV topic.
        </p>
      ) : null}

      {parseError ? (
        <p className="text-sm text-amber-400" role="alert">
          {parseError}
        </p>
      ) : null}

      {latest ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
          <span className="font-medium text-slate-300">Source</span>
          <code className="rounded bg-slate-800 px-1.5 py-0.5 text-emerald-400">
            {latest.sensor}
          </code>
          <span className="text-slate-600">·</span>
          <span>
            sequence{" "}
            <span className="tabular-nums text-slate-200">
              {latest.sequence}
            </span>
          </span>
        </div>
      ) : null}

      <div
        className="mt-2 flex flex-wrap gap-1 border-b border-slate-800"
        role="tablist"
        aria-label="Environment dashboard view"
      >
        {(
          [
            { id: "gauges" as const, label: "Live gauges" },
            { id: "trends" as const, label: "Trends" },
          ] as const
        ).map((tab) => {
          const selected = ex05Tab === tab.id;
          const tabId = `${ex05BaseId}-tab-${tab.id}`;
          const panelId = `${ex05BaseId}-panel-${tab.id}`;
          return (
            <button
              key={tab.id}
              id={tabId}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              className={`relative -mb-px mr-1 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors last:mr-0 ${
                selected
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-200"
              }`}
              onClick={() => setEx05Tab(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="pt-4">
        {ex05Tab === "gauges" ? (
          <div
            id={`${ex05BaseId}-panel-gauges`}
            role="tabpanel"
            aria-labelledby={`${ex05BaseId}-tab-gauges`}
            className="space-y-3"
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {ENV_NEEDLE_GAUGES.map((cfg) => {
                const Icon = cfg.icon;
                return (
                  <div
                    key={cfg.id}
                    className={`relative min-h-[220px] rounded-xl border border-slate-800 border-l-[3px] bg-slate-950/80 p-2 pt-1 shadow-inner shadow-black/20 ring-1 ring-inset ${cfg.cardClass}`}
                  >
                    <div
                      className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900/90 ring-1 ring-slate-600/50"
                      title={cfg.title}
                    >
                      <Icon
                        className="h-4 w-4"
                        strokeWidth={2}
                        style={{ color: cfg.accent }}
                        aria-hidden
                      />
                    </div>
                    {latest ? (
                      <NeedleGaugeChart
                        title={cfg.title}
                        value={cfg.value(latest)}
                        min={cfg.min}
                        max={cfg.max}
                        unit={cfg.unit}
                        accent={cfg.accent}
                        track={cfg.track}
                        detailColor={cfg.detailColor}
                        splitNumber={cfg.splitNumber}
                        height={220}
                      />
                    ) : (
                      <div className="flex h-[220px] items-center justify-center text-sm text-slate-600">
                        Awaiting data…
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {ex05Tab === "trends" ? (
          <div
            id={`${ex05BaseId}-panel-trends`}
            role="tabpanel"
            aria-labelledby={`${ex05BaseId}-tab-trends`}
            className="space-y-4"
          >
            {optClimate ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <ReactECharts
                  option={optClimate}
                  style={{ height: 280, width: "100%" }}
                  opts={{ renderer: "canvas" }}
                  notMerge
                  lazyUpdate
                />
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 px-4 py-12 text-center text-sm text-slate-600">
                Climate trend chart appears when samples arrive.
              </div>
            )}
            {optPressure ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <ReactECharts
                  option={optPressure}
                  style={{ height: 220, width: "100%" }}
                  opts={{ renderer: "canvas" }}
                  notMerge
                  lazyUpdate
                />
              </div>
            ) : null}
            {optAir ? (
              <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3">
                <ReactECharts
                  option={optAir}
                  style={{ height: 280, width: "100%" }}
                  opts={{ renderer: "canvas" }}
                  notMerge
                  lazyUpdate
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <p className="text-xs text-slate-500">
        Same JSON envelope as firmware:{" "}
        <code className="text-slate-400">sensor</code>,{" "}
        <code className="text-slate-400">sequence</code>,{" "}
        <code className="text-slate-400">parameters</code>.
      </p>
    </div>
  );
}
