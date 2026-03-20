"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Terminal, Send, Trash2, Copy, ChevronRight } from "lucide-react";

interface HistoryEntry {
  command: string;
  output: string;
  error?: string;
  duration?: number;
  ts: Date;
}

const QUICK_COMMANDS = [
  "df -h /",
  "free -h",
  "uptime",
  "ps aux | grep node",
  "systemctl status mission-control",
  "pm2 list",
  "ls /root/.openclaw/workspace",
  "git -C /root/.openclaw/workspace/mission-control status",
  "journalctl -u mission-control -n 20 --no-pager",
  "docker ps",
  "netstat -tlnp",
  "cat /proc/loadavg",
];

export default function TerminalPage() {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [cmdHistoryIdx, setCmdHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [history]);

  const runCommand = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setLoading(true);
    setCmdHistory((prev) => [trimmed, ...prev.slice(0, 99)]);
    setCmdHistoryIdx(-1);
    setInput("");

    try {
      const res = await fetch("/api/terminal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: trimmed }),
      });
      const data = await res.json();

      setHistory((prev) => [
        ...prev,
        {
          command: trimmed,
          output: data.output || "",
          error: !res.ok ? data.error : undefined,
          duration: data.duration,
          ts: new Date(),
        },
      ]);
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        {
          command: trimmed,
          output: "",
          error: String(err),
          ts: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      runCommand(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const newIdx = Math.min(cmdHistoryIdx + 1, cmdHistory.length - 1);
      setCmdHistoryIdx(newIdx);
      if (cmdHistory[newIdx]) setInput(cmdHistory[newIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const newIdx = Math.max(cmdHistoryIdx - 1, -1);
      setCmdHistoryIdx(newIdx);
      setInput(newIdx === -1 ? "" : (cmdHistory[newIdx] || ""));
    }
  };

  const clearHistory = () => setHistory([]);

  const copyAll = () => {
    const text = history.map((h) => `$ ${h.command}\n${h.output}`).join("\n\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div className="px-6 pt-5 pb-3 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[1.75rem] font-bold mb-0.5 text-primary font-[family-name:var(--font-display)]">
              Browser Terminal
            </h1>
            <p className="text-[0.8rem] text-quaternary">
              Read-only commands only (ls, cat, df, ps, git status, etc.)
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.8rem] bg-secondary border border-primary cursor-pointer text-quaternary"
            >
              <Copy className="w-3.5 h-3.5" /> Copy
            </button>
            <button
              onClick={clearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.8rem] bg-secondary border border-primary cursor-pointer text-quaternary"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </div>
      </div>

      {/* Quick commands */}
      <div className="px-6 py-2 shrink-0">
        <div className="flex flex-wrap gap-1.5">
          {QUICK_COMMANDS.map((cmd) => (
            <button
              key={cmd}
              onClick={() => runCommand(cmd)}
              disabled={loading}
              className="px-2.5 py-1 rounded-md text-[0.72rem] font-mono bg-tertiary text-secondary border border-primary cursor-pointer disabled:opacity-50"
            >
              {cmd.length > 30 ? cmd.slice(0, 28) + "…" : cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal output */}
      <div
        ref={outputRef}
        style={{
          flex: 1, overflow: "auto",
          margin: "0.75rem 1.5rem",
          backgroundColor: "#0d1117",
          borderRadius: "0.75rem",
          padding: "1rem",
          border: "1px solid #30363d",
          fontFamily: "monospace",
          fontSize: "0.8rem",
          lineHeight: 1.6,
        }}
        onClick={() => inputRef.current?.focus()}
      >
        {history.length === 0 ? (
          <div style={{ color: "#8b949e", textAlign: "center", paddingTop: "2rem" }}>
            <Terminal className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>Type a command or click a quick command above</p>
            <p style={{ fontSize: "0.7rem", marginTop: "0.5rem" }}>
              Arrow Up/Down for command history
            </p>
          </div>
        ) : (
          history.map((entry, i) => (
            <div key={i} style={{ marginBottom: "1rem" }}>
              {/* Command prompt */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ color: "#4ade80" }}>tenacitas@srv</span>
                <span style={{ color: "#8b949e" }}>:</span>
                <span style={{ color: "#60a5fa" }}>~</span>
                <span style={{ color: "#c9d1d9" }}>$ {entry.command}</span>
                {entry.duration != null && (
                  <span style={{ color: "#484f58", fontSize: "0.7rem" }}>({entry.duration}ms)</span>
                )}
              </div>

              {/* Output */}
              {entry.error && (
                <pre style={{ color: "#f87171", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {entry.error}
                </pre>
              )}
              {entry.output && (
                <pre style={{ color: "#c9d1d9", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {entry.output}
                </pre>
              )}
            </div>
          ))
        )}

        {/* Loading indicator */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#8b949e" }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#4ade80", animation: "pulse 1s infinite" }} />
            Running...
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        margin: "0 1.5rem 1.5rem",
        padding: "0.625rem 1rem",
        backgroundColor: "#0d1117",
        borderRadius: "0.75rem",
        border: "1px solid #30363d",
        flexShrink: 0,
      }}>
        <span style={{ color: "#4ade80", fontFamily: "monospace", fontSize: "0.875rem", flexShrink: 0 }}>$</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          placeholder="Enter command..."
          autoComplete="off"
          spellCheck={false}
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            color: "#c9d1d9",
            fontFamily: "monospace",
            fontSize: "0.875rem",
          }}
        />
        <button
          onClick={() => runCommand(input)}
          disabled={loading || !input.trim()}
          style={{
            padding: "0.375rem 0.75rem",
            borderRadius: "0.5rem",
            backgroundColor: input.trim() && !loading ? "rgba(74,222,128,0.15)" : "transparent",
            color: input.trim() && !loading ? "#4ade80" : "#484f58",
            border: "none", cursor: input.trim() && !loading ? "pointer" : "not-allowed",
            display: "flex", alignItems: "center", gap: "0.375rem",
            fontSize: "0.8rem",
          }}
        >
          <Send className="w-3.5 h-3.5" />
          Run
        </button>
      </div>
    </div>
  );
}
