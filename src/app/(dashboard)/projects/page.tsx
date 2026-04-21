"use client";

import { HomeLine, Trash01, Edit05, Plus, User01 } from "@untitledui/icons";
import { useState, useEffect, useMemo, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, Input, AvatarGroup, Table, TableCard, Button, ModalForm, ConfirmActionDialog } from "@circos/ui";
import { PaginationCardDefault } from "@/components/application/pagination/pagination";
import type { ProjectRow } from "@/types/project";
import { ProjectCover, type ProjectCoverValue } from "@/components/application/project-cover/project-cover";
import { KanbanBoardHeader, type SortOption } from "@/components/application/kanban-board-header";
import {
  type FilterRow,
  type FilterFieldDefinition,
  type FilterFieldType,
} from "@/components/application/dynamic-filter";
import { BotIcon } from "@/components/icons/bot-icon";
import { ProjectIconBadge, type ProjectCoverColorId, type ProjectCoverIcon } from "@/components/application/project-cover";

export default function ProjectsPage() {
  const PAGE_SIZE = 7; // matches current mock count per page

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // CRUD state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ProjectRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRow | null>(null);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();
  const [formCover, setFormCover] = useState<ProjectCoverValue>({ color: "gray", icon: "clipboard-list" });

  // Dynamic filter + sort state (Phase 111-01)
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [sortBy, setSortBy] = useState<SortOption | null>(null);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data: ProjectRow[]) => setProjects(data))
      .catch(() => {}) // fail silently — empty table shown
      .finally(() => setIsLoading(false));
  }, []);

  const refetchProjects = () => {
    fetch("/api/projects")
      .then((r) => r.json())
      .then((data: ProjectRow[]) => setProjects(data));
  };

  const allMembers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; handle: string; avatarUrl?: string }>();
    for (const p of projects) {
      for (const m of p.members ?? []) {
        if (m.type === "user" && !map.has(m.id)) {
          map.set(m.id, { id: m.id, name: m.name, handle: m.name.toLowerCase().replace(/\s+/g, "."), avatarUrl: m.avatarUrl });
        }
      }
    }
    return Array.from(map.values());
  }, [projects]);

  const allAgents = useMemo(() => {
    const map = new Map<string, { id: string; name: string; handle: string; avatarUrl?: string }>();
    for (const p of projects) {
      for (const m of p.members ?? []) {
        if (m.type === "agent" && !map.has(m.id)) {
          map.set(m.id, { id: m.id, name: m.name, handle: m.name.toLowerCase().replace(/\s+/g, "."), avatarUrl: m.avatarUrl });
        }
      }
    }
    return Array.from(map.values());
  }, [projects]);

  const filterFields: FilterFieldDefinition[] = useMemo(() => [
    {
      type: "member",
      label: "Member",
      icon: User01,
      operators: ["equal", "not_equal"],
      values: allMembers.map((m) => ({ id: m.id, label: m.name, avatarUrl: m.avatarUrl })),
    },
    {
      type: "agent",
      label: "Agent",
      icon: BotIcon,
      operators: ["equal", "not_equal"],
      values: allAgents.map((a) => ({ id: a.id, label: a.name, avatarUrl: a.avatarUrl })),
    },
  ], [allMembers, allAgents]);

  const filtered = useMemo(() => {
    let result = projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

    // Agrupar filters por fieldType: equals del mismo tipo → OR-group (legacy multi-select);
    // not_equals → AND; grupos de distinto fieldType → AND entre sí.
    const fieldTypeToMemberType = (t: FilterFieldType): "user" | "agent" | null =>
      t === "member" ? "user" : t === "agent" ? "agent" : null;
    const grouped = filters.reduce<Record<string, FilterRow[]>>((acc, f) => {
      if (!f.value) return acc;
      if (!fieldTypeToMemberType(f.fieldType)) return acc;
      (acc[f.fieldType] ??= []).push(f);
      return acc;
    }, {});

    for (const [fieldType, rows] of Object.entries(grouped)) {
      const memberType = fieldTypeToMemberType(fieldType as FilterFieldType)!;
      const equalValues = rows.filter((r) => r.operator === "equal").map((r) => r.value!);
      const notEqualValues = rows.filter((r) => r.operator === "not_equal").map((r) => r.value!);
      result = result.filter((p) => {
        const memberIds = new Set((p.members ?? []).filter((m) => m.type === memberType).map((m) => m.id));
        if (equalValues.length > 0 && !equalValues.some((id) => memberIds.has(id))) return false;
        if (notEqualValues.some((id) => memberIds.has(id))) return false;
        return true;
      });
    }

    if (sortBy === "alpha_asc")  result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "alpha_desc") result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    if (sortBy === "date_asc")   result = [...result].sort((a, b) => a.created_at.localeCompare(b.created_at));
    if (sortBy === "date_desc")  result = [...result].sort((a, b) => b.created_at.localeCompare(a.created_at));

    return result;
  }, [projects, search, filters, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setFormName("");
    setFormDesc("");
    setFormCover({ color: "gray", icon: "clipboard-list" });
    setIsCreateOpen(true);
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          description: formDesc.trim() || undefined,
          cover_color: formCover.color,
          cover_icon: formCover.icon,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      const project: ProjectRow = await res.json();
      setIsCreateOpen(false);
      // Notify sidebar to refresh project list
      window.dispatchEvent(new Event("project-created"));
      // Navigate to the new project's board (D-15)
      router.push(`/projects/${project.slug}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (project: ProjectRow) => {
    setFormName(project.name);
    setFormDesc(project.description ?? "");
    setEditTarget(project);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${editTarget.project_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), description: formDesc.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Update failed");
      setEditTarget(null);
      refetchProjects();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${deleteTarget.project_id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) throw new Error("Delete failed");
      setDeleteTarget(null);
      refetchProjects();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-start gap-8 self-stretch px-8 pt-6">
        <PageHeader
          title="Search Projects"
          breadcrumbs={[
            { icon: HomeLine, href: "/" },
            { label: "Dashboard", href: "/" },
            { label: "Projects" },
          ]}
          bordered={false}
        />
      </div>

      <div className="self-stretch px-8">
        <KanbanBoardHeader
          filterFields={filterFields}
          filters={filters}
          onFiltersChange={(f) => { setFilters(f); setPage(1); }}
          sortBy={sortBy}
          onSortChange={(s) => { setSortBy(s); setPage(1); }}
          search={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          onAddTask={openCreate}
          primaryLabel="Create project"
          primaryIcon={Plus}
          hideAgentBoard
          hideSettings
        />
      </div>

      <div className="flex flex-col items-start gap-6 self-stretch px-8">
        <TableCard.Root size="md" className="w-full">
          <Table aria-label="Projects table" className="w-full">
            <Table.Header>
            <Table.Head id="project" isRowHeader allowsSorting className="w-full">
              <span className="text-xs font-medium text-quaternary">Project</span>
            </Table.Head>
            <Table.Head id="key">
              <span className="text-xs font-medium text-quaternary">Key</span>
            </Table.Head>
            <Table.Head id="users">
              <span className="text-xs font-medium text-quaternary">Users</span>
            </Table.Head>
            <Table.Head id="agents">
              <span className="text-xs font-medium text-quaternary">Agents</span>
            </Table.Head>
            <Table.Head id="actions">
              <span className="sr-only">Actions</span>
            </Table.Head>
          </Table.Header>
          <Table.Body>
            {visible.map((project) => (
              // a11y: row-click solo funciona con mouse. Para navegación keyboard-only, usar la ruta /projects (browser URL) o abrir el board desde otro affordance en una fase futura.
              <Table.Row
                key={project.project_id}
                className="cursor-pointer"
                onAction={() => router.push(`/projects/${project.slug}`)}
              >
                <Table.Cell>
                  <div className="flex items-center gap-3">
                    <ProjectIconBadge
                      color={(project.cover_color ?? "gray") as ProjectCoverColorId}
                      icon={(project.cover_icon ?? "clipboard-list") as ProjectCoverIcon}
                      size={40}
                      iconSize={18}
                      rounded="rounded-xl"
                    />
                    <span className="text-sm font-medium text-primary">{project.name}</span>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-sm text-tertiary">{project.name.slice(0, 3).toUpperCase()}</span>
                </Table.Cell>
                <Table.Cell>
                  <AvatarGroup
                    size="sm"
                    max={3}
                    avatars={(project.members ?? []).filter((m) => m.type === "user").map((m) => ({ src: m.avatarUrl, alt: m.name }))}
                  />
                </Table.Cell>
                <Table.Cell>
                  <AvatarGroup
                    size="sm"
                    max={5}
                    avatars={(project.members ?? []).filter((m) => m.type === "agent").map((m) => ({ src: m.avatarUrl, alt: m.name }))}
                  />
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-1">
                    <Button color="tertiary" size="sm" iconLeading={Trash01} aria-label="Delete" onClick={(e: MouseEvent) => { e.stopPropagation(); setDeleteTarget(project); }} />
                    <Button color="tertiary" size="sm" iconLeading={Edit05} aria-label="Edit" onClick={(e: MouseEvent) => { e.stopPropagation(); openEdit(project); }} />
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        <PaginationCardDefault page={page} total={totalPages} onPageChange={setPage} />
      </TableCard.Root>
    </div>

      {/* Create modal */}
      <ModalForm
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Create Project"
        submitLabel="Create"
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      >
        <div className="flex flex-col gap-4">
          <ProjectCover value={formCover} onChange={setFormCover} size="lg" />
          <Input label="Name" value={formName} onChange={setFormName} isRequired size="md" />
          <Input label="Description" value={formDesc} onChange={setFormDesc} size="md" />
        </div>
      </ModalForm>

      {/* Edit modal */}
      <ModalForm
        isOpen={editTarget !== null}
        onOpenChange={(open) => { if (!open) setEditTarget(null); }}
        title="Edit Project"
        submitLabel="Save"
        onSubmit={handleEdit}
        isSubmitting={isSubmitting}
      >
        <div className="flex flex-col gap-4">
          <Input label="Name" value={formName} onChange={setFormName} isRequired size="md" />
          <Input label="Description" value={formDesc} onChange={setFormDesc} size="md" />
        </div>
      </ModalForm>

      {/* Delete confirmation */}
      <ConfirmActionDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        title="Delete Project"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        isConfirming={isDeleting}
        confirmLabel="Delete"
      />
    </>
  );
}
