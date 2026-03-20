"use client";

import { useEffect, useState, useCallback } from "react";
import SmartAddModal from '@/components/SmartAddModal';
import { cx } from "@openclaw/ui";
import {
  Search,
  RefreshCw,
  Puzzle,
  Plus,
  ExternalLink,
  X,
  Users,
  CheckCircle,
  AlertCircle,
  Clock,
  Trash2,
} from "lucide-react";

interface SkillVersion {
  id: string;
  version: string;
  created_at: string;
}

interface AgentSkillRef {
  id: string;
  agent_id: string;
  status: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  origin: "local" | "github" | "skills_sh";
  source_url: string | null;
  created_at: string;
  updated_at: string;
  version_count: number;
  agent_count: number;
  installed_count: number;
  latest_version: SkillVersion | null;
  skill_versions: SkillVersion[];
  agent_skills: AgentSkillRef[];
}

// -- Register Skill Modal --
function RegisterSkillModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("🔧");
  const [origin, setOrigin] = useState<"local" | "github" | "skills_sh">("local");
  const [sourceUrl, setSourceUrl] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description,
          icon,
          origin,
          source_url: sourceUrl || null,
          content: content || null,
          version: "1.0.0",
        }),
      });
      if (res.ok) {
        onCreated();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-[100]"
      onClick={onClose}
    >
      <div
        className="bg-secondary rounded-xl max-w-[600px] w-full max-h-[90vh] overflow-auto border border-secondary"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-secondary flex justify-between items-center">
          <h2 className="font-display text-lg font-bold text-primary">Register Skill</h2>
          <button onClick={onClose} className="bg-transparent border-0 cursor-pointer text-quaternary p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="flex gap-3">
            <div className="flex-[0_0_60px]">
              <label className="font-body text-[11px] text-secondary mb-1 block">Icon</label>
              <input value={icon} onChange={(e) => setIcon(e.target.value)} className="w-full p-[10px] rounded-md bg-tertiary border border-secondary text-primary text-xl text-center" />
            </div>
            <div className="flex-1">
              <label className="font-body text-[11px] text-secondary mb-1 block">Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. hubspot-prospecting" className="w-full p-[10px] rounded-md bg-tertiary border border-secondary text-primary font-body text-[13px]" />
            </div>
          </div>
          <div>
            <label className="font-body text-[11px] text-secondary mb-1 block">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this skill enable?" className="w-full p-[10px] rounded-md bg-tertiary border border-secondary text-primary font-body text-[13px]" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setOrigin("local")} className={cx("flex-1 p-[10px] rounded-md border border-secondary cursor-pointer font-body text-xs font-semibold", origin === "local" ? "bg-brand-50 text-brand-600" : "bg-tertiary text-secondary")}>Local</button>
            <button onClick={() => setOrigin("github")} className={cx("flex-1 p-[10px] rounded-md border border-secondary cursor-pointer font-body text-xs font-semibold", origin === "github" ? "bg-brand-50 text-brand-600" : "bg-tertiary text-secondary")}>GitHub</button>
            <button onClick={() => setOrigin("skills_sh")} className={cx("flex-1 p-[10px] rounded-md border border-secondary cursor-pointer font-body text-xs font-semibold", origin === "skills_sh" ? "bg-brand-50 text-brand-600" : "bg-tertiary text-secondary")}>skills.sh</button>
          </div>
          {origin !== "local" && (
            <div>
              <label className="font-body text-[11px] text-secondary mb-1 block">GitHub URL</label>
              <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://github.com/org/repo/skill.md" className="w-full p-[10px] rounded-md bg-tertiary border border-secondary text-primary font-mono text-xs" />
            </div>
          )}
          <div>
            <label className="font-body text-[11px] text-secondary mb-1 block">Skill Content (Markdown)</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="# Skill instructions&#10;&#10;Paste your .md or .skill content here..." rows={10} className="w-full p-[10px] rounded-md bg-tertiary border border-secondary text-primary font-mono text-xs resize-y" />
          </div>
          <button onClick={handleSubmit} disabled={!name.trim() || saving} className={cx("px-6 py-3 rounded-md bg-brand-50 text-white border-0 font-body text-[13px] font-semibold", name.trim() && !saving ? "cursor-pointer opacity-100" : "cursor-not-allowed opacity-50")}>
            {saving ? "Registering..." : "Register Skill"}
          </button>
        </div>
      </div>
    </div>
  );
}

// -- Status Badge --
function StatusBadge({ status }: { status: string }) {
  const config = {
    installed: { icon: CheckCircle, colorClass: "text-success", bgClass: "bg-success/10", label: "Installed" },
    pending: { icon: Clock, colorClass: "text-warning", bgClass: "bg-warning/10", label: "Pending" },
    failed: { icon: AlertCircle, colorClass: "text-error-600", bgClass: "bg-error/10", label: "Failed" },
  }[status] ?? { icon: Clock, colorClass: "text-quaternary", bgClass: "bg-tertiary", label: status };

  const Icon = config.icon;
  return (
    <span className={cx("inline-flex items-center gap-1 px-2 py-0.5 rounded font-body text-[10px] font-semibold", config.bgClass, config.colorClass)}>
      <Icon className="w-[10px] h-[10px]" />
      {config.label}
    </span>
  );
}

