"use client";

import { HomeLine, SearchLg, Trash01, Edit05, Plus } from "@untitledui/icons";
import { useState, useEffect, useMemo } from "react";
import { PageHeader, Input, MemberSelector, Avatar, AvatarGroup, Table, TableCard, Button, ModalForm, ConfirmActionDialog } from "@circos/ui";
import { PaginationCardDefault } from "@/components/application/pagination/pagination";
import type { ProjectRow } from "@/types/project";

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

  const filtered = useMemo(
    () => projects.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())),
    [projects, search]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreate = () => {
    setFormName("");
    setFormDesc("");
    setIsCreateOpen(true);
  };

  const handleCreate = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim(), description: formDesc.trim() || undefined }),
      });
      if (!res.ok) throw new Error("Create failed");
      setIsCreateOpen(false);
      refetchProjects();
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
      <div className="flex flex-col items-start gap-8 self-stretch px-8">
        <PageHeader
          title="Search Projects"
          breadcrumbs={[
            { icon: HomeLine, href: "/" },
            { label: "Dashboard", href: "/" },
            { label: "Projects" },
          ]}
          actions={
            <div className="flex items-center gap-3">
              <Input
                className="w-full min-w-[200px] max-w-[320px]"
                size="sm"
                aria-label="Search"
                placeholder="Search"
                icon={SearchLg}
                shortcut
                value={search}
                onChange={(v: string) => { setSearch(v); setPage(1); }}
              />
              <Button size="sm" iconLeading={Plus} onClick={openCreate}>
                Create new
              </Button>
            </div>
          }
          bordered={false}
        />
      </div>

      <div className="flex items-start gap-6 self-stretch px-8">
        <MemberSelector users={[]} label="Members" />
        <MemberSelector users={[]} label="Agents" />
      </div>

      <div className="flex flex-col items-start gap-6 self-stretch px-8">
        <TableCard.Root size="md" className="w-full">
          <Table aria-label="Projects table" className="w-full">
            <Table.Header>
            <Table.Head id="company" isRowHeader allowsSorting className="w-full">
              <span className="text-xs font-medium text-quaternary">Company</span>
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
              <Table.Row key={project.project_id}>
                <Table.Cell>
                  <div className="flex items-center gap-3">
                    <Avatar src={project.cover_icon ?? undefined} alt={project.name} size="md" />
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
                    <Button color="tertiary" size="sm" iconLeading={Trash01} aria-label="Delete" onClick={() => setDeleteTarget(project)} />
                    <Button color="tertiary" size="sm" iconLeading={Edit05} aria-label="Edit" onClick={() => openEdit(project)} />
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
