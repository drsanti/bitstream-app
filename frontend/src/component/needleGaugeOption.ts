import type { CSSProperties } from "react";
import type { EChartsOption } from "echarts";

const chartText = "#cbd5e1";
const chartGrid = "#1e293b";
const defaultAxisLabelColor = "#94a3b8";
const defaultTickLineColor = "#64748b";

function defaultGaugeTheme(): Pick<
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

export function defaultRoundAxisLabel(value: number | string): string {
  const n =
    typeof value === "number" ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(n)) return "";
  return String(Math.round(n));
}

/** Default dial layout: thin track + needle (no value fill arc). */
export const defaultNeedleGaugeGeometry = {
  radius: "78%",
  trackWidth: 10,
  startAngle: 210,
  endAngle: -30,
  pointerLength: "55%",
  pointerWidth: 5,
  axisLabelDistance: 38,
  center: ["50%", "54%"] as [string, string],
} as const;

export type NeedleGaugeGeometry = Partial<{
  radius: string;
  trackWidth: number;
  startAngle: number;
  endAngle: number;
  pointerLength: string;
  pointerWidth: number;
  axisLabelDistance: number;
  center: [string, string];
}>;

export type NeedleGaugeChartProps = {
  title: string;
  value: number;
  min: number;
  max: number;
  /** Shown after the numeric detail (e.g. `°C`, `%`, ` hPa`). */
  unit: string;
  /** Needle color. */
  accent: string;
  /** ECharts `axisLine.lineStyle.color` gradient: `[ratio, color][]`. */
  track: [number, string][];
  /** Color of the large value readout below the dial. */
  detailColor: string;
  splitNumber?: number;
  /** Chart height in px. */
  height?: number;
  className?: string;
  style?: CSSProperties;
  /** Override dial layout; defaults merged with {@link defaultNeedleGaugeGeometry}. */
  geometry?: NeedleGaugeGeometry;
  axisLabelColor?: string;
  tickLineColor?: string;
  titleColor?: string;
  titleFontSize?: number;
  detailFontSize?: number;
  axisLabelFontSize?: number;
  /** Custom tick formatter; default rounds to integers. */
  axisLabelFormatter?: (value: number | string) => string;
  renderer?: "canvas" | "svg";
  notMerge?: boolean;
  lazyUpdate?: boolean;
};

export type NeedleGaugeOptionProps = Omit<
  NeedleGaugeChartProps,
  "height" | "className" | "style" | "renderer" | "notMerge" | "lazyUpdate"
>;

export function buildNeedleGaugeOption(
  props: NeedleGaugeOptionProps,
): EChartsOption {
  const {
    title,
    value,
    min,
    max,
    unit,
    accent,
    track,
    detailColor,
    splitNumber = 5,
    geometry: geoIn,
    axisLabelColor = defaultAxisLabelColor,
    tickLineColor = defaultTickLineColor,
    titleColor = "#e2e8f0",
    titleFontSize = 13,
    detailFontSize = 20,
    axisLabelFontSize = 11,
    axisLabelFormatter = defaultRoundAxisLabel,
  } = props;

  const g = { ...defaultNeedleGaugeGeometry, ...geoIn };
  const w = g.trackWidth;

  return {
    ...defaultGaugeTheme(),
    animationDuration: 380,
    animationDurationUpdate: 280,
    animationEasingUpdate: "cubicOut",
    title: {
      text: title,
      left: "center",
      top: "5%",
      textStyle: {
        color: titleColor,
        fontSize: titleFontSize,
        fontWeight: 600,
      },
    },
    series: [
      {
        type: "gauge",
        min,
        max,
        splitNumber,
        radius: g.radius,
        center: g.center,
        startAngle: g.startAngle,
        endAngle: g.endAngle,
        axisLine: {
          lineStyle: {
            width: w,
            color: track,
          },
        },
        progress: {
          show: false,
        },
        pointer: {
          show: true,
          length: g.pointerLength,
          width: g.pointerWidth,
          offsetCenter: [0, "-8%"],
          itemStyle: {
            color: accent,
            shadowBlur: 8,
            shadowColor: `${accent}77`,
          },
        },
        axisTick: {
          distance: -w,
          length: 6,
          lineStyle: { color: tickLineColor, width: 1.5 },
        },
        splitLine: {
          distance: -w - 2,
          length: 11,
          lineStyle: { color: tickLineColor, width: 1.5 },
        },
        axisLabel: {
          distance: g.axisLabelDistance,
          color: axisLabelColor,
          fontSize: axisLabelFontSize,
          fontWeight: 500,
          formatter: axisLabelFormatter,
        },
        anchor: { show: false },
        title: { show: false },
        detail: {
          valueAnimation: true,
          offsetCenter: [0, "72%"],
          fontSize: detailFontSize,
          fontWeight: 700,
          color: detailColor,
          formatter: `{value}${unit}`,
        },
        data: [{ value, name: title }],
      },
    ],
  };
}
