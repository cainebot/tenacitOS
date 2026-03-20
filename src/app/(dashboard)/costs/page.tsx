"use client";

import { useEffect, useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Calendar, PieChart } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { cx } from "@openclaw/ui";

interface CostData {
  today: number;
  yesterday: number;
  thisMonth: number;
  lastMonth: number;
  projected: number;
  budget: number;
  byAgent: Array<{ agent: string; cost: number; tokens: number }>;
  byModel: Array<{ model: string; cost: number; tokens: number }>;
  daily: Array<{ date: string; cost: number; input: number; output: number }>;
  hourly: Array<{ hour: string; cost: number }>;
}

const COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#34C759', '#00C7BE', '#30B0C7', '#32ADE6', '#007AFF', '#5856D6', '#AF52DE', '#FF2D55'];

const MODEL_PRICES = {
  "opus-4.6": { input: 15, output: 75, cacheRead: 1.5, cacheWrite: 18.75 },
  "sonnet-4.5": { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
  "haiku-3.5": { input: 0.8, output: 4, cacheRead: 0.08, cacheWrite: 1.0 },
};

export default function CostsPage() {
  const [costData, setCostData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d">("30d");

  useEffect(() => {
    fetchCostData();
    const interval = setInterval(fetchCostData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [timeframe]);

  const fetchCostData = async () => {
    try {
      const res = await fetch(`/api/costs?timeframe=${timeframe}`);
      if (res.ok) {
        const data = await res.json();
        setCostData(data);
      }
    } catch (error) {
      console.error("Failed to fetch cost data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-secondary">Loading cost data...</p>
        </div>
      </div>
    );
  }

  if (!costData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <DollarSign className="w-16 h-16 mx-auto mb-4 text-quaternary" />
          <p className="text-secondary">Failed to load cost data</p>
        </div>
      </div>
    );
  }

  const budgetPercent = (costData.thisMonth / costData.budget) * 100;
  const budgetTextClass = budgetPercent < 60 ? "text-success" : budgetPercent < 85 ? "text-warning" : "text-error-600";
  const budgetBgClass = budgetPercent < 60 ? "bg-success" : budgetPercent < 85 ? "bg-warning" : "bg-error";
  const todayChange = ((costData.today - costData.yesterday) / costData.yesterday) * 100;
  const monthChange = ((costData.thisMonth - costData.lastMonth) / costData.lastMonth) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-3xl font-bold mb-2 font-display text-primary"
          >
            Costs & Analytics
          </h1>
          <p className="text-secondary">
            Token usage and cost tracking across all agents
          </p>
        </div>

        {/* Timeframe selector */}
        <div className={cx("flex gap-2 p-1 rounded-lg bg-secondary border border-secondary")}>
          {(["7d", "30d", "90d"] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cx(
                "px-4 py-2 rounded-md text-sm font-medium transition-all",
                timeframe === tf ? "bg-brand-50 text-white" : "bg-transparent text-secondary"
              )}
            >
              {tf === "7d" ? "7 days" : tf === "30d" ? "30 days" : "90 days"}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today */}
        <div className="p-6 rounded-xl bg-secondary border border-secondary">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary">Today</span>
            {todayChange !== 0 && (
              <div className="flex items-center gap-1">
                {todayChange > 0 ? (
                  <TrendingUp className="w-3 h-3 text-error-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-success" />
                )}
                <span
                  className={cx("text-xs font-medium", todayChange > 0 ? "text-error-600" : "text-success")}
                >
                  {Math.abs(todayChange).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className="text-3xl font-bold text-primary">
            ${costData.today.toFixed(2)}
          </div>
          <p className="text-xs mt-1 text-quaternary">
            vs ${costData.yesterday.toFixed(2)} yesterday
          </p>
        </div>

        {/* This Month */}
        <div className="p-6 rounded-xl bg-secondary border border-secondary">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary">This Month</span>
            {monthChange !== 0 && (
              <div className="flex items-center gap-1">
                {monthChange > 0 ? (
                  <TrendingUp className="w-3 h-3 text-error-600" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-success" />
                )}
                <span
                  className={cx("text-xs font-medium", monthChange > 0 ? "text-error-600" : "text-success")}
                >
                  {Math.abs(monthChange).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className="text-3xl font-bold text-primary">
            ${costData.thisMonth.toFixed(2)}
          </div>
          <p className="text-xs mt-1 text-quaternary">
            vs ${costData.lastMonth.toFixed(2)} last month
          </p>
        </div>

        {/* Projected */}
        <div className="p-6 rounded-xl bg-secondary border border-secondary">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary">Projected (EOM)</span>
          </div>
          <div className="text-3xl font-bold text-warning">
            ${costData.projected.toFixed(2)}
          </div>
          <p className="text-xs mt-1 text-quaternary">
            Based on current pace
          </p>
        </div>

        {/* Budget */}
        <div className="p-6 rounded-xl bg-secondary border border-secondary">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-secondary">Budget</span>
            {budgetPercent > 80 && (
              <AlertTriangle className="w-4 h-4 text-error-600" />
            )}
          </div>
          <div className={cx("text-3xl font-bold", budgetTextClass)}>
            {budgetPercent.toFixed(0)}%
          </div>
          <div className="mt-2 h-2 rounded-full overflow-hidden bg-tertiary">
            <div
              className={cx("h-full transition-all duration-500", budgetBgClass)}
              style={{ width: `${Math.min(budgetPercent, 100)}%` }}
            />
          </div>
          <p className="text-xs mt-1 text-quaternary">
            ${costData.thisMonth.toFixed(2)} / ${costData.budget.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <div className="p-6 rounded-xl bg-secondary border border-secondary">
          <h3 className="text-lg font-semibold mb-4 text-primary">
            Daily Cost Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={costData.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="date" stroke="var(--text-quaternary-500)" style={{ fontSize: "12px" }} />
              <YAxis stroke="var(--text-quaternary-500)" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-tertiary)",
                  border: "1px solid var(--border-primary)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="cost" stroke="var(--brand-600)" strokeWidth={2} name="Cost ($)" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cost by Agent */}
        <div className="p-6 rounded-xl bg-secondary border border-secondary">
          <h3 className="text-lg font-semibold mb-4 text-primary">
            Cost by Agent
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costData.byAgent}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="agent" stroke="var(--text-quaternary-500)" style={{ fontSize: "12px" }} />
              <YAxis stroke="var(--text-quaternary-500)" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-tertiary)",
                  border: "1px solid var(--border-primary)",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="cost" fill="var(--brand-600)" name="Cost ($)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cost by Model */}
        <div className="p-6 rounded-xl bg-secondary border border-secondary">
          <h3 className="text-lg font-semibold mb-4 text-primary">
            Cost by Model
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={costData.byModel}
                dataKey="cost"
                nameKey="model"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={(entry) => `${entry.model}: $${entry.cost.toFixed(2)}`}
              >
                {costData.byModel.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-tertiary)",
                  border: "1px solid var(--border-primary)",
                  borderRadius: "8px",
                }}
              />
            </RePieChart>
          </ResponsiveContainer>
        </div>

        {/* Token Usage */}
        <div className="p-6 rounded-xl bg-secondary border border-secondary">
          <h3 className="text-lg font-semibold mb-4 text-primary">
            Token Usage (Daily)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={costData.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
              <XAxis dataKey="date" stroke="var(--text-quaternary-500)" style={{ fontSize: "12px" }} />
              <YAxis stroke="var(--text-quaternary-500)" style={{ fontSize: "12px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--bg-tertiary)",
                  border: "1px solid var(--border-primary)",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey="input" stackId="a" fill="#60A5FA" name="Input Tokens" />
              <Bar dataKey="output" stackId="a" fill="#F59E0B" name="Output Tokens" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Pricing Table */}
      <div className="p-6 rounded-xl bg-secondary border border-secondary">
        <h3 className="text-lg font-semibold mb-4 text-primary">
          Model Pricing (per 1M tokens)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-secondary">
                <th className="text-left py-3 px-4 text-sm font-medium text-secondary">Model</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-secondary">Input</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-secondary">Output</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-secondary">Cache Read</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-secondary">Cache Write</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(MODEL_PRICES).map(([model, prices]) => (
                <tr key={model} className="border-b border-secondary">
                  <td className="py-3 px-4">
                    <span className="font-medium text-primary">{model}</span>
                  </td>
                  <td className="py-3 px-4 text-right text-primary">${prices.input}</td>
                  <td className="py-3 px-4 text-right text-primary">${prices.output}</td>
                  <td className="py-3 px-4 text-right text-secondary">${prices.cacheRead}</td>
                  <td className="py-3 px-4 text-right text-secondary">${prices.cacheWrite}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed table by agent */}
      <div className="p-6 rounded-xl bg-secondary border border-secondary">
        <h3 className="text-lg font-semibold mb-4 text-primary">
          Detailed Breakdown by Agent
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-secondary">
                <th className="text-left py-3 px-4 text-sm font-medium text-secondary">Agent</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-secondary">Tokens</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-secondary">Cost</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-secondary">% of Total</th>
              </tr>
            </thead>
            <tbody>
              {costData.byAgent.map((agent) => {
                const percent = (agent.cost / costData.thisMonth) * 100;
                return (
                  <tr key={agent.agent} className="border-b border-secondary">
                    <td className="py-3 px-4">
                      <span className="font-medium text-primary">{agent.agent}</span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-sm text-secondary">
                      {agent.tokens.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-primary">
                      ${agent.cost.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right text-secondary">
                      {percent.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
