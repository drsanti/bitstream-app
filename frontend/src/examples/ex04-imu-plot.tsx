import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useMqttConnection, useMqttTopicSnapshot, useTelemetryTopics } from '../hooks'

/** IMU publish rate from firmware task (~1 Hz). Used to label the time axis (s). */
const IMU_SAMPLE_INTERVAL_SEC = 1

/** Rolling window: 180 samples ≈ 3 min at 1 Hz. */
const MAX_POINTS = 180

/** Matches `sensor_task.c` IMU JSON: `parameters.ax` … `parameters.gz` (optional `tc`). */
type ImuPoint = {
  sequence: number
  ax: number
  ay: number
  az: number
  gx: number
  gy: number
  gz: number
}

/** Point row for Recharts: IMU fields + `tSec` (seconds in the visible window, 1 s per step @ 1 Hz). */
type ImuChartRow = ImuPoint & { tSec: number }

function resolveImuTopic(topics: string[]): string {
  return topics.find((t) => t === 'imu' || t.endsWith('/imu')) ?? ''
}

function resolveMagTopic(topics: string[]): string {
  return topics.find((t) => t === 'mag' || t.endsWith('/mag')) ?? ''
}

/** Matches `sensor_task.c` MAG JSON: `parameters.mx` … `parameters.mz` (optional `tc`). */
type MagPoint = {
  sequence: number
  mx: number
  my: number
  mz: number
}

type MagChartRow = MagPoint & { tSec: number }

function parseMagPoint(payload: string): MagPoint | null {
  try {
    const raw = JSON.parse(payload) as {
      sequence?: number
      parameters?: {
        mx?: number
        my?: number
        mz?: number
      }
    }
    const p = raw.parameters
    if (
      !p ||
      typeof p.mx !== 'number' ||
      typeof p.my !== 'number' ||
      typeof p.mz !== 'number'
    ) {
      return null
    }
    return {
      sequence: typeof raw.sequence === 'number' ? raw.sequence : 0,
      mx: p.mx,
      my: p.my,
      mz: p.mz,
    }
  } catch {
    return null
  }
}

function parseImuPoint(payload: string): ImuPoint | null {
  try {
    const raw = JSON.parse(payload) as {
      sequence?: number
      parameters?: {
        ax?: number
        ay?: number
        az?: number
        gx?: number
        gy?: number
        gz?: number
      }
    }
    const p = raw.parameters
    if (
      !p ||
      typeof p.ax !== 'number' ||
      typeof p.ay !== 'number' ||
      typeof p.az !== 'number' ||
      typeof p.gx !== 'number' ||
      typeof p.gy !== 'number' ||
      typeof p.gz !== 'number'
    ) {
      return null
    }
    return {
      sequence: typeof raw.sequence === 'number' ? raw.sequence : 0,
      ax: p.ax,
      ay: p.ay,
      az: p.az,
      gx: p.gx,
      gy: p.gy,
      gz: p.gz,
    }
  } catch {
    return null
  }
}

const chartBox = {
  grid: '#334155',
  axis: '#64748b',
  tooltipBg: '#0f172a',
  tooltipBorder: '#334155',
}

/** Tight margins: legend is vertical on the right (no tall top band). */
const chartMarginTop = 4
const chartMarginRightLegend = 56
const chartMarginBottomWithLabel = 20
const chartMarginBottomTicksOnly = 8

/** Light red / green / blue for X / Y / Z components (accel + gyro). */
const AXIS_RGB = {
  x: '#fca5a5',
  y: '#86efac',
  z: '#93c5fd',
} as const

/**
 * Example: rolling line charts for IMU (accel + gyro) and magnetometer (`mag` topic).
 * Plotting uses **Recharts** (`recharts`).
 */
