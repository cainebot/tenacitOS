"use client";

// Phase 69 — Skills tab (Plan 69-02).
// Source: Figma node 17036:109733 (D · Skills · empty state).
// 2-col card: Files panel (266px, empty) + empty state with
// BackgroundPattern + FeaturedIcon (composed locally — @circos/ui
// FeaturedIcon lacks theme="modern").
//
// BLOCKING-2: consumes `AgentRow` (canonical).

import type { FC } from "react";
import { BackgroundPattern, Button, ButtonUtility } from "@circos/ui";
import { Plus, SearchLg } from "@untitledui/icons";
import type { AgentRow } from "@/types/supabase";

export const TabSkills: FC<{ agent: AgentRow; onAttach?: () => void }> = ({
  agent,
  onAttach,
}) => (
  <article className="flex min-h-[560px] w-full items-stretch overflow-hidden rounded-xl border border-secondary bg-secondary">
    {/* Files panel (empty) */}
    <aside className="flex w-[266px] shrink-0 flex-col gap-2 border-r border-primary bg-primary px-2 py-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-base font-semibold text-white [font-family:var(--font-display)]">
          Files
        </h3>
        <ButtonUtility
          size="xs"
          color="secondary"
          icon={Plus}
          tooltip="Add new skill"
          aria-label="Add new skill"
        />
      </div>
    </aside>

    {/* Empty state viewer */}
    <section className="relative flex min-w-0 flex-1 items-center justify-center overflow-hidden px-5 py-4">
      <BackgroundPattern
        pattern="circle"
        size="md"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-utility-gray-100"
      />
      <div className="relative z-10 flex w-[512px] max-w-full flex-col items-center gap-8">
        <div className="flex w-full flex-col items-center gap-5">
          {/* Featured icon · modern skeuomorphic pattern (composed locally — @circos/ui FeaturedIcon lacks theme="modern") */}
          <div className="flex size-12 items-center justify-center rounded-[10px] border border-primary bg-primary shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05),inset_0px_0px_0px_1px_rgba(12,14,18,0.18),inset_0px_-2px_0px_0px_rgba(12,14,18,0.05)]">
            <SearchLg className="size-6 text-fg-quaternary" aria-hidden />
          </div>
          <div className="flex max-w-sm flex-col items-center gap-2 text-center">
            <p className="text-lg font-semibold text-primary">No skills wired yet</p>
            <p className="text-sm text-tertiary">
              Skills are tools and capabilities you can grant to {agent.name}. None have been
              attached yet.
            </p>
          </div>
        </div>
        <Button color="primary" size="md" iconLeading={Plus} onClick={onAttach}>
          Add skills
        </Button>
      </div>
    </section>
  </article>
);
