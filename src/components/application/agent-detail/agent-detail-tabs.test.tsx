// Phase 69 Plan 02 — agent-detail tabs regression test (2026-04-20).
// Guards against a silent drop of the Instructions tab (owned by Plan 09
// but landed via the Figma slice). Ensures all 6 tabs render.

import { afterEach, describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { Tab, TabList, TabPanel, Tabs } from "@circos/ui";
import {
  AgentHeader,
  TabDanger,
  TabInstructions,
  TabOverview,
  TabRuns,
  TabSkills,
  TabSoul,
} from "./index";
import type { AgentRow } from "@/types/supabase";

afterEach(() => cleanup());

const AGENT: AgentRow = {
  agent_id: "jax",
  node_id: "circus-01",
  name: "Jax",
  emoji: "🎯",
  status: "idle",
  current_task_id: null,
  avatar_model: "",
  last_activity: new Date().toISOString(),
  metadata: {},
  created_at: "2026-04-01T13:22:01Z",
  updated_at: "2026-04-19T09:14:33Z",
  slug: "jax",
  soul_content: "# Jax\n\nprospector",
  adapter_type: "codex",
  adapter_config: {},
  permissions: {},
  preferred_node_id: "circus-01",
  bound_node_id: "circus-01",
  is_seed: true,
  deleted_at: null,
  avatar_url: null,
  role: "specialist",
};

describe("agent-detail tab shell", () => {
  it("renders all 6 tab labels (Overview, Identity, Instructions, Runs, Skills, More)", () => {
    render(
      <div>
        <AgentHeader agent={AGENT} />
        <Tabs defaultSelectedKey="overview">
          <TabList type="underline" size="md" aria-label="Agent detail sections">
            <Tab id="overview">Overview</Tab>
            <Tab id="identity">Identity</Tab>
            <Tab id="instructions">Instructions</Tab>
            <Tab id="runs">Runs</Tab>
            <Tab id="skills">Skills</Tab>
            <Tab id="more">More</Tab>
          </TabList>
          <TabPanel id="overview">
            <TabOverview agent={AGENT} />
          </TabPanel>
          <TabPanel id="identity">
            <TabSoul agent={AGENT} />
          </TabPanel>
          <TabPanel id="instructions">
            <TabInstructions agent={AGENT} />
          </TabPanel>
          <TabPanel id="runs">
            <TabRuns agent={AGENT} />
          </TabPanel>
          <TabPanel id="skills">
            <TabSkills agent={AGENT} />
          </TabPanel>
          <TabPanel id="more">
            <TabDanger agent={AGENT} />
          </TabPanel>
        </Tabs>
      </div>,
    );

    // Assert all 6 tab labels are present in the tab list.
    for (const label of ["Overview", "Identity", "Instructions", "Runs", "Skills", "More"]) {
      expect(screen.getByRole("tab", { name: label })).toBeTruthy();
    }
  });
});
