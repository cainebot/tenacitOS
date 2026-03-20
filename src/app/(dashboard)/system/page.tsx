"use client";

import { useEffect, useState } from "react";
import { Cpu, HardDrive, MemoryStick, Activity, Network, Server, ShieldCheck, RotateCw, Wifi, Monitor, Play, Square, X, Loader2, Terminal, ArrowDown, ArrowUp } from "lucide-react";
import { cx } from "@openclaw/ui";

interface SystemdService {
  name: string;
  status: string;
  description: string;
  backend?: string;
  uptime?: number | null;
  restarts?: number;
  pid?: number | null;
  mem?: number | null;
  cpu?: number | null;
}

interface TailscaleDevice {
  ip: string;
  hostname: string;
  os: string;
  online: boolean;
}

interface FirewallRule {
  port: string;
  action: string;
  from: string;
  comment: string;
}

interface SystemData {
  cpu: { usage: number; cores: number[]; loadAvg: number[] };
  ram: { total: number; used: number; free: number; cached: number };
  disk: { total: number; used: number; free: number; percent: number };
  network: { rx: number; tx: number };
  systemd: SystemdService[];
  tailscale: { active: boolean; ip: string; devices: TailscaleDevice[] };
  firewall: { active: boolean; rules: FirewallRule[]; ruleCount: number };
}

interface LogsModal {
  name: string;
  backend: string;
  content: string;
  loading: boolean;
}

