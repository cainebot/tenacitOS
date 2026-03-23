"use client";

import { HomeLine, SearchLg, Trash01, Edit05 } from "@untitledui/icons";
import { useState } from "react";
import { PageHeader, Input, MemberSelector, Avatar, AvatarGroup, Table, TableCard, Button } from "@circos/ui";
import { PaginationCardDefault } from "@/components/application/pagination/pagination";

const mockMembers = [
  { id: "1", name: "Olivia Rhye", handle: "olivia", avatarUrl: "/avatars/Olivia Rhye.webp" },
  { id: "2", name: "Phoenix Baker", handle: "phoenix", avatarUrl: "/avatars/Phoenix Baker.webp" },
  { id: "3", name: "Lana Steiner", handle: "lana", avatarUrl: "/avatars/Lana Steiner.webp" },
  { id: "4", name: "Drew Cano", handle: "drew", avatarUrl: "/avatars/Drew Cano.webp" },
];

const mockAgents = [
  { id: "a1", name: "Pomni", handle: "pomni", avatarUrl: "/avatars/Alec Whitten.webp" },
  { id: "a2", name: "Jax", handle: "jax", avatarUrl: "/avatars/Amelie Laurent.webp" },
  { id: "a3", name: "Ragatha", handle: "ragatha", avatarUrl: "/avatars/Andi Lane.webp" },
  { id: "a4", name: "Kinger", handle: "kinger", avatarUrl: "/avatars/Natali Craig.webp" },
];

const a = (name: string) => `/avatars/${name}.webp`;

const projects = [
  {
    name: "Ephemeral",
    key: "EPH",
    icon: a("Olivia Rhye"),
    users: [a("Olivia Rhye"), a("Phoenix Baker")],
    agents: [a("Alec Whitten"), a("Amelie Laurent"), a("Andi Lane"), a("Natali Craig"), a("Candice Wu"), a("Demi Wilkinson"), a("Anita Cruz"), a("Ashwin Santiago")],
    about: "Content curating app",
    description: "Brings all your news into one place",
  },
  {
    name: "Stack3d Lab",
    key: "STK",
    icon: a("Phoenix Baker"),
    users: [a("Phoenix Baker"), a("Lana Steiner"), a("Drew Cano")],
    agents: [a("Amelie Laurent"), a("Andi Lane")],
    about: "Design software",
    description: "Super lightweight design app",
  },
  {
    name: "Warpspeed",
    key: "WAR",
    icon: a("Lana Steiner"),
    users: [a("Drew Cano"), a("Candice Wu"), a("Demi Wilkinson")],
    agents: [a("Natali Craig"), a("Alec Whitten"), a("Amelie Laurent")],
    about: "Data prediction",
    description: "AI and machine learning data",
  },
  {
    name: "CloudWatch",
    key: "CLD",
    icon: a("Drew Cano"),
    users: [a("Olivia Rhye"), a("Phoenix Baker"), a("Lana Steiner"), a("Drew Cano"), a("Candice Wu"), a("Demi Wilkinson"), a("Anita Cruz"), a("Ashwin Santiago")],
    agents: [a("Andi Lane"), a("Natali Craig"), a("Alec Whitten"), a("Amelie Laurent"), a("Candice Wu"), a("Demi Wilkinson"), a("Anita Cruz"), a("Ashwin Santiago")],
    about: "Productivity app",
    description: "Time management and productivity",
  },
  {
    name: "ContrastAI",
    key: "CON",
    icon: a("Candice Wu"),
    users: [a("Ashwin Santiago"), a("Ammar Foley"), a("Aliah Lane")],
    agents: [a("Angelica Wallace"), a("Ashton Blackwell"), a("Anita Cruz")],
    about: "Web app integrations",
    description: "Connect web apps seamlessly",
  },
  {
    name: "Convergence",
    key: "CGC",
    icon: a("Demi Wilkinson"),
    users: [a("Olivia Rhye"), a("Phoenix Baker")],
    agents: [a("Amelie Laurent"), a("Andi Lane"), a("Natali Craig")],
    about: "Sales CRM",
    description: "Web-based sales doc management",
  },
  {
    name: "Sisyphus",
    key: "SIS",
    icon: a("Anita Cruz"),
    users: [a("Lana Steiner"), a("Drew Cano"), a("Candice Wu"), a("Demi Wilkinson"), a("Anita Cruz"), a("Ashwin Santiago"), a("Ammar Foley"), a("Aliah Lane")],
    agents: [a("Alec Whitten"), a("Amelie Laurent")],
    about: "Automation and workflow",
    description: "Time tracking, invoicing and expenses",
  },
];

export default function ProjectsPage() {
  const [page, setPage] = useState(1);
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
            <Input
              className="w-full min-w-[200px] max-w-[320px]"
              size="sm"
              aria-label="Search"
              placeholder="Search"
              icon={SearchLg}
              shortcut
            />
          }
          bordered={false}
        />
      </div>

      <div className="flex items-start gap-6 self-stretch px-8">
        <MemberSelector users={mockMembers} label="Members" />
        <MemberSelector users={mockAgents} label="Agents" />
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
            {projects.map((project) => (
              <Table.Row key={project.key}>
                <Table.Cell>
                  <div className="flex items-center gap-3">
                    <Avatar src={project.icon} alt={project.name} size="md" />
                    <span className="text-sm font-medium text-primary">{project.name}</span>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <span className="text-sm text-tertiary">{project.key}</span>
                </Table.Cell>
                <Table.Cell>
                  <AvatarGroup
                    size="sm"
                    max={3}
                    avatars={project.users.map((src, i) => ({ src, alt: `User ${i + 1}` }))}
                  />
                </Table.Cell>
                <Table.Cell>
                  <AvatarGroup
                    size="sm"
                    max={5}
                    avatars={project.agents.map((src, i) => ({ src, alt: `Agent ${i + 1}` }))}
                  />
                </Table.Cell>
                <Table.Cell>
                  <div className="flex items-center gap-1">
                    <Button color="tertiary" size="sm" iconLeading={Trash01} aria-label="Delete" />
                    <Button color="tertiary" size="sm" iconLeading={Edit05} aria-label="Edit" />
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        <PaginationCardDefault page={page} total={10} onPageChange={setPage} />
      </TableCard.Root>
    </div>
  </>
  );
}
