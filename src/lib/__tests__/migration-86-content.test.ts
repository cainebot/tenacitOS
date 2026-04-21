import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'

// ---------------------------------------------------------------------------
// Resolve absolute paths to SQL migration files.
// __dirname = control-panel/src/lib/__tests__
// Root      = ../../../../  (4 levels up to repo root)
// ---------------------------------------------------------------------------

const SQL_DIR = path.resolve(__dirname, '../../../../infrastructure/sql')

function readSql(filename: string): string {
  return fs.readFileSync(path.join(SQL_DIR, filename), 'utf-8')
}

// ---------------------------------------------------------------------------
// Gap 2: Migration 18 — activity_log
// Requirements: ACTV-01, SCHM-03
// ---------------------------------------------------------------------------

describe('migration 18-activity-log.sql', () => {
  let sql: string

  it('file exists and is readable', () => {
    expect(() => { sql = readSql('18-activity-log.sql') }).not.toThrow()
    expect(sql.length).toBeGreaterThan(0)
  })

  it('defines CREATE TABLE activity_log', () => {
    sql = readSql('18-activity-log.sql')
    expect(sql).toContain('CREATE TABLE activity_log')
  })

  it('has CHECK constraint on actor_type for allowed values', () => {
    sql = readSql('18-activity-log.sql')
    expect(sql).toMatch(/CHECK\s*\(\s*actor_type\s+IN\s*\(/)
    expect(sql).toContain("'human'")
    expect(sql).toContain("'agent'")
    expect(sql).toContain("'system'")
  })

  it('sets REPLICA IDENTITY FULL before adding to publication', () => {
    sql = readSql('18-activity-log.sql')
    const replicaPos = sql.indexOf('REPLICA IDENTITY FULL')
    const publicationPos = sql.indexOf('ALTER PUBLICATION supabase_realtime ADD TABLE activity_log')
    expect(replicaPos).toBeGreaterThan(-1)
    expect(publicationPos).toBeGreaterThan(-1)
    expect(replicaPos).toBeLessThan(publicationPos)
  })

  it('contains INSERT INTO activity_log for data migration from card_activity', () => {
    sql = readSql('18-activity-log.sql')
    expect(sql).toContain('INSERT INTO activity_log')
    expect(sql).toContain('FROM card_activity')
  })

  it('contains CREATE OR REPLACE FUNCTION move_card redirecting to activity_log', () => {
    sql = readSql('18-activity-log.sql')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION move_card')
  })

  it('contains CREATE OR REPLACE FUNCTION sync_task_to_card redirecting to activity_log', () => {
    sql = readSql('18-activity-log.sql')
    expect(sql).toContain('CREATE OR REPLACE FUNCTION sync_task_to_card')
  })

  it('contains DROP TABLE IF EXISTS card_activity CASCADE', () => {
    sql = readSql('18-activity-log.sql')
    expect(sql).toContain('DROP TABLE IF EXISTS card_activity CASCADE')
  })

  it('DROP TABLE appears AFTER data migration and trigger redirect sections', () => {
    sql = readSql('18-activity-log.sql')
    const insertPos = sql.indexOf('INSERT INTO activity_log')
    const replaceFuncPos = sql.indexOf('CREATE OR REPLACE FUNCTION move_card')
    const dropPos = sql.indexOf('DROP TABLE IF EXISTS card_activity CASCADE')

    expect(insertPos).toBeGreaterThan(-1)
    expect(replaceFuncPos).toBeGreaterThan(-1)
    expect(dropPos).toBeGreaterThan(-1)

    // DROP must come after both the data migration INSERT and the trigger redirects
    expect(dropPos).toBeGreaterThan(insertPos)
    expect(dropPos).toBeGreaterThan(replaceFuncPos)
  })
})

// ---------------------------------------------------------------------------
// Gap 2: Migration 19 — project_lead_agent_id column rename
// Requirements: SCHM-01
// ---------------------------------------------------------------------------

describe('migration 19-project-lead-rename.sql', () => {
  let sql: string

  it('file exists and is readable', () => {
    expect(() => { sql = readSql('19-project-lead-rename.sql') }).not.toThrow()
    expect(sql.length).toBeGreaterThan(0)
  })

  it('references project_lead_agent_id on the boards table', () => {
    sql = readSql('19-project-lead-rename.sql')
    expect(sql).toContain('project_lead_agent_id')
    expect(sql).toContain('boards')
  })

  it('does not retain scrum_master_agent_id (old name) as a new column definition', () => {
    // The migration may mention scrum_master_agent_id in a comment explaining the old name
    // but must NOT add/create it as a column
    sql = readSql('19-project-lead-rename.sql')
    // Any ADD COLUMN or CREATE references must be for project_lead_agent_id, not scrum_master_agent_id
    const addColumnMatches = sql.match(/ADD\s+COLUMN[^;]+scrum_master_agent_id/gi)
    expect(addColumnMatches).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Gap 2: Migration 20 — projects and project_states schema formalization
// Requirements: SCHM-02
// ---------------------------------------------------------------------------

describe('migration 20-projects-schema.sql', () => {
  let sql: string

  it('file exists and is readable', () => {
    expect(() => { sql = readSql('20-projects-schema.sql') }).not.toThrow()
    expect(sql.length).toBeGreaterThan(0)
  })

  it('contains CREATE TABLE IF NOT EXISTS projects', () => {
    sql = readSql('20-projects-schema.sql')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS projects')
  })

  it('contains CREATE TABLE IF NOT EXISTS project_states', () => {
    sql = readSql('20-projects-schema.sql')
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS project_states')
  })

  it('projects table definition includes all required ProjectRow columns', () => {
    sql = readSql('20-projects-schema.sql')
    // Extract the projects CREATE TABLE block
    const projectsBlock = sql.slice(
      sql.indexOf('CREATE TABLE IF NOT EXISTS projects'),
      sql.indexOf('CREATE TABLE IF NOT EXISTS project_states'),
    )
    expect(projectsBlock).toContain('project_id')
    expect(projectsBlock).toContain('name')
    expect(projectsBlock).toContain('slug')
    expect(projectsBlock).toContain('description')
    expect(projectsBlock).toContain('cover_color')
    expect(projectsBlock).toContain('cover_icon')
    expect(projectsBlock).toContain('members')
    expect(projectsBlock).toContain('is_favorite')
    expect(projectsBlock).toContain('created_at')
    expect(projectsBlock).toContain('updated_at')
  })

  it('project_states table definition includes all required ProjectStateRow columns', () => {
    sql = readSql('20-projects-schema.sql')
    // Extract the project_states CREATE TABLE block
    const statesBlockStart = sql.indexOf('CREATE TABLE IF NOT EXISTS project_states')
    const statesBlock = sql.slice(statesBlockStart, statesBlockStart + 600)
    expect(statesBlock).toContain('state_id')
    expect(statesBlock).toContain('project_id')
    expect(statesBlock).toContain('name')
    expect(statesBlock).toContain('category')
    expect(statesBlock).toContain('color')
    expect(statesBlock).toContain('position')
    expect(statesBlock).toContain('created_at')
  })

  it('project_states has CHECK constraint on category with correct values', () => {
    sql = readSql('20-projects-schema.sql')
    expect(sql).toContain("'to-do'")
    expect(sql).toContain("'in_progress'")
    expect(sql).toContain("'done'")
  })
})
