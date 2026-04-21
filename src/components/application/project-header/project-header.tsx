"use client"

import { type FC, type ReactNode } from "react"
import { ChevronDown, Star01, List, Calendar, PieChart03, Users01, File06 } from "@untitledui/icons"
import { ButtonUtility, AvatarGroup, Tabs, TabList, Tab, TabPanel, cx } from "@circos/ui"
import { ProjectCover, type ProjectCoverValue } from "../project-cover/project-cover"
import { Kanban } from "@/components/icons/kanban-icon"
import { ChartNoAxesGantt } from "@/components/icons/chart-no-axes-gantt-icon"
import { Workflow } from "@/components/icons/workflow-icon"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectHeaderTab {
  id: string
  label: string
  icon?: FC<{ className?: string; size?: number }>
}

export interface ProjectHeaderProps {
  name: string
  cover: ProjectCoverValue
  onCoverChange?: (value: ProjectCoverValue) => void
  avatars?: Array<{ src?: string | null; alt?: string }>
  onAddMember?: () => void
  tabs?: ProjectHeaderTab[]
  selectedTab?: string
  onTabChange?: (tabId: string) => void
  children?: ReactNode
  className?: string
}

// ---------------------------------------------------------------------------
// Default tabs
// ---------------------------------------------------------------------------

const DEFAULT_TABS: ProjectHeaderTab[] = [
  { id: "overview", label: "Overview", icon: File06 },
  { id: "list", label: "List", icon: List },
  { id: "board", label: "Board", icon: Kanban },
  { id: "timeline", label: "Timeline", icon: ChartNoAxesGantt },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "workflow", label: "Workflow", icon: Workflow },
  { id: "dashboard", label: "Dashboard", icon: PieChart03 },
  { id: "team-chart", label: "Team Chart", icon: Users01 },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectHeader({
  name,
  cover,
  onCoverChange,
  avatars = [],
  onAddMember,
  tabs = DEFAULT_TABS,
  selectedTab = "board",
  onTabChange,
  children,
  className,
}: ProjectHeaderProps) {
  return (
    <div className={cx("flex flex-col", className)}>
      {/* Title bar */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2">
        {/* Left side */}
        <div className="flex items-center gap-2.5">
          <ProjectCover value={cover} onChange={onCoverChange} size="sm" />

          <h1 className="font-display text-display-xs font-semibold text-primary">
            {name}
          </h1>

          <ButtonUtility
            icon={ChevronDown}
            size="xs"
            color="secondary"
            tooltip="Opciones del proyecto"
          />

          <ButtonUtility
            icon={Star01}
            size="xs"
            color="tertiary"
            tooltip="Marcar como favorito"
          />
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {avatars.length > 0 && (
            <AvatarGroup avatars={avatars} size="sm" max={3} />
          )}

          {onAddMember && (
            <button
              type="button"
              onClick={onAddMember}
              className="flex size-8 cursor-pointer items-center justify-center rounded-full border border-dashed border-primary bg-primary transition-colors hover:bg-primary_hover"
              aria-label="Agregar miembro"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-quaternary">
                <path d="M6 1v10M1 6h10" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key) => onTabChange?.(key as string)}
      >
        <TabList className="px-6">
          {tabs.map((tab) => (
            <Tab key={tab.id} id={tab.id}>
              {tab.icon && <tab.icon className="size-4" />}
              {tab.label}
            </Tab>
          ))}
        </TabList>

        {children && (
          <TabPanel id={selectedTab} className="p-0">
            {children}
          </TabPanel>
        )}
      </Tabs>
    </div>
  )
}