function formatUptime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function SystemMonitorPage() {
  const [systemData, setSystemData] = useState<SystemData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedTab, setSelectedTab] = useState<"hardware" | "services">("hardware");
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [logsModal, setLogsModal] = useState<LogsModal | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const res = await fetch("/api/system/monitor");
        if (res.ok) {
          const data = await res.json();
          setSystemData(data);
          setLastUpdated(new Date());
        }
      } catch (error) {
        console.error("Failed to fetch system data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSystemData();
    const interval = setInterval(fetchSystemData, 5000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleServiceAction = async (svc: SystemdService, action: "restart" | "stop" | "start" | "logs") => {
    const key = `${svc.name}-${action}`;
    setActionLoading((prev) => ({ ...prev, [key]: true }));

    try {
      if (action === "logs") {
        setLogsModal({ name: svc.name, backend: svc.backend || "pm2", content: "", loading: true });
      }

      const res = await fetch("/api/system/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: svc.name, backend: svc.backend || "pm2", action }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Action failed");

      if (action === "logs") {
        setLogsModal({ name: svc.name, backend: svc.backend || "pm2", content: data.output, loading: false });
      } else {
        showToast(`✅ ${svc.name}: ${action} successful`);
        // Refresh data after action
        setTimeout(async () => {
          const r = await fetch("/api/system/monitor");
          if (r.ok) setSystemData(await r.json());
        }, 2000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Action failed";
      if (action === "logs") {
        setLogsModal({ name: svc.name, backend: svc.backend || "pm2", content: `Error: ${msg}`, loading: false });
      } else {
        showToast(`❌ ${svc.name}: ${msg}`, "error");
      }
    } finally {
      setActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-secondary">Loading system data...</p>
        </div>
      </div>
    );
  }

  if (!systemData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Server className="w-16 h-16 mx-auto mb-4 text-quaternary" />
          <p className="text-secondary">Failed to load system data</p>
        </div>
      </div>
    );
  }

  const cpuTextClass = systemData.cpu.usage < 60 ? "text-success" : systemData.cpu.usage < 85 ? "text-warning" : "text-error-600";
  const cpuBgClass = systemData.cpu.usage < 60 ? "bg-success" : systemData.cpu.usage < 85 ? "bg-warning" : "bg-error";
  const ramPercent = (systemData.ram.used / systemData.ram.total) * 100;
  const ramTextClass = ramPercent < 60 ? "text-success" : ramPercent < 85 ? "text-warning" : "text-error-600";
  const ramBgClass = ramPercent < 60 ? "bg-success" : ramPercent < 85 ? "bg-warning" : "bg-error";
  const diskTextClass = systemData.disk.percent < 60 ? "text-success" : systemData.disk.percent < 85 ? "text-warning" : "text-error-600";
  const diskBgClass = systemData.disk.percent < 60 ? "bg-success" : systemData.disk.percent < 85 ? "bg-warning" : "bg-error";

  const activeServices = systemData.systemd.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div
          className={cx(
            "fixed top-4 right-4 z-[1000] px-5 py-3 rounded-xl text-sm font-medium",
            "shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
            toast.type === "success"
              ? "bg-success/15 border border-success text-success"
              : "bg-error/15 border border-error text-error-600"
          )}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2 font-display text-primary">
            System Monitor
          </h1>
          <p className="text-secondary">Real-time monitoring of server resources and services</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/[0.12] text-success">
            <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-success" />
            Live
          </span>
          {lastUpdated && (
            <span className="text-xs text-quaternary">{lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-secondary">
        {[{ id: "hardware", label: "Hardware", icon: Cpu }, { id: "services", label: "Services", icon: Server }].map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as "hardware" | "services")}
              className={cx(
                "flex items-center gap-2 px-4 py-2 font-medium transition-all",
                isActive
                  ? "text-brand-600 border-b-2 border-accent"
                  : "text-secondary border-b-2 border-transparent"
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Hardware Tab */}
      {selectedTab === "hardware" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CPU */}
          <div className="p-6 rounded-xl bg-secondary border border-secondary">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-tertiary">
                  <Cpu className={cx("w-5 h-5", cpuTextClass)} />
                </div>
                <div>
                  <h3 className="font-semibold text-primary">CPU</h3>
                  <p className="text-sm text-secondary">{systemData.cpu.cores.length} cores</p>
                </div>
              </div>
              <span className={cx("text-2xl font-bold", cpuTextClass)}>{systemData.cpu.usage}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden mb-3 bg-tertiary">
              <div className={cx("h-full transition-all duration-500", cpuBgClass)} style={{ width: `${systemData.cpu.usage}%` }} />
            </div>
            <div className="flex justify-between text-sm text-secondary">
              <span>Load Average</span>
              <span>{systemData.cpu.loadAvg[0].toFixed(2)} / {systemData.cpu.loadAvg[1].toFixed(2)} / {systemData.cpu.loadAvg[2].toFixed(2)}</span>
            </div>
          </div>

          {/* RAM */}
          <div className="p-6 rounded-xl bg-secondary border border-secondary">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-tertiary">
                  <MemoryStick className={cx("w-5 h-5", ramTextClass)} />
                </div>
                <div>
                  <h3 className="font-semibold text-primary">RAM</h3>
                  <p className="text-sm text-secondary">{systemData.ram.used.toFixed(1)}GB / {systemData.ram.total.toFixed(1)}GB</p>
                </div>
              </div>
              <span className={cx("text-2xl font-bold", ramTextClass)}>{ramPercent.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-tertiary">
              <div className={cx("h-full transition-all duration-500", ramBgClass)} style={{ width: `${ramPercent}%` }} />
            </div>
          </div>

          {/* Disk */}
          <div className="p-6 rounded-xl bg-secondary border border-secondary">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-tertiary">
                  <HardDrive className={cx("w-5 h-5", diskTextClass)} />
                </div>
                <div>
                  <h3 className="font-semibold text-primary">Disk</h3>
                  <p className="text-sm text-secondary">{systemData.disk.used.toFixed(1)}GB / {systemData.disk.total.toFixed(1)}GB</p>
                </div>
              </div>
              <span className={cx("text-2xl font-bold", diskTextClass)}>{systemData.disk.percent.toFixed(0)}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden bg-tertiary">
              <div className={cx("h-full transition-all duration-500", diskBgClass)} style={{ width: `${systemData.disk.percent}%` }} />
            </div>
          </div>

          {/* Network */}
          <div className="p-6 rounded-xl bg-secondary border border-secondary">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-tertiary">
                <Network className="w-5 h-5 text-info" />
              </div>
              <div>
                <h3 className="font-semibold text-primary">Network</h3>
                <p className="text-sm text-secondary">Live I/O</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <ArrowDown className="w-4 h-4 text-success" />
                  <span>RX (in)</span>
                </div>
                <span className="font-mono text-sm text-primary">{systemData.network.rx.toFixed(2)} MB/s</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-secondary">
                  <ArrowUp className="w-4 h-4 text-brand-600" />
                  <span>TX (out)</span>
                </div>
                <span className="font-mono text-sm text-primary">{systemData.network.tx.toFixed(2)} MB/s</span>
              </div>
              {/* Mini bar viz */}
              <div className="flex gap-2 mt-3">
                <div className="flex-1">
                  <div className="text-[0.7rem] text-quaternary mb-1">RX</div>
                  <div className="h-1 rounded-full overflow-hidden bg-tertiary">
                    <div className="h-full bg-success" style={{ width: `${Math.min(systemData.network.rx * 10, 100)}%` }} />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-[0.7rem] text-quaternary mb-1">TX</div>
                  <div className="h-1 rounded-full overflow-hidden bg-tertiary">
                    <div className="h-full bg-brand-50" style={{ width: `${Math.min(systemData.network.tx * 10, 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services Tab */}
      {selectedTab === "services" && (
        <div className="space-y-6">
          {/* Systemd + PM2 Services */}
          <div className="p-6 rounded-xl bg-secondary border border-secondary">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
              <Server className="w-5 h-5 text-brand-600" />
              Services ({activeServices}/{systemData.systemd.length} active)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-secondary">
                    <th className="text-left py-2 px-3 text-sm font-medium text-secondary">Service</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-secondary">Description</th>
                    <th className="text-left py-2 px-3 text-sm font-medium text-secondary">Status</th>
                    <th className="text-right py-2 px-3 text-sm font-medium text-secondary">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {systemData.systemd.map((svc) => {
                    const isActionable = svc.backend === "pm2" || svc.backend === "systemd";
                    const restartKey = `${svc.name}-restart`;
                    const stopKey = `${svc.name}-stop`;
                    const logsKey = `${svc.name}-logs`;

                    return (
                      <tr key={svc.name} className="border-b border-secondary">
                        <td className="py-3 px-3">
                          <span className="font-mono font-medium text-primary">{svc.name}</span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-sm text-secondary">{svc.description || "—"}</span>
                            {svc.uptime != null && svc.status === "active" && (
                              <span className="text-xs text-quaternary">
                                up {formatUptime(svc.uptime)}
                                {svc.restarts != null && svc.restarts > 0 && ` · ${svc.restarts} restarts`}
                                {svc.mem != null && ` · ${formatBytes(svc.mem)}`}
                                {svc.cpu != null && ` · ${svc.cpu.toFixed(1)}% CPU`}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div
                              className={cx(
                                "w-2 h-2 rounded-full flex-shrink-0",
                                svc.status === "active" ? "bg-success" :
                                svc.status === "not_deployed" ? "bg-info" :
                                svc.status === "failed" ? "bg-error" : "bg-muted"
                              )}
                            />
                            <span
                              className={cx(
                                "px-2 py-1 rounded text-xs font-medium",
                                svc.status === "active" ? "bg-success/10 text-success" :
                                svc.status === "not_deployed" ? "bg-info/[0.12] text-info" :
                                svc.status === "failed" ? "bg-error/10 text-error-600" : "bg-tertiary text-quaternary"
                              )}
                            >
                              {svc.status === "not_deployed" ? "not deployed" : svc.status}
                            </span>
                            {svc.backend && svc.backend !== "none" && (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] bg-tertiary text-quaternary"
                              >
                                {svc.backend}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex justify-end gap-1">
                            {isActionable && (
                              <>
                                {/* Restart */}
                                <button
                                  onClick={() => handleServiceAction(svc, "restart")}
                                  disabled={actionLoading[restartKey]}
                                  className="p-1.5 rounded transition-colors text-quaternary bg-transparent border-0 cursor-pointer"
                                  title="Restart"
                                >
                                  {actionLoading[restartKey] ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <RotateCw className="w-4 h-4" />
                                  )}
                                </button>

                                {/* Stop/Start */}
                                <button
                                  onClick={() => handleServiceAction(svc, svc.status === "active" ? "stop" : "start")}
                                  disabled={actionLoading[stopKey] || svc.status === "not_deployed"}
                                  className={cx(
                                    "p-1.5 rounded transition-colors bg-transparent border-0 cursor-pointer",
                                    svc.status === "active" ? "text-error-600" : "text-success"
                                  )}
                                  title={svc.status === "active" ? "Stop" : "Start"}
                                >
                                  {svc.status === "active" ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </button>

                                {/* Logs */}
                                <button
                                  onClick={() => handleServiceAction(svc, "logs")}
                                  disabled={actionLoading[logsKey]}
                                  className="p-1.5 rounded transition-colors text-quaternary bg-transparent border-0 cursor-pointer"
                                  title="View Logs"
                                >
                                  {actionLoading[logsKey] ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Terminal className="w-4 h-4" />
                                  )}
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* VPN & Firewall */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tailscale VPN */}
            <div className="p-6 rounded-xl bg-secondary border border-secondary">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-tertiary">
                  <Wifi className={cx("w-5 h-5", systemData.tailscale.active ? "text-success" : "text-error-600")} />
                </div>
                <div>
                  <h3 className="font-semibold text-primary">Tailscale VPN</h3>
                  <p className={cx("text-sm", systemData.tailscale.active ? "text-success" : "text-error-600")}>
                    {systemData.tailscale.active ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">This server</span>
                  <span className="font-mono text-primary">{systemData.tailscale.ip}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-secondary">Devices connected</span>
                  <span className="text-primary">{systemData.tailscale.devices.length}</span>
                </div>
              </div>
              {systemData.tailscale.devices.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-secondary">
                  {systemData.tailscale.devices.map((dev, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-3 h-3 text-quaternary" />
                        <span className="font-mono text-secondary">{dev.hostname}</span>
                        <span className="text-quaternary">({dev.os})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-quaternary">{dev.ip}</span>
                        <div className={cx("w-1.5 h-1.5 rounded-full", dev.online ? "bg-success" : "bg-muted")} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Firewall */}
            <div className="p-6 rounded-xl bg-secondary border border-secondary">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-tertiary">
                  <ShieldCheck className={cx("w-5 h-5", systemData.firewall.active ? "text-success" : "text-error-600")} />
                </div>
                <div>
                  <h3 className="font-semibold text-primary">Firewall (UFW)</h3>
                  <p className={cx("text-sm", systemData.firewall.active ? "text-success" : "text-error-600")}>
                    {systemData.firewall.active ? "Active" : "Inactive"}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                {systemData.firewall.rules.map((rule, i) => (
                  <div
                    key={i}
                    className={cx(
                      "flex items-start justify-between text-xs py-1.5",
                      i < systemData.firewall.rules.length - 1 ? "border-b border-secondary" : ""
                    )}
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-primary">{rule.port}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-success/10 text-success">
                          {rule.action}
                        </span>
                      </div>
                      {rule.comment && <span className="text-[10px] text-quaternary">{rule.comment}</span>}
                    </div>
                    <span className="font-mono text-right text-secondary" style={{ maxWidth: "120px", wordBreak: "break-all" }}>
                      {rule.from}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs Modal */}
      {logsModal && (
        <div className="fixed inset-0 z-[1000] bg-black/85 flex items-center justify-center p-4">
          <div
            className="w-[95vw] max-w-[900px] h-[80vh] rounded-2xl border border-secondary bg-secondary flex flex-col overflow-hidden"
          >
            {/* Log header */}
            <div
              className="flex items-center gap-3 px-4 py-3.5 border-b border-secondary shrink-0"
            >
              <Terminal className="w-4 h-4 text-brand-600" />
              <span className="text-primary font-mono text-sm">
                {logsModal.name} logs
              </span>
              <span className="text-xs text-quaternary ml-2">
                ({logsModal.backend})
              </span>
              <button
                onClick={() => setLogsModal(null)}
                className="ml-auto p-1.5 rounded-md bg-transparent border-0 cursor-pointer text-quaternary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Log content */}
            <div className="flex-1 overflow-auto p-4">
              {logsModal.loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                </div>
              ) : (
                <pre className="font-mono text-xs text-primary whitespace-pre-wrap break-all leading-relaxed">
                  {logsModal.content || "No log output"}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
