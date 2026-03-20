"use client";

import { useEffect, useState, useCallback } from "react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import {
  FileText,
  Search,
  MessageSquare,
  Terminal,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Filter,
  RefreshCw,
  Shield,
  Wrench,
  Calendar,
  ChevronDown,
  Timer,
  Coins,
  Brain,
  RotateCcw,
  ArrowUpDown,
  Download,
} from "lucide-react";
import { RichDescription } from "@/components/RichDescription";

interface Activity {
  id: string;
  timestamp: string;
  type: string;
  description: string;
  status: string;
  duration_ms: number | null;
  tokens_used: number | null;
  metadata?: Record<string, unknown>;
}

interface ActivitiesResponse {
  activities: Activity[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  file: FileText,
  search: Search,
  message: MessageSquare,
  command: Terminal,
  security: Shield,
  build: Wrench,
  task: Zap,
  cron: RotateCcw,
  memory: Brain,
  default: Zap,
};

// Tailwind classes for each activity type (bg, text, border)
const typeClasses: Record<string, { bg: string; text: string; border: string }> = {
  file:     { bg: "bg-[var(--blue-700)]/10",   text: "text-[var(--blue-700)]",    border: "border-[var(--blue-700)]/30" },
  search:   { bg: "bg-[var(--warning-600)]/10", text: "text-[var(--warning-600)]", border: "border-[var(--warning-600)]/30" },
  message:  { bg: "bg-[var(--success-600)]/10", text: "text-[var(--success-600)]", border: "border-[var(--success-600)]/30" },
  command:  { bg: "bg-[#BF5AF2]/10",            text: "text-[#BF5AF2]",            border: "border-[#BF5AF2]/30" },
  cron:     { bg: "bg-[#FF375F]/10",            text: "text-[#FF375F]",            border: "border-[#FF375F]/30" },
  security: { bg: "bg-[var(--error-600)]/10",   text: "text-[var(--error-600)]",   border: "border-[var(--error-600)]/30" },
  build:    { bg: "bg-[#FF9F0A]/10",            text: "text-[#FF9F0A]",            border: "border-[#FF9F0A]/30" },
  task:     { bg: "bg-[var(--brand-600)]/10",   text: "text-[var(--brand-600)]",   border: "border-[var(--brand-600)]/30" },
  memory:   { bg: "bg-[var(--blue-700)]/10",    text: "text-[var(--blue-700)]",    border: "border-[var(--blue-700)]/30" },
  default:  { bg: "bg-[var(--bg-secondary)]",   text: "text-[var(--text-secondary-700)]", border: "border-[var(--border-primary)]" },
};

const statusClasses: Record<string, { text: string; bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  success: { icon: CheckCircle, text: "text-[var(--success-600)]", bg: "bg-[var(--success-600)]/10" },
  error:   { icon: XCircle,     text: "text-[var(--error-600)]",   bg: "bg-[var(--error-600)]/10" },
  pending: { icon: Clock,       text: "text-[var(--warning-600)]", bg: "bg-[var(--warning-600)]/10" },
};

const allTypes = ["file", "search", "message", "command", "security", "build", "task", "cron", "memory"];

const datePresets = [
  { label: "Today", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "All time", days: -1 },
];

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatTokens(tokens: number): string {
  if (tokens < 1000) return tokens.toString();
  return `${(tokens / 1000).toFixed(1)}k`;
}

export default function ActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // Filters
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [activePreset, setActivePreset] = useState<number | null>(1); // Default: Last 7 days

  const limit = 20;