// -- Skill Card --
function SkillCard({ skill, onClick }: { skill: Skill; onClick: () => void }) {
  return (
    <div
      className="bg-secondary rounded-lg p-4 border border-secondary cursor-pointer transition-all duration-150 hover:bg-secondary-hover hover:border-secondary-strong"
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl shrink-0">{skill.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-semibold text-primary mb-1">{skill.name}</h3>
          <p className="font-body text-xs text-secondary leading-[1.5] line-clamp-2">{skill.description || "No description"}</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-secondary">
        <div className="flex items-center gap-2">
          <span className={cx("px-2 py-[3px] rounded font-body text-[9px] font-bold tracking-widest uppercase", skill.origin === "local" ? "bg-brand-50 text-brand-600" : "bg-tertiary text-quaternary")}>{{ local: "Local", github: "GitHub", skills_sh: "skills.sh" }[skill.origin] ?? skill.origin}</span>
          {skill.latest_version && (
            <span className="font-mono text-[10px] text-quaternary">v{skill.latest_version.version}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Users className="w-3 h-3 text-quaternary" />
          <span className="font-body text-[10px] text-quaternary">{skill.agent_count}</span>
          {skill.source_url && <ExternalLink className="w-3 h-3 text-quaternary ml-1" />}
        </div>
      </div>
    </div>
  );
}

// -- Skill Detail Modal --
function SkillDetailModal({ skill, onClose, onDeleted, onToast }: { skill: Skill; onClose: () => void; onDeleted: () => void; onToast: (msg: string) => void }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    setDeleteResult(null);
    try {
      const res = await fetch(`/api/skills/${skill.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.deleted) {
        onToast(`"${skill.name}" deleted.`);
        onDeleted();
        onClose();
      } else if (data.pending_deletion) {
        onToast(`Deleting "${skill.name}" — uninstalling from ${data.uninstalling_from.length} agent(s)...`);
        onDeleted();
        onClose();
      } else if (data.error) {
        setDeleteResult(`Error: ${data.error}`);
      }
    } catch {
      setDeleteResult("Failed to delete skill");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-6 z-[100]" onClick={onClose}>
      <div className="bg-secondary rounded-xl max-w-[700px] w-full max-h-[90vh] overflow-auto border border-secondary" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-secondary relative">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-md bg-transparent border-0 cursor-pointer text-quaternary"><X className="w-5 h-5" /></button>
          <div className="flex items-start gap-4 pr-10">
            <span className="text-5xl">{skill.icon}</span>
            <div className="flex-1">
              <h2 className="font-display text-2xl font-bold text-primary mb-2">{skill.name}</h2>
              <p className="font-body text-sm text-secondary mb-3">{skill.description || "No description"}</p>
              <div className="flex gap-2 flex-wrap">
                <span className="badge-positive">{skill.origin}</span>
                <span className="badge-info">{skill.version_count} version{skill.version_count !== 1 ? "s" : ""}</span>
                <span className="badge-info">{skill.agent_count} agent{skill.agent_count !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6">
          {/* Versions */}
          <h3 className="font-display text-sm font-semibold text-primary mb-3">Versions ({skill.skill_versions?.length ?? 0})</h3>
          {skill.skill_versions && skill.skill_versions.length > 0 ? (
            <div className="flex flex-col gap-2 mb-6">
              {skill.skill_versions.map((v) => (
                <div key={v.id} className="flex justify-between px-3 py-2 bg-tertiary rounded-md border border-secondary">
                  <span className="font-mono text-xs text-primary">v{v.version}</span>
                  <span className="font-body text-[11px] text-quaternary">{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-body text-xs text-quaternary mb-6">No versions yet</p>
          )}

          {/* Agents */}
          <h3 className="font-display text-sm font-semibold text-primary mb-3">Assigned Agents ({skill.agent_skills?.length ?? 0})</h3>
          {skill.agent_skills && skill.agent_skills.length > 0 ? (
            <div className="flex flex-col gap-2">
              {skill.agent_skills.map((as) => (
                <div key={as.id} className="flex justify-between items-center px-3 py-2 bg-tertiary rounded-md border border-secondary">
                  <span className="font-mono text-xs text-primary">@{as.agent_id}</span>
                  <StatusBadge status={as.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="font-body text-xs text-quaternary">Not assigned to any agents</p>
          )}

          {/* Delete Section */}
          <div className="mt-6 pt-6 border-t border-secondary">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-error/10 text-error-600 border border-error/20 cursor-pointer font-body text-xs font-semibold"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete Skill
              </button>
            ) : (
              <div className="bg-error/5 rounded-lg p-4 border border-error/20">
                <p className="font-body text-[13px] text-error-600 font-semibold mb-2">
                  Delete "{skill.name}"?
                </p>
                {skill.agent_count > 0 && (
                  <p className="font-body text-xs text-secondary mb-3">
                    This skill is assigned to {skill.agent_count} agent{skill.agent_count !== 1 ? "s" : ""}. It will be uninstalled from all agents before deletion.
                  </p>
                )}
                {deleteResult && (
                  <p className={cx("font-body text-xs mb-3", deleteResult.startsWith("Error") ? "text-error-600" : "text-secondary")}>
                    {deleteResult}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className={cx("px-4 py-2 rounded-md bg-error text-white border-0 font-body text-xs font-semibold", deleting ? "cursor-not-allowed opacity-50" : "cursor-pointer opacity-100")}
                  >
                    {deleting ? "Deleting..." : skill.agent_count > 0 ? "Uninstall & Delete" : "Delete"}
                  </button>
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteResult(null); }}
                    className="px-4 py-2 rounded-md bg-tertiary text-secondary border border-secondary cursor-pointer font-body text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// -- Main Page --
export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOrigin, setFilterOrigin] = useState<"all" | "local" | "github" | "skills_sh">("all");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showLegacyRegister, setShowLegacyRegister] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchSkills = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/skills");
      const data = await res.json();
      setSkills(data.skills ?? []);
    } catch {
      setSkills([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSkills(); }, [fetchSkills]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="w-8 h-8 animate-spin text-brand-600" />
        </div>
      </div>
    );
  }

  let filtered = skills;
  if (filterOrigin !== "all") filtered = filtered.filter((s) => s.origin === filterOrigin);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
  }

  const localCount = skills.filter((s) => s.origin === "local").length;
  const githubCount = skills.filter((s) => s.origin === "github").length;
  const skillsShCount = skills.filter((s) => s.origin === "skills_sh").length;
  const totalInstalled = skills.reduce((sum, s) => sum + s.installed_count, 0);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-primary mb-1">Skills Marketplace</h1>
          <p className="font-body text-[13px] text-secondary">Installable knowledge packages for your agents</p>
        </div>
        <button onClick={() => setShowRegister(true)} className="flex items-center gap-1.5 px-4 py-[10px] rounded-md bg-brand-50 text-white border-0 cursor-pointer font-body text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> Register Skill
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6">
        {[
          { icon: Puzzle, value: skills.length, label: "Total Skills", colorClass: "text-primary" },
          { icon: CheckCircle, value: totalInstalled, label: "Installed", colorClass: "text-success" },
        ].map(({ icon: Icon, value, label, colorClass }) => (
          <div key={label} className="stats-card flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon className={cx("w-4 h-4", colorClass)} />
              <span className="title">{label}</span>
            </div>
            <span className={cx("value", colorClass)}>{value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-quaternary" />
          <input type="text" placeholder="Search skills..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-3 rounded-md bg-tertiary border border-secondary text-primary font-body text-xs" />
        </div>
        <div className="flex gap-2">
          {(["all", "local", "github", "skills_sh"] as const).map((src) => (
            <button key={src} onClick={() => setFilterOrigin(src)} className={cx("px-5 py-3 rounded-md border border-secondary font-body text-xs font-semibold cursor-pointer", filterOrigin === src ? "bg-brand-50 text-brand-600" : "bg-secondary text-secondary")}>
              {{ all: `All (${skills.length})`, local: `Local (${localCount})`, github: `GitHub (${githubCount})`, skills_sh: `skills.sh (${skillsShCount})` }[src]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="bg-secondary rounded-xl p-12 text-center">
          <Puzzle className="w-12 h-12 text-quaternary mx-auto mb-4" />
          <p className="text-secondary mb-4">No skills found</p>
          <button onClick={() => setShowRegister(true)} className="px-5 py-[10px] rounded-md bg-brand-50 text-white border-0 cursor-pointer font-body text-xs font-semibold">Register your first skill</button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
          {filtered.map((skill) => (
            <SkillCard key={skill.id} skill={skill} onClick={() => setSelectedSkill(skill)} />
          ))}
        </div>
      )}

      {selectedSkill && <SkillDetailModal skill={selectedSkill} onClose={() => setSelectedSkill(null)} onDeleted={fetchSkills} onToast={(msg) => { setToast(msg); setTimeout(() => setToast(null), 5000); }} />}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-secondary border border-secondary rounded-lg px-5 py-3 shadow-[0_4px_12px_rgba(0,0,0,0.3)] z-[200] flex items-center gap-2 max-w-[400px]">
          <RefreshCw className="w-4 h-4 animate-spin text-brand-600 shrink-0" />
          <span className="font-body text-[13px] text-primary">{toast}</span>
          <button onClick={() => setToast(null)} className="bg-transparent border-0 cursor-pointer text-quaternary p-0.5 shrink-0"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}
      {showRegister && (
        <SmartAddModal
          onClose={() => setShowRegister(false)}
          onCreated={fetchSkills}
          onToast={(msg) => { setToast(msg); setTimeout(() => setToast(null), 5000); }}
          onManual={() => { setShowRegister(false); setShowLegacyRegister(true); }}
        />
      )}
      {showLegacyRegister && (
        <RegisterSkillModal
          onClose={() => setShowLegacyRegister(false)}
          onCreated={() => { fetchSkills(); setShowLegacyRegister(false); }}
        />
      )}
    </div>
  );
}
