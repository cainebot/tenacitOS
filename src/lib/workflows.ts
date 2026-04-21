// Backward-compatible re-exports — canonical lib now lives in projects.ts
// TODO: Remove this file once all consumers migrate to @/lib/projects
export {
  getProjects as getWorkflows,
  getProject as getWorkflow,
  getProjectStates as getWorkflowStates,
  createProject as createWorkflow,
  updateProject as updateWorkflow,
  deleteProject as deleteWorkflow,
  createState,
  updateState,
  deleteState,
} from './projects'
