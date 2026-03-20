"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MessageSquare,
  Clock,
  Bot,
  RefreshCw,
  X,
  ChevronRight,
  Wrench,
  User,
  AlertTriangle,
  Search,
  Cpu,
  TrendingUp,
  Hash,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Session {
  id: string;
  key: string;
  type: "main" | "cron" | "subagent" | "direct" | "unknown";
  typeLabel: string;
  typeEmoji: string;
  sessionId: string | null;
  cronJobId?: string;
  subagentId?: string;
  updatedAt: number;
  ageMs: number;
  model: string;
  modelProvider: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  contextTokens: number;
  contextUsedPercent: number | null;
  aborted: boolean;
}

interface Message {
  id: string;
  type: "user" | "assistant" | "tool_use" | "tool_result" | "model_change" | "system";
  role?: string;
  content: string;
  timestamp: string;
  model?: string;
  toolName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

function shortModel(model: string): string {
  // claude-sonnet-4-5 → Sonnet 4.5
  // claude-opus-4-6 → Opus 4.6
  // claude-haiku-3-5 → Haiku 3.5
  const m = model.replace("anthropic/", "").replace("claude-", "");
  const parts = m.split("-");
  if (parts.length >= 2) {
    const name = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
    const ver = parts.slice(1).join(".");
    return `${name} ${ver}`;
  }
  return model;
}

function typeColor(type: Session["type"]): string {
  switch (type) {
    case "main": return "var(--brand-600)";
    case "cron": return "#a78bfa";
    case "subagent": return "#60a5fa";
    case "direct": return "#4ade80";
    default: return "var(--text-quaternary-500)";
  }
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.type === "user";
  const isTool = msg.type === "tool_use";
  const isResult = msg.type === "tool_result";

  if (isTool) {
    return (
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg mb-2 text-[0.78rem] font-mono border"
        style={{
          backgroundColor: "rgba(96,165,250,0.08)",
          border: "1px solid rgba(96,165,250,0.2)",
        }}
      >
        <Wrench className="shrink-0 mt-[2px]" style={{ width: "13px", height: "13px", color: "#60a5fa" }} />
        <span className="shrink-0 font-semibold" style={{ color: "#60a5fa" }}>
          {msg.toolName}
        </span>
        <span className="break-all text-[var(--text-quaternary-500)]">
          {msg.content.replace(`${msg.toolName}(`, "").replace(/\)$/, "").slice(0, 200)}
        </span>
      </div>
    );
  }

  if (isResult) {
    return (
      <div
        className="px-3 py-1.5 rounded-md mb-2 text-xs text-[var(--text-quaternary-500)] font-mono overflow-hidden text-ellipsis whitespace-nowrap"
        style={{
          maxHeight: "3rem",
          backgroundColor: "rgba(34,197,94,0.06)",
          border: "1px solid rgba(34,197,94,0.15)",
        }}
      >
        ↳ {msg.content}
      </div>
    );
  }

  return (
    <div
      className="flex gap-2.5 mb-3 items-start"
      style={{ flexDirection: isUser ? "row-reverse" : "row" }}
    >
      {/* Avatar */}
      <div
        className="flex items-center justify-center shrink-0 text-[11px]"
        style={{
          width: "24px",
          height: "24px",
          borderRadius: "12px",
          backgroundColor: isUser ? "var(--brand-600)" : "var(--bg-tertiary)",
        }}
      >
        {isUser ? (
          <User style={{ width: "12px", height: "12px", color: "var(--bg-primary)" }} />
        ) : (
          <Bot style={{ width: "12px", height: "12px", color: "var(--brand-600)" }} />
        )}
      </div>

      {/* Bubble */}
      <div
        className="text-[0.82rem] leading-relaxed text-[var(--text-primary-900)] break-words whitespace-pre-wrap"
        style={{
          maxWidth: "78%",
          padding: "0.5rem 0.75rem",
          borderRadius: isUser ? "1rem 1rem 0.25rem 1rem" : "1rem 1rem 1rem 0.25rem",
          backgroundColor: isUser ? "rgba(255,59,48,0.12)" : "var(--bg-tertiary)",
          border: `1px solid ${isUser ? "rgba(255,59,48,0.2)" : "var(--border-primary)"}`,
        }}
      >
        {msg.content.length > 800
          ? msg.content.slice(0, 800) + "\n…(truncated)"
          : msg.content}
      </div>
    </div>
  );
}

// ─── Session Detail Panel ────────────────────────────────────────────────────

