// Backward-compatible re-exports — canonical types now live in project.ts
// TODO: Remove this file once all consumers migrate to @/types/project
export * from './project'
export type { ProjectRow as WorkflowRow } from './project'
export type { ProjectWithStates as WorkflowWithStates } from './project'
export type { ProjectStateRow as WorkflowStateRow } from './project'
