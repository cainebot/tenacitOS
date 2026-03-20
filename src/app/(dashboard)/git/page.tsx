"use client";

import { useEffect, useState } from "react";
import {
  GitBranch, GitCommit, ArrowUp, ArrowDown, RefreshCw,
  AlertCircle, CheckCircle, Terminal, X, Loader2, FolderGit2,
} from "lucide-react";
import { format } from "date-fns";

interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
}

interface RepoStatus {
  name: string;
  path: string;
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
  lastCommit: CommitInfo | null;
  remoteUrl: string;
  isDirty: boolean;
}

interface OutputModal {
  title: string;
  content: string;
  loading: boolean;
}

export default function GitPage() {
  const [repos, setRepos] = useState<RepoStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [outputModal, setOutputModal] = useState<OutputModal | null>(null);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  const loadRepos = async () => {
    try {
      const res = await fetch("/api/git");
      const data = await res.json();
      setRepos(data.repos || []);
    } catch {
      setRepos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRepos();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadRepos();
  };

  const runAction = async (repo: RepoStatus, action: "status" | "pull" | "log" | "diff") => {
    const key = `${repo.name}-${action}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));
    setOutputModal({ title: `${repo.name}: git ${action}`, content: "", loading: true });

    try {
      const res = await fetch("/api/git", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repo.path, action }),
      });
      const data = await res.json();
      setOutputModal({ title: `${repo.name}: git ${action}`, content: data.output || data.error || "No output", loading: false });
    } catch {
      setOutputModal({ title: `${repo.name}: git ${action}`, content: "Request failed", loading: false });
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const dirtyRepos = repos.filter((r) => r.isDirty);
  const cleanRepos = repos.filter((r) => !r.isDirty);

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2 font-[family-name:var(--font-display)] text-primary">
            Git Dashboard
          </h1>
          <p className="text-sm text-secondary">
            {repos.length} repositories · {dirtyRepos.length} with changes
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-secondary border border-primary cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-[200px]">
          <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      ) : repos.length === 0 ? (
        <div className="text-center p-12 text-quaternary">
          <FolderGit2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No git repos found in workspace</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Repos with changes first */}
          {[...dirtyRepos, ...cleanRepos].map((repo) => (
            <div
              key={repo.path}
              className="rounded-xl overflow-hidden bg-secondary"
              style={{
                border: `1px solid ${repo.isDirty ? "rgba(251,191,36,0.3)" : "var(--border-primary)"}`,
              }}
            >
              {/* Repo header */}
              <div
                className="flex items-center gap-3 px-5 py-4 border-b border-primary"
              >
                <div className="p-2 rounded-lg bg-tertiary">
                  <FolderGit2 className={`w-5 h-5 ${repo.isDirty ? "text-[#fbbf24]" : "text-success-600"}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold font-mono text-primary">
                      {repo.name}
                    </h3>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-tertiary text-secondary">
                      <GitBranch className="w-3 h-3" />
                      {repo.branch}
                    </div>
                    {repo.ahead > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-success-600">
                        <ArrowUp className="w-3 h-3" /> {repo.ahead} ahead
                      </span>
                    )}
                    {repo.behind > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-warning-600">
                        <ArrowDown className="w-3 h-3" /> {repo.behind} behind
                      </span>
                    )}
                    {!repo.isDirty && (
                      <span className="flex items-center gap-1 text-xs text-success-600">
                        <CheckCircle className="w-3 h-3" /> clean
                      </span>
                    )}
                    {repo.isDirty && (
                      <span className="flex items-center gap-1 text-xs text-[#fbbf24]">
                        <AlertCircle className="w-3 h-3" /> {repo.staged.length + repo.unstaged.length + repo.untracked.length} changes
                      </span>
                    )}
                  </div>
                  {repo.lastCommit && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-quaternary">
                      <GitCommit className="w-3 h-3" />
                      <code className="text-brand-600">{repo.lastCommit.hash}</code>
                      <span>{repo.lastCommit.message.slice(0, 60)}{repo.lastCommit.message.length > 60 ? "…" : ""}</span>
                      <span>·</span>
                      <span>{repo.lastCommit.date}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0">
                  {[
                    { action: "status" as const, label: "status" },
                    { action: "log" as const, label: "log" },
                    { action: "diff" as const, label: "diff" },
                    { action: "pull" as const, label: "pull" },
                  ].map(({ action, label }) => (
                    <button
                      key={action}
                      onClick={() => runAction(repo, action)}
                      disabled={actionLoading[`${repo.name}-${action}`]}
                      className="px-2.5 py-1 rounded-md text-xs font-mono bg-tertiary text-secondary border border-primary cursor-pointer"
                    >
                      {actionLoading[`${repo.name}-${action}`] ? "…" : label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Changes breakdown */}
              {repo.isDirty && (
                <div className="px-5 py-3 grid grid-cols-3 gap-4 bg-[#fbbf24]/[0.04]">
                  {repo.staged.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-1 text-success-600">
                        Staged ({repo.staged.length})
                      </div>
                      <div className="space-y-0.5">
                        {repo.staged.slice(0, 5).map((f) => (
                          <div key={f} className="text-xs font-mono truncate text-secondary">{f}</div>
                        ))}
                        {repo.staged.length > 5 && <div className="text-xs text-quaternary">+{repo.staged.length - 5} more</div>}
                      </div>
                    </div>
                  )}
                  {repo.unstaged.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-1 text-[#fbbf24]">
                        Modified ({repo.unstaged.length})
                      </div>
                      <div className="space-y-0.5">
                        {repo.unstaged.slice(0, 5).map((f) => (
                          <div key={f} className="text-xs font-mono truncate text-secondary">{f}</div>
                        ))}
                        {repo.unstaged.length > 5 && <div className="text-xs text-quaternary">+{repo.unstaged.length - 5} more</div>}
                      </div>
                    </div>
                  )}
                  {repo.untracked.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold mb-1 text-quaternary">
                        Untracked ({repo.untracked.length})
                      </div>
                      <div className="space-y-0.5">
                        {repo.untracked.slice(0, 5).map((f) => (
                          <div key={f} className="text-xs font-mono truncate text-secondary">{f}</div>
                        ))}
                        {repo.untracked.length > 5 && <div className="text-xs text-quaternary">+{repo.untracked.length - 5} more</div>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Output Modal — terminal UI with intentional fixed dark theme colors */}
      {outputModal && (
        <div className="fixed inset-0 z-[1000] bg-black/85 flex items-center justify-center p-4">
          <div
            className="w-[95vw] max-w-[700px] h-[65vh] rounded-2xl flex flex-col"
            style={{ backgroundColor: "#0d1117", border: "1px solid #30363d" }}
          >
            <div
              className="flex items-center gap-3 px-4 py-3.5 shrink-0"
              style={{ borderBottom: "1px solid #30363d" }}
            >
              <Terminal className="w-4 h-4 text-brand-600" />
              <span className="font-mono text-sm flex-1" style={{ color: "#c9d1d9" }}>
                {outputModal.title}
              </span>
              <button
                onClick={() => setOutputModal(null)}
                className="p-1.5 rounded-md bg-transparent border-none cursor-pointer"
                style={{ color: "#8b949e" }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {outputModal.loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
                </div>
              ) : (
                <pre className="font-mono text-[0.8rem] whitespace-pre-wrap leading-relaxed" style={{ color: "#c9d1d9" }}>
                  {outputModal.content}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
