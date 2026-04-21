import ReactECharts from "echarts-for-react";
import {
  buildNeedleGaugeOption,
  type NeedleGaugeChartProps,
} from "./needleGaugeOption";

/**
 * Semi-circular needle gauge (thin track, no filled arc). Styling is controlled via props.
 *
 * For non-React use, see {@link buildNeedleGaugeOption} in `./needleGaugeOption`.
 */
export function NeedleGaugeChart({
  height = 220,
  className,
  style,
  renderer = "canvas",
  notMerge = true,
  lazyUpdate = true,
  ...gaugeProps
}: NeedleGaugeChartProps) {
  const option = buildNeedleGaugeOption(gaugeProps);

  return (
    <ReactECharts
      className={className}
      option={option}
      style={{ height, width: "100%", ...style }}
      opts={{ renderer }}
      notMerge={notMerge}
      lazyUpdate={lazyUpdate}
    />
  );
}