function SessionDetail({
  session,
  onClose,
}: {
  session: Session;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session.sessionId) {
      setLoading(false);
      setError("No session file available");
      return;
    }

    setLoading(true);
    setError(null);
    fetch(`/api/sessions?id=${session.sessionId}`)
      .then((r) => r.json())
      .then((data) => {
        setMessages(data.messages || []);
        if (data.error) setError(data.error);
      })
      .catch(() => setError("Failed to load messages"))
      .finally(() => setLoading(false));
  }, [session.sessionId]);

  const userCount = messages.filter((m) => m.type === "user").length;
  const assistantCount = messages.filter((m) => m.type === "assistant").length;
  const toolCount = messages.filter((m) => m.type === "tool_use").length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-stretch justify-end"
      style={{
        backgroundColor: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      <div
        className="flex flex-col overflow-hidden bg-[var(--bg-secondary)] border-l border-[var(--border-primary)]"
        style={{ width: "min(640px, 100vw)", height: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-[var(--border-primary)] shrink-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl">{session.typeEmoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 rounded-full"
                  style={{
                    padding: "0.15rem 0.5rem",
                    borderRadius: "9999px",
                    backgroundColor: `color-mix(in srgb, ${typeColor(session.type)} 15%, transparent)`,
                    color: typeColor(session.type),
                  }}
                >
                  {session.typeLabel}
                </span>
                {session.aborted && (
                  <span
                    className="text-[0.7rem] text-[var(--error-600)] px-2 rounded-full"
                    style={{
                      padding: "0.15rem 0.5rem",
                      backgroundColor: "rgba(239,68,68,0.15)",
                    }}
                  >
                    ⚠ Aborted
                  </span>
                )}
              </div>
              <div className="font-mono text-[0.7rem] text-[var(--text-quaternary-500)] mt-[0.2rem] overflow-hidden text-ellipsis whitespace-nowrap">
                {session.key}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-transparent border-none cursor-pointer text-[var(--text-quaternary-500)] shrink-0 hover:text-[var(--text-primary-900)]"
            >
              <X style={{ width: "16px", height: "16px" }} />
            </button>
          </div>

          {/* Stats row */}
          <div className="flex gap-4 flex-wrap">
            {[
              { icon: Cpu, label: shortModel(session.model), color: "#a78bfa" },
              { icon: Hash, label: `${formatTokens(session.totalTokens)} tokens`, color: "var(--brand-600)" },
              {
                icon: TrendingUp,
                label: session.contextUsedPercent !== null ? `${session.contextUsedPercent}% ctx` : "ctx n/a",
                color: session.contextUsedPercent !== null && session.contextUsedPercent > 80
                  ? "var(--error-600)"
                  : "var(--text-quaternary-500)",
              },
              {
                icon: Clock,
                label: formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true }),
                color: "var(--text-quaternary-500)",
              },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="flex items-center gap-[0.3rem]">
                <Icon style={{ width: "12px", height: "12px", color }} />
                <span style={{ fontSize: "0.75rem", color }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Message stats strip */}
        {messages.length > 0 && (
          <div className="flex gap-4 px-5 py-2 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)] shrink-0">
            {[
              { label: `${userCount} user`, color: "var(--brand-600)" },
              { label: `${assistantCount} assistant`, color: "#60a5fa" },
              { label: `${toolCount} tool calls`, color: "#4ade80" },
            ].map(({ label, color }) => (
              <span key={label} style={{ fontSize: "0.72rem", color }}>
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center p-12 text-[var(--text-quaternary-500)] gap-2">
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  border: "2px solid var(--brand-600)",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Loading transcript...
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-xl text-[var(--error-600)] text-sm"
              style={{ backgroundColor: "rgba(239,68,68,0.1)" }}
            >
              <AlertTriangle style={{ width: "16px", height: "16px" }} />
              {error}
            </div>
          )}

          {!loading && !error && messages.length === 0 && (
            <div className="text-center p-12 text-[var(--text-quaternary-500)]">
              <MessageSquare
                style={{ width: "40px", height: "40px", margin: "0 auto 0.75rem", opacity: 0.3 }}
              />
              <p>No messages in this session</p>
            </div>
          )}

          {!loading &&
            messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)}
        </div>
      </div>
    </div>
  );
}

// ─── Session Row ──────────────────────────────────────────────────────────────

function SessionRow({
  session,
  onClick,
}: {
  session: Session;
  onClick: () => void;
}) {
  const color = typeColor(session.type);
  const contextBar =
    session.contextUsedPercent !== null ? Math.min(session.contextUsedPercent, 100) : null;

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 cursor-pointer border-b border-[var(--border-primary)] transition-colors hover:bg-[var(--bg-tertiary)]"
    >
      {/* Type badge */}
      <div
        className="flex items-center justify-center text-base shrink-0"
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "8px",
          backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
          border: `1px solid color-mix(in srgb, ${color} 25%, transparent)`,
        }}
      >
        {session.typeEmoji}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-[0.15rem]">
          <span
            className="text-[0.7rem] font-bold shrink-0"
            style={{
              padding: "0.1rem 0.4rem",
              borderRadius: "9999px",
              backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)`,
              color,
            }}
          >
            {session.typeLabel}
          </span>
          {session.aborted && (
            <span className="text-[0.65rem] text-[var(--error-600)]">⚠ aborted</span>
          )}
        </div>
        <div
          className="font-mono text-[0.72rem] text-[var(--text-quaternary-500)] overflow-hidden text-ellipsis whitespace-nowrap"
          title={session.key}
        >
          {session.key.replace("agent:main:", "")}
        </div>
      </div>

      {/* Model */}
      <div className="hidden sm:flex flex-col items-end" style={{ minWidth: "80px" }}>
        <span className="text-[0.7rem] whitespace-nowrap" style={{ color: "#a78bfa" }}>
          {shortModel(session.model)}
        </span>
      </div>

      {/* Tokens + ctx bar */}
      <div className="flex flex-col items-end" style={{ minWidth: "100px" }}>
        <span className="text-[0.75rem] font-semibold text-[var(--text-primary-900)]">
          {formatTokens(session.totalTokens)}
        </span>
        {contextBar !== null && (
          <div
            className="mt-1 overflow-hidden rounded-sm"
            style={{
              width: "64px",
              height: "3px",
              borderRadius: "2px",
              backgroundColor: "var(--border-primary)",
            }}
          >
            <div
              style={{
                width: `${contextBar}%`,
                height: "100%",
                borderRadius: "2px",
                backgroundColor:
                  contextBar > 80
                    ? "var(--error-600)"
                    : contextBar > 60
                    ? "var(--warning-600)"
                    : "var(--success-600)",
              }}
            />
          </div>
        )}
        <span className="text-[0.65rem] text-[var(--text-quaternary-500)] mt-[0.1rem]">
          {contextBar !== null ? `${contextBar}% ctx` : ""}
        </span>
      </div>

      {/* Age */}
      <div className="text-right" style={{ minWidth: "80px" }}>
        <span className="text-[0.72rem] text-[var(--text-quaternary-500)] whitespace-nowrap">
          {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
        </span>
      </div>

      <ChevronRight className="text-[var(--text-quaternary-500)] shrink-0" style={{ width: "14px", height: "14px" }} />
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type FilterType = "all" | "main" | "cron" | "subagent" | "direct";

const FILTER_TABS: Array<{ id: FilterType; label: string; emoji: string }> = [
  { id: "all", label: "All", emoji: "📋" },
  { id: "main", label: "Main", emoji: "🦞" },
  { id: "cron", label: "Cron", emoji: "🕐" },
  { id: "subagent", label: "Sub-agents", emoji: "🤖" },
  { id: "direct", label: "Chats", emoji: "💬" },
];

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/sessions");
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      setError("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const filtered = sessions.filter((s) => {
    if (filter !== "all" && s.type !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.key.toLowerCase().includes(q) && !s.model.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  // Counts per type
  const counts = sessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    acc.all = (acc.all || 0) + 1;
    return acc;
  }, {});

  // Stats
  const totalTokens = sessions.reduce((sum, s) => sum + s.totalTokens, 0);
  const uniqueModels = [...new Set(sessions.map((s) => s.model))];

  return (
    <>
      <div className="p-6 px-8 min-h-screen">
        {/* Header */}
        <div className="mb-6">
          <h1 className="font-[family-name:var(--font-display)] text-[1.75rem] font-bold text-[var(--text-primary-900)] tracking-[-1px] mb-1">
            💬 Session History
          </h1>
          <p className="text-[var(--text-secondary-700)] text-sm">
            All OpenClaw agent sessions — main, cron, sub-agents, and chats
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            {
              label: "Total Sessions",
              value: sessions.length,
              icon: MessageSquare,
              color: "var(--brand-600)",
            },
            {
              label: "Total Tokens",
              value: formatTokens(totalTokens),
              icon: Hash,
              color: "#60a5fa",
            },
            {
              label: "Cron Runs",
              value: counts.cron || 0,
              icon: Clock,
              color: "#a78bfa",
            },
            {
              label: "Models Used",
              value: uniqueModels.length,
              icon: Bot,
              color: "#4ade80",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]"
            >
              <div
                className="flex items-center justify-center shrink-0 rounded-lg"
                style={{
                  width: "36px",
                  height: "36px",
                  backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`,
                }}
              >
                <Icon style={{ width: "18px", height: "18px", color }} />
              </div>
              <div>
                <div className="text-[1.25rem] font-bold text-[var(--text-primary-900)] leading-tight">
                  {value}
                </div>
                <div className="text-[0.72rem] text-[var(--text-quaternary-500)]">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters + Search */}
        <div className="rounded-xl overflow-hidden bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
          {/* Tab bar + search */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)] gap-3 flex-wrap">
            {/* Tabs */}
            <div className="flex gap-1 flex-wrap">
              {FILTER_TABS.map((tab) => {
                const count = counts[tab.id] || 0;
                const isActive = filter === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setFilter(tab.id)}
                    className="flex items-center gap-[0.3rem] px-3 py-[0.35rem] rounded-full text-[0.8rem] border-none cursor-pointer transition-all"
                    style={{
                      fontWeight: isActive ? 700 : 500,
                      backgroundColor: isActive ? "var(--brand-600)" : "var(--bg-tertiary)",
                      color: isActive ? "var(--bg-primary)" : "var(--text-secondary-700)",
                    }}
                  >
                    <span>{tab.emoji}</span>
                    <span>{tab.label}</span>
                    {count > 0 && (
                      <span
                        className="rounded-full px-[0.4rem] text-[0.7rem]"
                        style={{
                          backgroundColor: isActive ? "rgba(0,0,0,0.2)" : "var(--border-primary)",
                        }}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Search + Refresh */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-[0.375rem] rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)]">
                <Search style={{ width: "13px", height: "13px" }} className="text-[var(--text-quaternary-500)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter sessions..."
                  className="bg-transparent border-none outline-none text-[var(--text-primary-900)] text-[0.8rem] w-40"
                />
              </div>
              <button
                onClick={() => { setLoading(true); loadSessions(); }}
                className="flex items-center p-[0.375rem] rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] cursor-pointer text-[var(--text-quaternary-500)] hover:text-[var(--text-primary-900)]"
                title="Refresh"
              >
                <RefreshCw style={{ width: "14px", height: "14px" }} />
              </button>
            </div>
          </div>

          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-2 border-b border-[var(--border-primary)] bg-[var(--bg-tertiary)]">
            <div className="w-8 shrink-0" />
            <div className="flex-1 text-[0.7rem] font-bold text-[var(--text-quaternary-500)] uppercase tracking-[0.05em]">
              Session
            </div>
            <div className="text-right text-[0.7rem] font-bold text-[var(--text-quaternary-500)] uppercase tracking-[0.05em]" style={{ minWidth: "100px" }}>
              Tokens / ctx
            </div>
            <div className="text-right text-[0.7rem] font-bold text-[var(--text-quaternary-500)] uppercase tracking-[0.05em]" style={{ minWidth: "80px" }}>
              Updated
            </div>
            <div className="w-[14px] shrink-0" />
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center p-12 gap-3 text-[var(--text-quaternary-500)]">
              <div
                style={{
                  width: "20px",
                  height: "20px",
                  border: "2px solid var(--brand-600)",
                  borderTopColor: "transparent",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              Loading sessions...
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="flex items-center gap-2 p-6 text-[var(--error-600)]">
              <AlertTriangle style={{ width: "16px", height: "16px" }} />
              {error}
            </div>
          )}

          {/* Empty */}
          {!loading && !error && filtered.length === 0 && (
            <div className="text-center p-12 text-[var(--text-quaternary-500)]">
              <MessageSquare
                style={{ width: "40px", height: "40px", margin: "0 auto 0.75rem", opacity: 0.3 }}
              />
              <p>No sessions match your filter</p>
            </div>
          )}

          {/* Session list */}
          {!loading &&
            !error &&
            filtered.map((session) => (
              <SessionRow
                key={session.id}
                session={session}
                onClick={() => setSelectedSession(session)}
              />
            ))}
        </div>
      </div>

      {/* Detail panel */}
      {selectedSession && (
        <SessionDetail
          session={selectedSession}
          onClose={() => setSelectedSession(null)}
        />
      )}

      <style jsx global>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}
