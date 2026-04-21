import { useEffect, useState } from "react";
import {
  CheckCircle2,
  Circle,
  Fingerprint,
  Hash,
  Loader2,
  Network,
  Plug,
  Server,
  SlidersHorizontal,
  Unplug,
  Webhook,
  XCircle,
} from "lucide-react";
import {
  fetchBitstreamClientConfig,
  resolveBitstreamApiBaseUrl,
} from "../api/fetchBitstreamClientConfig";
import { FieldLabel } from "./FieldLabel";
import { useMqttConnection } from "../hooks";
import { canConnectMqtt } from "../store/mqttStore";

type ConnectionControlsProps = {
  /** Extra classes for the root row (default adds `mt-4`). */
  className?: string;
};

type BrokerInfo = {
  host: string;
  tcpPort: number;
  wsPort: number;
  wsUrl: string;
};

function parseWsEndpoint(urlRaw: string): { host: string; port: number | null } | null {
  const t = urlRaw.trim();
  if (!t) return null;
  try {
    const u = new URL(t);
    const host = u.hostname?.trim() ?? "";
    const portNum = u.port ? Number.parseInt(u.port, 10) : null;
    return { host, port: Number.isFinite(portNum as number) ? (portNum as number) : null };
  } catch {
    return null;
  }
}