export function Ex04ImuPlot() {
  const { isConnected, status } = useMqttConnection()
  const topics = useTelemetryTopics()
  const imuTopic = useMemo(() => resolveImuTopic(topics), [topics])
  const magTopic = useMemo(() => resolveMagTopic(topics), [topics])
  const { snapshot } = useMqttTopicSnapshot(imuTopic)
  const { snapshot: magSnapshot } = useMqttTopicSnapshot(magTopic)

  const [points, setPoints] = useState<ImuPoint[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const lastSampleKeyRef = useRef<string | null>(null)

  const [magPoints, setMagPoints] = useState<MagPoint[]>([])
  const [magParseError, setMagParseError] = useState<string | null>(null)
  const lastMagSampleKeyRef = useRef<string | null>(null)

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- append one chart sample per new MQTT snapshot */
    if (!snapshot?.payload) return
    const sampleKey = `${snapshot.receivedAt}\0${snapshot.payload}`
    if (lastSampleKeyRef.current === sampleKey) return
    lastSampleKeyRef.current = sampleKey
    const row = parseImuPoint(snapshot.payload)
    if (!row) {
      setParseError('Expected IMU JSON with parameters.ax … gz.')
      return
    }
    setParseError(null)
    setPoints((prev) => [...prev, row].slice(-MAX_POINTS))
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [snapshot])

  const chartData: ImuChartRow[] = useMemo(
    () =>
      points.map((p, i) => ({
        ...p,
        tSec: i * IMU_SAMPLE_INTERVAL_SEC,
      })),
    [points],
  )

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- append one MAG sample per new MQTT snapshot */
    if (!magSnapshot?.payload) return
    const sampleKey = `${magSnapshot.receivedAt}\0${magSnapshot.payload}`
    if (lastMagSampleKeyRef.current === sampleKey) return
    lastMagSampleKeyRef.current = sampleKey
    const row = parseMagPoint(magSnapshot.payload)
    if (!row) {
      setMagParseError('Expected MAG JSON with parameters.mx … mz.')
      return
    }
    setMagParseError(null)
    setMagPoints((prev) => [...prev, row].slice(-MAX_POINTS))
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [magSnapshot])

  const magChartData: MagChartRow[] = useMemo(
    () =>
      magPoints.map((p, i) => ({
        ...p,
        tSec: i * IMU_SAMPLE_INTERVAL_SEC,
      })),
    [magPoints],
  )

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-400">
        IMU topic:{' '}
        <code className="font-mono text-emerald-400">{imuTopic || '—'}</code> · MAG topic:{' '}
        <code className="font-mono text-emerald-400">{magTopic || '—'}</code> · Connection:{' '}
        <span className={isConnected ? 'text-emerald-400' : 'text-slate-500'}>{status}</span>
        . Plots use{' '}
        <a
          href="https://recharts.org"
          className="text-emerald-500/90 underline underline-offset-2 hover:text-emerald-400"
          target="_blank"
          rel="noreferrer"
        >
          Recharts
        </a>
        .
      </p>

      {!snapshot ? (
        <p className="text-sm text-slate-500">
          No IMU messages yet — connect and ensure the device publishes to the IMU topic.
        </p>
      ) : null}

      {parseError ? (
        <p className="text-sm text-amber-400" role="alert">
          {parseError}
        </p>
      ) : null}

      {magParseError ? (
        <p className="text-sm text-amber-400" role="alert">
          MAG: {magParseError}
        </p>
      ) : null}

      {points.length > 0 ? (
        <>
          <p className="mb-2 text-xs text-slate-500">
            Time axis assumes <strong className="text-slate-400">1 sample per second</strong> (1 Hz). Each
            step along X is one second within the rolling window (0 … {Math.max(0, points.length - 1)} s).
          </p>

          <div className="space-y-2">
          <div>
            <h3 className="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              Acceleration — ax, ay, az
            </h3>
            <div className="h-52 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: chartMarginTop,
                    right: chartMarginRightLegend,
                    left: 2,
                    bottom: chartMarginBottomTicksOnly,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartBox.grid} />
                  <XAxis
                    dataKey="tSec"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickCount={8}
                    tickFormatter={(v) => `${v}s`}
                    stroke={chartBox.axis}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                  <YAxis stroke={chartBox.axis} tick={{ fill: '#94a3b8', fontSize: 10 }} width={36} />
                  <Tooltip
                    labelFormatter={(tSec) => `t = ${tSec}s`}
                    contentStyle={{
                      background: chartBox.tooltipBg,
                      border: `1px solid ${chartBox.tooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    wrapperStyle={{ fontSize: 11, lineHeight: 1.15, paddingLeft: 4 }}
                  />
                  <Line type="linear" dataKey="ax" name="ax" stroke={AXIS_RGB.x} dot={false} strokeWidth={2} isAnimationActive={false} />
                  <Line type="linear" dataKey="ay" name="ay" stroke={AXIS_RGB.y} dot={false} strokeWidth={2} isAnimationActive={false} />
                  <Line type="linear" dataKey="az" name="az" stroke={AXIS_RGB.z} dot={false} strokeWidth={2} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              Angular rate — gx, gy, gz
            </h3>
            <div className="h-52 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{
                    top: chartMarginTop,
                    right: chartMarginRightLegend,
                    left: 2,
                    bottom: chartMarginBottomTicksOnly,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartBox.grid} />
                  <XAxis
                    dataKey="tSec"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tickCount={8}
                    tickFormatter={(v) => `${v}s`}
                    stroke={chartBox.axis}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                  />
                  <YAxis stroke={chartBox.axis} tick={{ fill: '#94a3b8', fontSize: 10 }} width={36} />
                  <Tooltip
                    labelFormatter={(tSec) => `t = ${tSec}s`}
                    contentStyle={{
                      background: chartBox.tooltipBg,
                      border: `1px solid ${chartBox.tooltipBorder}`,
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    wrapperStyle={{ fontSize: 11, lineHeight: 1.15, paddingLeft: 4 }}
                  />
                  <Line type="linear" dataKey="gx" name="gx" stroke={AXIS_RGB.x} dot={false} strokeWidth={2} isAnimationActive={false} />
                  <Line type="linear" dataKey="gy" name="gy" stroke={AXIS_RGB.y} dot={false} strokeWidth={2} isAnimationActive={false} />
                  <Line type="linear" dataKey="gz" name="gz" stroke={AXIS_RGB.z} dot={false} strokeWidth={2} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h3 className="mb-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
              Magnetometer — mx, my, mz
            </h3>
            <div className="h-52 w-full min-w-0">
              {magPoints.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 px-4 py-10 text-center text-sm text-slate-500">
                  No magnetometer samples yet — check the MAG topic and firmware <code className="text-slate-400">mag</code> publish path.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={magChartData}
                    margin={{
                      top: chartMarginTop,
                      right: chartMarginRightLegend,
                      left: 2,
                      bottom: chartMarginBottomWithLabel,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartBox.grid} />
                    <XAxis
                      dataKey="tSec"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      tickCount={8}
                      tickFormatter={(v) => `${v}s`}
                      label={{
                        value: 'Time (s) @ 1 Hz',
                        position: 'insideBottom',
                        offset: -10,
                        fill: '#64748b',
                        fontSize: 10,
                      }}
                      stroke={chartBox.axis}
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                    />
                    <YAxis stroke={chartBox.axis} tick={{ fill: '#94a3b8', fontSize: 10 }} width={36} />
                    <Tooltip
                      labelFormatter={(tSec) => `t = ${tSec}s`}
                      contentStyle={{
                        background: chartBox.tooltipBg,
                        border: `1px solid ${chartBox.tooltipBorder}`,
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      labelStyle={{ color: '#e2e8f0' }}
                    />
                    <Legend
                      verticalAlign="middle"
                      align="right"
                      layout="vertical"
                      wrapperStyle={{ fontSize: 11, lineHeight: 1.15, paddingLeft: 4 }}
                    />
                    <Line type="linear" dataKey="mx" name="mx" stroke={AXIS_RGB.x} dot={false} strokeWidth={2} isAnimationActive={false} />
                    <Line type="linear" dataKey="my" name="my" stroke={AXIS_RGB.y} dot={false} strokeWidth={2} isAnimationActive={false} />
                    <Line type="linear" dataKey="mz" name="mz" stroke={AXIS_RGB.z} dot={false} strokeWidth={2} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          </div>

          <p className="text-[11px] text-slate-500">
            IMU: last {points.length} sample(s); MAG: last {magPoints.length} sample(s) (max {MAX_POINTS} each, ≈{' '}
            {MAX_POINTS * IMU_SAMPLE_INTERVAL_SEC}s at 1 Hz). Firmware{' '}
            <code className="text-slate-400">sequence</code> is in each payload for debugging.
          </p>
        </>
      ) : null}
    </div>
  )
}
