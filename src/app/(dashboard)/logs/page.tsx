"use client";

import { useState, useEffect, useRef } from "react";
import { Terminal, Play, Square, Trash2, Download, Circle, Server } from "lucide-react";

interface LogLine {
  line: string;
  ts: string;
  id: number;
}

const SERVICES = [
  { name: "mission-control", backend: "systemd", label: "Mission Control" },
  { name: "classvault", backend: "pm2", label: "ClassVault" },
  { name: "content-vault", backend: "pm2", label: "Content Vault" },
  { name: "brain", backend: "pm2", label: "Brain" },
  { name: "postiz-simple", backend: "pm2", label: "Postiz" },
  { name: "openclaw-gateway", backend: "systemd", label: "Gateway" },
];

function getLineColor(line: string): string {
  const lower = line.toLowerCase();
  if (lower.includes("error") || lower.includes("err]") || lower.includes("exception")) return "#f87171";
  if (lower.includes("warn") || lower.includes("warning")) return "#fbbf24";
  if (lower.includes("info") || lower.includes("[info]")) return "#60a5fa";
  if (lower.includes("success") || lower.includes("✓") || lower.includes("ready")) return "#4ade80";
  if (lower.startsWith("[stream]")) return "#a78bfa";
  return "#c9d1d9";
}

export default function LogsPage() {
  const [selectedService, setSelectedService] = useState(SERVICES[0]);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);
  const idRef = useRef(0);

  const startStream = () => {
    if (esRef.current) {
      esRef.current.close();
    }

    setLines([]);
    setStreaming(true);

    const es = new EventSource(
      `/api/logs/stream?service=${encodeURIComponent(selectedService.name)}&backend=${encodeURIComponent(selectedService.backend)}`
    );

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setLines((prev) => {
          const newLine = { line: data.line, ts: data.ts, id: ++idRef.current };
          const updated = [...prev, newLine];
          // Keep max 2000 lines
          return updated.length > 2000 ? updated.slice(-2000) : updated;
        });
      } catch {}
    };

    es.onerror = () => {
      setStreaming(false);
      es.close();
    };

    esRef.current = es;
  };

  const stopStream = () => {
    esRef.current?.close();
    esRef.current = null;
    setStreaming(false);
  };

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      esRef.current?.close();
    };
  }, []);

  const handleClear = () => setLines([]);

  const handleDownload = () => {
    const text = lines.map((l) => `[${l.ts}] ${l.line}`).join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedService.name}-logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredLines = filter
    ? lines.filter((l) => l.line.toLowerCase().includes(filter.toLowerCase()))
    : lines;

  return (
    <div className="flex flex-col h-full gap-0 bg-primary">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] font-bold text-primary mb-1">
          Log Viewer
        </h1>
        <p className="text-secondary text-sm">
          Real-time log streaming from services
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-3 items-center px-6 py-3 border-b border-primary bg-secondary">
        {/* Service selector */}
        <div className="flex gap-1.5 flex-wrap">
          {SERVICES.map((svc) => (
            <button
              key={svc.name}
              onClick={() => { setSelectedService(svc); stopStream(); setLines([]); }}
              className={[
                "px-3.5 py-1.5 rounded-full text-[0.8rem] font-medium border cursor-pointer",
                selectedService.name === svc.name
                  ? "bg-brand-600/15 text-brand-600 border-brand-600/40"
                  : "bg-tertiary text-secondary border-primary",
              ].join(" ")}
            >
              {svc.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex gap-2 items-center">
          {/* Filter */}
          <input
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 bg-tertiary border border-primary rounded-lg text-primary text-[0.8rem] outline-none w-48"
          />

          {/* Auto-scroll toggle */}
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title="Auto-scroll"
            className={[
              "px-2.5 py-1.5 rounded-lg text-xs border cursor-pointer",
              autoScroll
                ? "bg-success-600/10 text-success-600 border-success-600/30"
                : "bg-tertiary text-quaternary border-primary",
            ].join(" ")}
          >
            ↓ Auto
          </button>

          {/* Clear */}
          <button
            onClick={handleClear}
            title="Clear"
            className="px-2.5 py-1.5 rounded-lg bg-tertiary border border-primary cursor-pointer text-quaternary"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            title="Download logs"
            className="px-2.5 py-1.5 rounded-lg bg-tertiary border border-primary cursor-pointer text-quaternary"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Start/Stop stream */}
          <button
            onClick={streaming ? stopStream : startStream}
            className={[
              "flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer font-semibold text-sm",
              streaming
                ? "bg-error-600/15 text-error-600 border-error-600/30"
                : "bg-success-600/15 text-success-600 border-success-600/30",
            ].join(" ")}
          >
            {streaming ? (
              <>
                <Square className="w-3.5 h-3.5" />
                Stop
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Stream
              </>
            )}
          </button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3 px-6 py-1.5 bg-[#0d1117] border-b border-[#30363d] text-xs">
        <div className="flex items-center gap-1.5">
          <Circle
            className="w-2 h-2"
            style={{ fill: streaming ? "#4ade80" : "#6b7280", color: streaming ? "#4ade80" : "#6b7280" }}
          />
          <span style={{ color: streaming ? "#4ade80" : "#6b7280" }}>
            {streaming ? "LIVE" : "STOPPED"}
          </span>
        </div>
        <span className="text-[#8b949e]">
          {selectedService.label} · {selectedService.backend}
        </span>
        <span className="text-[#8b949e] ml-auto">
          {filteredLines.length} lines{filter && ` (filtered from ${lines.length})`}
        </span>
      </div>

      {/* Log output */}
      <div
        ref={logRef}
        onScroll={() => {
          if (logRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = logRef.current;
            setAutoScroll(scrollHeight - scrollTop - clientHeight < 50);
          }
        }}
        className="flex-1 overflow-auto bg-[#0d1117] px-6 py-4 font-mono text-[0.8rem] leading-relaxed"
      >
        {filteredLines.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#8b949e]">
            <Terminal className="w-12 h-12 mb-3 opacity-30" />
            <p>{streaming ? "Waiting for logs..." : "Click 'Stream' to start live log viewer"}</p>
          </div>
        ) : (
          filteredLines.map((l) => (
            <div key={l.id} className="flex gap-4 items-start">
              <span className="text-[#484f58] shrink-0 text-[0.7rem] pt-[0.1rem]">
                {new Date(l.ts).toLocaleTimeString()}
              </span>
              <span style={{ color: getLineColor(l.line), wordBreak: "break-all" }}>
                {l.line}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