export function ConnectionControls({ className }: ConnectionControlsProps) {
  const {
    wsUrl,
    mqttBaseTopic,
    mqttClientId,
    status,
    setWsUrl,
    setMqttBaseTopic,
    setMqttClientId,
    connect,
    disconnect,
    canEditConnectionFields,
  } = useMqttConnection();

  const fieldsReady = canConnectMqtt(mqttBaseTopic, mqttClientId);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [brokerInfo, setBrokerInfo] = useState<BrokerInfo | null>(null);
  const parsedWs = parseWsEndpoint(wsUrl);
  const displayBrokerHost = brokerInfo?.host || parsedWs?.host || "—";
  const displayTcpPort = brokerInfo?.tcpPort ?? 1883;
  const displayTcpUrl =
    displayBrokerHost !== "—"
      ? `mqtt://${displayBrokerHost}:${displayTcpPort}`
      : "—";

  useEffect(() => {
    let cancelled = false;
    const bitstreamBase = resolveBitstreamApiBaseUrl();

    (async () => {
      if (bitstreamBase) {
        const cfg = await fetchBitstreamClientConfig(bitstreamBase);
        if (!cancelled && cfg?.ok) {
          if (typeof cfg.mqttClientId === "string") {
            setMqttClientId(cfg.mqttClientId);
          }
          if (typeof cfg.mqttBaseTopic === "string") {
            setMqttBaseTopic(cfg.mqttBaseTopic);
          }
          const tcpPort =
            typeof cfg.mqttTcpPort === "number" ? cfg.mqttTcpPort : 1883;
          const wsPort =
            typeof cfg.mqttWsPort === "number" ? cfg.mqttWsPort : 9001;
          const brokerHost =
            typeof cfg.mqttBrokerAddress === "string"
              ? cfg.mqttBrokerAddress.trim()
              : "";
          const wsUrlFromApi =
            typeof cfg.mqttWsUrl === "string" ? cfg.mqttWsUrl.trim() : "";
          setBrokerInfo({
            host: brokerHost,
            tcpPort,
            wsPort,
            wsUrl: wsUrlFromApi,
          });
          if (typeof cfg.mqttWsUrl === "string" && cfg.mqttWsUrl.trim()) {
            setWsUrl(cfg.mqttWsUrl.trim());
          }
        }
      }
      // Auto-connect is handled by MqttConnectionController (always mounted).
    })();

    return () => {
      cancelled = true;
    };
  }, [setMqttBaseTopic, setMqttClientId, setWsUrl]);

  return (
    <div className={`space-y-3 ${className ?? "mt-4"}`}>
      <div className="flex flex-wrap items-end gap-3">
      <label className="flex min-w-[200px] flex-1 flex-col gap-1.5 text-left">
        <FieldLabel icon={Hash}>MQTT base topic</FieldLabel>
        <div className="relative">
          <Hash
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden
          />
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-10 pr-3 text-sm text-white outline-none ring-emerald-500/50 focus:ring-2"
            value={mqttBaseTopic}
            onChange={(e) => setMqttBaseTopic(e.target.value)}
            disabled={!canEditConnectionFields}
            placeholder="Required — e.g. tesaiot/sensors"
            required
            aria-required
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>
      </label>
      <label className="flex min-w-[180px] flex-1 flex-col gap-1.5 text-left">
        <FieldLabel icon={Fingerprint}>Client ID</FieldLabel>
        <div className="relative">
          <Fingerprint
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
            aria-hidden
          />
          <input
            className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-10 pr-3 text-sm text-white outline-none ring-emerald-500/50 focus:ring-2"
            value={mqttClientId}
            onChange={(e) => setMqttClientId(e.target.value)}
            disabled={!canEditConnectionFields}
            placeholder="Required — firmware / dashboard client id"
            required
            aria-required
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
            aria-label="MQTT client ID"
          />
        </div>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex w-36 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
          onClick={connect}
          disabled={
            status === "connecting" ||
            status === "connected" ||
            !fieldsReady
          }
          title={
            fieldsReady
              ? undefined
              : "Enter MQTT base topic and Client ID before connecting"
          }
        >
          {status === "connecting" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Plug className="h-4 w-4" aria-hidden />
          )}
          {status === "connecting" ? "Connecting…" : "Connect"}
        </button>
        <button
          type="button"
          className="inline-flex w-36 items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700 disabled:opacity-50"
          onClick={disconnect}
          disabled={status !== "connected" && status !== "connecting"}
        >
          <Unplug className="h-4 w-4" aria-hidden />
          Disconnect
        </button>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
            status === "connected"
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : status === "error"
                ? "border-red-500/40 bg-red-500/10 text-red-400"
                : status === "connecting"
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-400"
                  : "border-slate-700 bg-slate-900/80 text-slate-500"
          }`}
        >
          {status === "connected" ? (
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          ) : status === "error" ? (
            <XCircle className="h-3.5 w-3.5" aria-hidden />
          ) : status === "connecting" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Circle className="h-3.5 w-3.5" aria-hidden />
          )}
          {status === "connected"
            ? "Connected"
            : status === "connecting"
              ? "Connecting…"
              : status === "error"
                ? "Error"
                : "Disconnected"}
        </span>
      </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-950/30">
        <button
          type="button"
          className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-slate-400 hover:text-slate-200"
          onClick={() => setShowAdvanced((v) => !v)}
          aria-expanded={showAdvanced}
        >
          <span className="inline-flex items-center gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            <span>Advanced</span>
          </span>
          <span aria-hidden>{showAdvanced ? "−" : "+"}</span>
        </button>
        {showAdvanced ? (
          <div className="space-y-3 border-t border-slate-800 px-3 pb-3 pt-2">
            <div className="flex flex-wrap gap-3">
              <label className="flex min-w-[280px] flex-1 flex-col gap-1.5 text-left">
                <FieldLabel icon={Webhook}>WebSocket URL</FieldLabel>
                <div>
                  <span
                    className="block w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-sm font-mono text-slate-500"
                    title={wsUrl || "—"}
                  >
                    {wsUrl || "—"}
                  </span>
                </div>
              </label>
              <label className="flex min-w-[280px] flex-1 flex-col gap-1.5 text-left">
                <FieldLabel icon={Network}>MQTT TCP URL</FieldLabel>
                <div>
                  <span
                    className="block w-full rounded-lg border border-slate-800 bg-slate-900/70 px-3 py-1.5 text-sm font-mono text-slate-500"
                    aria-label="MQTT TCP URL"
                    title={displayTcpUrl}
                  >
                    {displayTcpUrl}
                  </span>
                </div>
              </label>
            </div>
            <p className="flex items-start gap-2 text-xs text-slate-500">
              <Server
                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-600"
                aria-hidden
              />
              <span>
                Start the broker with{" "}
                <code className="text-slate-400">bitstream backend up</code>{" "}
                (or run manually in{" "}
                <code className="text-slate-400">applications/backend</code> →{" "}
                <code className="text-slate-400">docker compose up -d</code>{" "}
                ). The UI uses WebSocket{" "}
                <code className="text-slate-400">9001/mqtt</code> and MQTT TCP{" "}
                <code className="text-slate-400">1883</code>.
              </span>
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
