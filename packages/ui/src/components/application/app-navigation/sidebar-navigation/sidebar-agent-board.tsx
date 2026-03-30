"use client"

import type { ReactNode } from "react"
import { motion } from "motion/react"

// ─── AgentBoardPanel ────────────────────────────────────────────────
// Animated secondary panel (268px) for agent content.
// Self-positions fixed at left: 68px (right of the slim sidebar).
// Wrap with AnimatePresence at the parent level for enter+exit animations.

const SLIM_WIDTH = 68
const PANEL_WIDTH = 268

export interface AgentBoardPanelProps {
  children: ReactNode
}

export const AgentBoardPanel = ({ children }: AgentBoardPanelProps) => {
  return (
    <motion.div
      key="agent-board-panel"
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: PANEL_WIDTH, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 200, bounce: 0 }}
      style={{ left: SLIM_WIDTH }}
      className="fixed inset-y-0 z-50 hidden overflow-x-hidden overflow-y-auto bg-primary border-r border-secondary lg:block"
    >
      <div style={{ width: PANEL_WIDTH }} className="h-full">
        {children}
      </div>
    </motion.div>
  )
}
