import { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  Menu,
  Radio,
  Server,
  X,
} from "lucide-react";
import { ConnectionControls } from "./ConnectionControls";
import { telemetryTopics, useMqttConnection } from "../hooks";
import {
  fetchBitstreamClientConfig,
  resolveBitstreamApiBaseUrl,
} from "../api/fetchBitstreamClientConfig";
import { canConnectMqtt, useMqttStore } from "../store/mqttStore";

export function MqttConnectionController() {
  const { mqttBaseTopic, errorText, status } = useMqttConnection();
  const connected = status === "connected";
  const connecting = status === "connecting";
  const [menuOpen, setMenuOpen] = useState(false);
  const [showConnectionSettings, setShowConnectionSettings] = useState(false);
  const [modalRendered, setModalRendered] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const closeConnectionModal = () => setShowConnectionSettings(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (menuRef.current?.contains(target)) return;
      setMenuOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onEscape);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!showConnectionSettings) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeConnectionModal();
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("keydown", onEscape);
    };
  }, [showConnectionSettings]);

  useEffect(() => {
    if (showConnectionSettings) {
      setModalRendered(true);
      const raf = requestAnimationFrame(() => setModalVisible(true));
      return () => cancelAnimationFrame(raf);
    }
    setModalVisible(false);
    if (!modalRendered) return;
    const timer = window.setTimeout(() => setModalRendered(false), 180);
    return () => window.clearTimeout(timer);
  }, [showConnectionSettings, modalRendered]);

  // Startup bootstrap: preload connection values, then auto-connect once.
  useEffect(() => {
    let cancelled = false;
    const bitstreamBase = resolveBitstreamApiBaseUrl();

    (async () => {
      if (bitstreamBase) {
        const cfg = await fetchBitstreamClientConfig(bitstreamBase);
        if (!cancelled && cfg?.ok) {
          const s = useMqttStore.getState();
          if (typeof cfg.mqttClientId === "string") {
            s.setMqttClientId(cfg.mqttClientId);
          }
          if (typeof cfg.mqttBaseTopic === "string") {
            s.setMqttBaseTopic(cfg.mqttBaseTopic);
          }
          if (typeof cfg.mqttWsUrl === "string" && cfg.mqttWsUrl.trim()) {
            s.setWsUrl(cfg.mqttWsUrl.trim());
          }
        }
      }

      if (!cancelled) {
        const s = useMqttStore.getState();
        if (
          s.status !== "connected" &&
          s.status !== "connecting" &&
          canConnectMqtt(s.mqttBaseTopic, s.mqttClientId)
        ) {
          s.connect();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const beaconButtonClass = connected
    ? "bg-emerald-500/15 ring-1 ring-emerald-500/30 hover:bg-emerald-500/20"
    : connecting
      ? "bg-amber-500/15 ring-1 ring-red-500/30 hover:bg-amber-500/20"
      : "bg-red-500/15 ring-1 ring-amber-500/30 hover:bg-red-500/20";

  const beaconIconClass = connected
    ? "h-5 w-5 animate-pulse text-emerald-400"
    : connecting
      ? "h-5 w-5 animate-pulse text-amber-400"
      : "h-5 w-5 animate-pulse text-red-400";

  const helpBody = (
    <>
      <strong>MQTT base topic</strong> and <strong>Client ID</strong> are required before
      Connect (same values as <code className="text-slate-300">mqtt_client_config.h</code>;
      set <code className="text-slate-300">VITE_BITSTREAM_API_URL</code> to preload from
      Bitstream). Subscribes to:{" "}
      {telemetryTopics(mqttBaseTopic).map((t, i) => (
        <span key={t}>
          {i > 0 ? ", " : null}
          <code className="text-emerald-400">{t}</code>
        </span>
      ))}
      . JSON theme: open the menu on each telemetry card.
    </>
  );

  return (
    <header className="border-b border-slate-800 pb-4">
      <div className="flex items-center gap-3">
        <div className="group relative shrink-0">
          <button
            type="button"
            className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50 ${beaconButtonClass}`}
            aria-label="Telemetry topics and MQTT base topic help"
            aria-describedby="mqtt-telemetry-help"
          >
            <Radio className={beaconIconClass} aria-hidden />
          </button>
          <div
            id="mqtt-telemetry-help"
            role="tooltip"
            className="pointer-events-none invisible absolute left-0 top-full z-50 w-[min(calc(100vw-2rem),28rem)] pt-2 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:visible group-focus-within:pointer-events-auto group-focus-within:opacity-100"
          >
            <div className="rounded-lg border border-slate-700 bg-slate-900/98 p-3 text-sm leading-relaxed text-slate-300 shadow-xl ring-1 ring-slate-800">
              <p className="m-0">{helpBody}</p>
            </div>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-x-2 gap-y-1 text-2xl font-semibold tracking-tight">
            <span className="text-white">TESAIoT</span>
            <span className="text-base font-medium tracking-normal text-slate-400">
              IoT Applications
            </span>
          </h1>
          <p className="mt-1.5 text-xs font-normal tracking-wide text-slate-500">
            By{" "}
            <span className="text-slate-400">TESAIoT</span> Developer Team
          </p>
        </div>
        <div className="relative shrink-0" ref={menuRef}>
          <button
            type="button"
            aria-label="Open header menu"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-900/70 text-slate-300 transition hover:bg-slate-800/80 hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          {menuOpen ? (
            <div
              role="menu"
              aria-label="Header menu"
              className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-700 bg-slate-900/95 p-1.5 shadow-xl ring-1 ring-slate-800"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-200 transition hover:bg-slate-800/90"
                onClick={() => {
                  setShowConnectionSettings((v) => !v);
                  setMenuOpen(false);
                }}
              >
                <Server className="h-4 w-4 text-slate-400" aria-hidden />
                <span>Connection Settings</span>
                {showConnectionSettings ? (
                  <Check className="ml-auto h-4 w-4 text-emerald-400" aria-hidden />
                ) : null}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {modalRendered ? (
        <div
          className={`fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 backdrop-blur-sm transition-opacity duration-200 ${
            modalVisible ? "bg-slate-950/70 opacity-100" : "bg-slate-950/0 opacity-0"
          }`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="connection-settings-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeConnectionModal();
            }
          }}
        >
          <div
            className={`w-full max-w-4xl overflow-hidden rounded-xl border border-slate-800 bg-slate-950 shadow-2xl ring-1 ring-slate-800/80 transition-all duration-200 ${
              modalVisible
                ? "translate-y-0 scale-100 opacity-100"
                : "translate-y-2 scale-[0.98] opacity-0"
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
              <h2
                id="connection-settings-title"
                className="inline-flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-slate-300"
              >
                <Server className="h-4 w-4 text-slate-400" aria-hidden />
                <span>Connection Settings</span>
              </h2>
              <button
                type="button"
                aria-label="Close connection settings"
                onClick={closeConnectionModal}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500/50"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto p-4">
              <ConnectionControls className="mt-0" />
            </div>
          </div>
        </div>
      ) : null}

      {errorText ? (
        <p
          className="mt-3 flex items-start gap-2 text-sm text-red-400"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{errorText}</span>
        </p>
      ) : null}
    </header>
  );
}