  const fetchActivities = useCallback(async (append = false) => {
    const currentOffset = append ? offset : 0;

    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      const params = new URLSearchParams();
      params.set("limit", limit.toString());
      params.set("offset", currentOffset.toString());
      params.set("sort", sort);

      if (selectedTypes.size > 0 && selectedTypes.size < allTypes.length) {
        if (selectedTypes.size === 1) {
          params.set("type", Array.from(selectedTypes)[0]);
        }
      }

      if (filterStatus !== "all") {
        params.set("status", filterStatus);
      }

      if (startDate) {
        params.set("startDate", startDate);
      }

      if (endDate) {
        params.set("endDate", endDate);
      }

      const res = await fetch(`/api/activities?${params.toString()}`);
      const data: ActivitiesResponse = await res.json();

      let filteredActivities = data.activities;
      if (selectedTypes.size > 1) {
        filteredActivities = data.activities.filter((a) => selectedTypes.has(a.type));
      }

      if (append) {
        setActivities((prev) => [...prev, ...filteredActivities]);
      } else {
        setActivities(filteredActivities);
      }

      setTotal(data.total);
      setHasMore(data.hasMore);
      setOffset(currentOffset + data.activities.length);
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      if (!append) {
        setActivities([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [offset, sort, selectedTypes, filterStatus, startDate, endDate]);

  useEffect(() => {
    setOffset(0);
    fetchActivities(false);
  }, [sort, selectedTypes, filterStatus, startDate, endDate]);

  useEffect(() => {
    const end = format(endOfDay(new Date()), "yyyy-MM-dd");
    const start = format(startOfDay(subDays(new Date(), 7)), "yyyy-MM-dd");
    setStartDate(start);
    setEndDate(end);
  }, []);

  const handlePresetClick = (days: number, index: number) => {
    setActivePreset(index);
    const end = format(endOfDay(new Date()), "yyyy-MM-dd");

    if (days === -1) {
      setStartDate("");
      setEndDate("");
    } else if (days === 0) {
      const today = format(startOfDay(new Date()), "yyyy-MM-dd");
      setStartDate(today);
      setEndDate(end);
    } else {
      const start = format(startOfDay(subDays(new Date(), days)), "yyyy-MM-dd");
      setStartDate(start);
      setEndDate(end);
    }
  };

  const toggleType = (type: string) => {
    const newTypes = new Set(selectedTypes);
    if (newTypes.has(type)) {
      newTypes.delete(type);
    } else {
      newTypes.add(type);
    }
    setSelectedTypes(newTypes);
    setActivePreset(null);
  };

  const clearTypeFilters = () => {
    setSelectedTypes(new Set());
  };

  const handleLoadMore = () => {
    fetchActivities(true);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 animate-spin text-[var(--brand-600)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-4 md:mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2 text-[var(--text-primary-900)] font-[family-name:var(--font-display)]">
            Activity Log
          </h1>
          <p className="text-[var(--text-secondary-700)]">Complete history of agent actions</p>
        </div>
        <a
          href="/api/activities?format=csv&limit=10000"
          download={`activities-${new Date().toISOString().split('T')[0]}.csv`}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary-700)] border border-[var(--border-primary)] no-underline text-sm cursor-pointer mt-1"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </a>
      </div>

      {/* Activity Heatmap */}
      <div className="mb-4 md:mb-6">
        <ActivityHeatmap />
      </div>

      {/* Date Range Picker */}
      <div className="p-3 md:p-4 mb-4 md:mb-6 rounded-xl bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
          <Calendar className="w-4 h-4 md:w-5 md:h-5 text-[var(--text-secondary-700)]" />
          <span className="text-xs md:text-sm text-[var(--text-secondary-700)]">Date Range</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {datePresets.map((preset, index) => (
            <button
              key={preset.label}
              onClick={() => handlePresetClick(preset.days, index)}
              className={[
                "px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer",
                activePreset === index
                  ? "bg-[var(--brand-600)]/20 text-[var(--brand-600)] border border-[var(--brand-600)]/30"
                  : "bg-[var(--bg-quaternary)] text-[var(--text-secondary-700)] border border-transparent",
              ].join(" ")}
            >
              {preset.label}
            </button>
          ))}

          <div className="w-px h-8 bg-[var(--border-primary)] mx-2" />

          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setActivePreset(null);
              }}
              className="bg-[var(--bg-quaternary)] text-[var(--text-secondary-700)] px-3 py-2 rounded-lg border border-[var(--border-primary)] text-sm outline-none"
            />
            <span className="text-[var(--text-quaternary-500)]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setActivePreset(null);
              }}
              className="bg-[var(--bg-quaternary)] text-[var(--text-secondary-700)] px-3 py-2 rounded-lg border border-[var(--border-primary)] text-sm outline-none"
            />
          </div>
        </div>
      </div>

