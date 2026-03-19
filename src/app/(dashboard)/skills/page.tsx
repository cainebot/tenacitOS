"use client";

import { useEffect, useState, useCallback } from "react";
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
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", zIndex: 100 }}
      onClick={onClose}
    >
      <div
        style={{ backgroundColor: "var(--surface)", borderRadius: "12px", maxWidth: "600px", width: "100%", maxHeight: "90vh", overflow: "auto", border: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "18px", fontWeight: 700, color: "var(--text-primary)" }}>Register Skill</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}><X style={{ width: "20px", height: "20px" }} /></button>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: "0 0 60px" }}>
              <label style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Icon</label>
              <input value={icon} onChange={(e) => setIcon(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "6px", backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: "20px", textAlign: "center" }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. hubspot-prospecting" style={{ width: "100%", padding: "10px", borderRadius: "6px", backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)", fontSize: "13px" }} />
            </div>
          </div>
          <div>
            <label style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does this skill enable?" style={{ width: "100%", padding: "10px", borderRadius: "6px", backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)", fontSize: "13px" }} />
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={() => setOrigin("local")} style={{ flex: 1, padding: "10px", borderRadius: "6px", backgroundColor: origin === "local" ? "var(--accent-soft)" : "var(--surface-elevated)", color: origin === "local" ? "var(--accent)" : "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600 }}>Local</button>
            <button onClick={() => setOrigin("github")} style={{ flex: 1, padding: "10px", borderRadius: "6px", backgroundColor: origin === "github" ? "var(--accent-soft)" : "var(--surface-elevated)", color: origin === "github" ? "var(--accent)" : "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600 }}>GitHub</button>
            <button onClick={() => setOrigin("skills_sh")} style={{ flex: 1, padding: "10px", borderRadius: "6px", backgroundColor: origin === "skills_sh" ? "var(--accent-soft)" : "var(--surface-elevated)", color: origin === "skills_sh" ? "var(--accent)" : "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600 }}>skills.sh</button>
          </div>
          {origin !== "local" && (
            <div>
              <label style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>GitHub URL</label>
              <input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://github.com/org/repo/skill.md" style={{ width: "100%", padding: "10px", borderRadius: "6px", backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "12px" }} />
            </div>
          )}
          <div>
            <label style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>Skill Content (Markdown)</label>
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="# Skill instructions&#10;&#10;Paste your .md or .skill content here..." rows={10} style={{ width: "100%", padding: "10px", borderRadius: "6px", backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-mono)", fontSize: "12px", resize: "vertical" }} />
          </div>
          <button onClick={handleSubmit} disabled={!name.trim() || saving} style={{ padding: "12px 24px", borderRadius: "6px", backgroundColor: "var(--accent)", color: "white", border: "none", cursor: name.trim() && !saving ? "pointer" : "not-allowed", fontFamily: "var(--font-body)", fontSize: "13px", fontWeight: 600, opacity: name.trim() && !saving ? 1 : 0.5 }}>
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
    installed: { icon: CheckCircle, color: "var(--positive)", bg: "rgba(34,197,94,0.1)", label: "Installed" },
    pending: { icon: Clock, color: "var(--warning)", bg: "rgba(234,179,8,0.1)", label: "Pending" },
    failed: { icon: AlertCircle, color: "var(--negative)", bg: "rgba(239,68,68,0.1)", label: "Failed" },
  }[status] ?? { icon: Clock, color: "var(--text-muted)", bg: "var(--surface-elevated)", label: status };

  const Icon = config.icon;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "2px 8px", borderRadius: "4px", backgroundColor: config.bg, color: config.color, fontSize: "10px", fontWeight: 600, fontFamily: "var(--font-body)" }}>
      <Icon style={{ width: "10px", height: "10px" }} />
      {config.label}
    </span>
  );
}

// -- Skill Card --
function SkillCard({ skill, onClick }: { skill: Skill; onClick: () => void }) {
  return (
    <div
      style={{ backgroundColor: "var(--surface)", borderRadius: "8px", padding: "16px", border: "1px solid var(--border)", cursor: "pointer", transition: "all 150ms ease" }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--surface-hover)"; e.currentTarget.style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--surface)"; e.currentTarget.style.borderColor = "var(--border)"; }}
      onClick={onClick}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "12px", marginBottom: "12px" }}>
        <span style={{ fontSize: "24px", flexShrink: 0 }}>{skill.icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "4px" }}>{skill.name}</h3>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-secondary)", lineHeight: "1.5", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{skill.description || "No description"}</p>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "12px", borderTop: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ backgroundColor: skill.origin === "local" ? "var(--accent-soft)" : "var(--surface-elevated)", color: skill.origin === "local" ? "var(--accent)" : "var(--text-muted)", padding: "3px 8px", borderRadius: "4px", fontFamily: "var(--font-body)", fontSize: "9px", fontWeight: 700, letterSpacing: "1px", textTransform: "uppercase" as const }}>{{ local: "Local", github: "GitHub", skills_sh: "skills.sh" }[skill.origin] ?? skill.origin}</span>
          {skill.latest_version && (
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--text-muted)" }}>v{skill.latest_version.version}</span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Users style={{ width: "12px", height: "12px", color: "var(--text-muted)" }} />
          <span style={{ fontFamily: "var(--font-body)", fontSize: "10px", color: "var(--text-muted)" }}>{skill.agent_count}</span>
          {skill.source_url && <ExternalLink style={{ width: "12px", height: "12px", color: "var(--text-muted)", marginLeft: "4px" }} />}
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
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", zIndex: 100 }} onClick={onClose}>
      <div style={{ backgroundColor: "var(--surface)", borderRadius: "12px", maxWidth: "700px", width: "100%", maxHeight: "90vh", overflow: "auto", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "24px", borderBottom: "1px solid var(--border)", position: "relative" }}>
          <button onClick={onClose} style={{ position: "absolute", top: "24px", right: "24px", padding: "8px", borderRadius: "6px", backgroundColor: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X style={{ width: "20px", height: "20px" }} /></button>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", paddingRight: "40px" }}>
            <span style={{ fontSize: "48px" }}>{skill.icon}</span>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontFamily: "var(--font-heading)", fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>{skill.name}</h2>
              <p style={{ fontFamily: "var(--font-body)", fontSize: "14px", color: "var(--text-secondary)", marginBottom: "12px" }}>{skill.description || "No description"}</p>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span className="badge-positive">{skill.origin}</span>
                <span className="badge-info">{skill.version_count} version{skill.version_count !== 1 ? "s" : ""}</span>
                <span className="badge-info">{skill.agent_count} agent{skill.agent_count !== 1 ? "s" : ""}</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ padding: "24px" }}>
          {/* Versions */}
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>Versions ({skill.skill_versions?.length ?? 0})</h3>
          {skill.skill_versions && skill.skill_versions.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
              {skill.skill_versions.map((v) => (
                <div key={v.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", backgroundColor: "var(--surface-elevated)", borderRadius: "6px", border: "1px solid var(--border)" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-primary)" }}>v{v.version}</span>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "11px", color: "var(--text-muted)" }}>{new Date(v.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)", marginBottom: "24px" }}>No versions yet</p>
          )}

          {/* Agents */}
          <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "14px", fontWeight: 600, color: "var(--text-primary)", marginBottom: "12px" }}>Assigned Agents ({skill.agent_skills?.length ?? 0})</h3>
          {skill.agent_skills && skill.agent_skills.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {skill.agent_skills.map((as) => (
                <div key={as.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", backgroundColor: "var(--surface-elevated)", borderRadius: "6px", border: "1px solid var(--border)" }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px", color: "var(--text-primary)" }}>@{as.agent_id}</span>
                  <StatusBadge status={as.status} />
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-muted)" }}>Not assigned to any agents</p>
          )}

          {/* Delete Section */}
          <div style={{ marginTop: "24px", paddingTop: "24px", borderTop: "1px solid var(--border)" }}>
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "6px", backgroundColor: "rgba(239,68,68,0.1)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.2)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600 }}
              >
                <Trash2 style={{ width: "14px", height: "14px" }} /> Delete Skill
              </button>
            ) : (
              <div style={{ backgroundColor: "rgba(239,68,68,0.05)", borderRadius: "8px", padding: "16px", border: "1px solid rgba(239,68,68,0.2)" }}>
                <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "#ef4444", fontWeight: 600, marginBottom: "8px" }}>
                  Delete "{skill.name}"?
                </p>
                {skill.agent_count > 0 && (
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: "var(--text-secondary)", marginBottom: "12px" }}>
                    This skill is assigned to {skill.agent_count} agent{skill.agent_count !== 1 ? "s" : ""}. It will be uninstalled from all agents before deletion.
                  </p>
                )}
                {deleteResult && (
                  <p style={{ fontFamily: "var(--font-body)", fontSize: "12px", color: deleteResult.startsWith("Error") ? "#ef4444" : "var(--text-secondary)", marginBottom: "12px" }}>
                    {deleteResult}
                  </p>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    style={{ padding: "8px 16px", borderRadius: "6px", backgroundColor: "#ef4444", color: "white", border: "none", cursor: deleting ? "not-allowed" : "pointer", fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600, opacity: deleting ? 0.5 : 1 }}
                  >
                    {deleting ? "Deleting..." : skill.agent_count > 0 ? "Uninstall & Delete" : "Delete"}
                  </button>
                  <button
                    onClick={() => { setShowDeleteConfirm(false); setDeleteResult(null); }}
                    style={{ padding: "8px 16px", borderRadius: "6px", backgroundColor: "var(--surface-elevated)", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600 }}
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
          <RefreshCw className="w-8 h-8 animate-spin" style={{ color: "var(--accent)" }} />
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
    <div style={{ padding: "24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "24px", fontWeight: 700, letterSpacing: "-1px", color: "var(--text-primary)", marginBottom: "4px" }}>Skills Marketplace</h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-secondary)" }}>Installable knowledge packages for your agents</p>
        </div>
        <button onClick={() => setShowRegister(true)} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "10px 16px", borderRadius: "6px", backgroundColor: "var(--accent)", color: "white", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600 }}>
          <Plus style={{ width: "14px", height: "14px" }} /> Register Skill
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {[
          { icon: Puzzle, value: skills.length, label: "Total Skills", color: "var(--text-primary)" },
          { icon: CheckCircle, value: totalInstalled, label: "Installed", color: "var(--positive)" },
        ].map(({ icon: Icon, value, label, color }) => (
          <div key={label} className="stats-card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Icon style={{ width: "16px", height: "16px", color }} />
              <span className="title">{label}</span>
            </div>
            <span className="value" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "240px" }}>
          <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: "var(--text-muted)" }} />
          <input type="text" placeholder="Search skills..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "100%", paddingLeft: "40px", paddingRight: "16px", paddingTop: "12px", paddingBottom: "12px", borderRadius: "6px", backgroundColor: "var(--surface-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "var(--font-body)", fontSize: "12px" }} />
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {(["all", "local", "github", "skills_sh"] as const).map((src) => (
            <button key={src} onClick={() => setFilterOrigin(src)} style={{ padding: "12px 20px", borderRadius: "6px", backgroundColor: filterOrigin === src ? "var(--accent-soft)" : "var(--surface)", color: filterOrigin === src ? "var(--accent)" : "var(--text-secondary)", border: "1px solid var(--border)", fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
              {{ all: `All (${skills.length})`, local: `Local (${localCount})`, github: `GitHub (${githubCount})`, skills_sh: `skills.sh (${skillsShCount})` }[src]}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div style={{ backgroundColor: "var(--surface)", borderRadius: "12px", padding: "48px", textAlign: "center" }}>
          <Puzzle style={{ width: "48px", height: "48px", color: "var(--text-muted)", margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-secondary)", marginBottom: "16px" }}>No skills found</p>
          <button onClick={() => setShowRegister(true)} style={{ padding: "10px 20px", borderRadius: "6px", backgroundColor: "var(--accent)", color: "white", border: "none", cursor: "pointer", fontFamily: "var(--font-body)", fontSize: "12px", fontWeight: 600 }}>Register your first skill</button>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
          {filtered.map((skill) => (
            <SkillCard key={skill.id} skill={skill} onClick={() => setSelectedSkill(skill)} />
          ))}
        </div>
      )}

      {selectedSkill && <SkillDetailModal skill={selectedSkill} onClose={() => setSelectedSkill(null)} onDeleted={fetchSkills} onToast={(msg) => { setToast(msg); setTimeout(() => setToast(null), 5000); }} />}

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", bottom: "24px", right: "24px", backgroundColor: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px 20px", boxShadow: "0 4px 12px rgba(0,0,0,0.3)", zIndex: 200, display: "flex", alignItems: "center", gap: "8px", maxWidth: "400px" }}>
          <RefreshCw className="w-4 h-4 animate-spin" style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span style={{ fontFamily: "var(--font-body)", fontSize: "13px", color: "var(--text-primary)" }}>{toast}</span>
          <button onClick={() => setToast(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "2px", flexShrink: 0 }}><X style={{ width: "14px", height: "14px" }} /></button>
        </div>
      )}
      {showRegister && <RegisterSkillModal onClose={() => setShowRegister(false)} onCreated={fetchSkills} />}
    </div>
  );
}