      {/* Type Filter Chips */}
      <div className="p-3 md:p-4 mb-4 md:mb-6 rounded-xl bg-[var(--bg-secondary)]">
        <div className="flex items-center gap-3 md:gap-4 mb-3 md:mb-4">
          <Filter className="w-5 h-5 text-[var(--text-secondary-700)]" />
          <span className="text-sm text-[var(--text-secondary-700)]">Filter by Type</span>
          {selectedTypes.size > 0 && (
            <button
              onClick={clearTypeFilters}
              className="text-xs text-[var(--brand-600)] ml-auto bg-transparent border-none cursor-pointer"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {allTypes.map((type) => {
            const TypeIcon = typeIcons[type] || typeIcons.default;
            const colors = typeClasses[type] || typeClasses.default;
            const isSelected = selectedTypes.has(type);

            return (
              <button
                key={type}
                onClick={() => toggleType(type)}
                className={[
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer border",
                  isSelected
                    ? `${colors.bg} ${colors.text} ${colors.border}`
                    : "bg-[var(--bg-quaternary)] text-[var(--text-quaternary-500)] border-[var(--border-primary)]",
                ].join(" ")}
              >
                <TypeIcon className="w-4 h-4" />
                <span className="capitalize">{type}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Status and Sort Filters */}
      <div className="flex flex-wrap items-center gap-2 md:gap-4 mb-4 md:mb-6">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-[var(--bg-quaternary)] text-[var(--text-secondary-700)] px-3 py-2 rounded-lg border border-[var(--border-primary)] outline-none cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
          <option value="pending">Pending</option>
        </select>

        <button
          onClick={() => setSort(sort === "newest" ? "oldest" : "newest")}
          className="flex items-center gap-2 bg-[var(--bg-quaternary)] text-[var(--text-secondary-700)] px-3 py-2 rounded-lg border border-[var(--border-primary)] cursor-pointer transition-colors"
        >
          <ArrowUpDown className="w-4 h-4" />
          <span>{sort === "newest" ? "Newest first" : "Oldest first"}</span>
        </button>

        <div className="text-xs md:text-sm w-full md:w-auto md:ml-auto mt-2 md:mt-0 text-[var(--text-quaternary-500)]">
          Showing {activities.length} of {total} activities
        </div>
      </div>

      {/* Activity List */}
      <div className="rounded-xl overflow-hidden bg-[var(--bg-secondary)]">
        {activities.length === 0 && (
          <div className="text-center py-12 text-[var(--text-secondary-700)]">
            <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No activities found</p>
          </div>
        )}

        {activities.map((activity, index) => {
          const TypeIcon = typeIcons[activity.type] || typeIcons.default;
          const colors = typeClasses[activity.type] || typeClasses.default;
          const status = statusClasses[activity.status] || statusClasses.success;
          const StatusIcon = status.icon;

          return (
            <div
              key={activity.id}
              className={[
                "flex items-start gap-4 p-6 transition-colors",
                index !== activities.length - 1 ? "border-b border-[var(--border-primary)]" : "",
              ].join(" ")}
            >
              <div className={`p-3 rounded-lg ${colors.bg}`}>
                <TypeIcon className={`w-5 h-5 ${colors.text}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`font-medium capitalize ${colors.text}`}>
                    {activity.type}
                  </span>
                  <span className={`flex items-center gap-1 text-sm px-2 py-0.5 rounded ${status.text} ${status.bg}`}>
                    <StatusIcon className="w-3 h-3" />
                    {activity.status}
                  </span>
                </div>
                <RichDescription text={activity.description} className="text-[var(--text-secondary-700)] mb-2" />

                {/* Duration and Tokens */}
                <div className="flex items-center gap-4 text-sm">
                  {activity.duration_ms !== null && (
                    <span className="flex items-center gap-1 text-[var(--text-quaternary-500)]">
                      <Timer className="w-3.5 h-3.5" />
                      {formatDuration(activity.duration_ms)}
                    </span>
                  )}
                  {activity.tokens_used !== null && (
                    <span className="flex items-center gap-1 text-[var(--text-quaternary-500)]">
                      <Coins className="w-3.5 h-3.5" />
                      {formatTokens(activity.tokens_used)} tokens
                    </span>
                  )}
                </div>

                {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                  <details className="mt-3">
                    <summary className="text-xs text-[var(--text-quaternary-500)] cursor-pointer flex items-center gap-1">
                      <ChevronDown className="w-3 h-3" />
                      View metadata
                    </summary>
                    <pre className="mt-2 text-xs text-[var(--text-quaternary-500)] bg-[var(--bg-quaternary)] p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(activity.metadata, null, 2)}
                    </pre>
                  </details>
                )}
              </div>

              <div className="text-right text-sm text-[var(--text-quaternary-500)] whitespace-nowrap">
                <div>{format(new Date(activity.timestamp), "MMM d, yyyy")}</div>
                <div className="opacity-70">{format(new Date(activity.timestamp), "HH:mm:ss")}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className={[
              "flex items-center gap-2 bg-[var(--bg-quaternary)] text-[var(--text-secondary-700)] px-6 py-3 rounded-lg font-medium border-none transition-colors",
              loadingMore ? "cursor-not-allowed opacity-50" : "cursor-pointer",
            ].join(" ")}
          >
            {loadingMore ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                Load more activities
              </>
            )}
          </button>
        </div>
      )}

      {/* End of list indicator */}
      {!hasMore && activities.length > 0 && (
        <div className="text-center mt-6 text-[var(--text-quaternary-500)] text-sm">
          — End of activity log —
        </div>
      )}
    </div>
  );
}
