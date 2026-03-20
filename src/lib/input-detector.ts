import type { SkillDraft, InputType, DetectionConfidence, TextIntent } from '@/types/supabase';

// Re-export for consumers
export type { SkillDraft, InputType, DetectionConfidence, TextIntent };

// --- Constants ---

const FILE_SIZE_CAP_BYTES = 500 * 1024; // 500KB

// --- Regex patterns ---

/**
 * GitHub repo URL: must be https://github.com/{owner}/{repo}
 * Rejects: gist.github.com, raw.githubusercontent.com, http://, github.com/owner only
 */
const GITHUB_URL_RE = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(\/.*)?$/;

/**
 * npx skills add command: npx skills add {owner}/{skill-name}
 * Also matches: `skills add`, `npx @openclaw/skills add`, etc.
 */
const NPX_COMMAND_RE = /^(npx\s+)?(@openclaw\/)?skills\s+add\s+[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/i;

/**
 * File input marker: caller passes file content prefixed with "__file__:{size}:{filename}\n{content}"
 * The detect route and modal will use this prefix convention.
 */
const FILE_PREFIX_RE = /^__file__:(\d+):([^\n]+)\n([\s\S]*)$/;

// --- Helpers ---

function parseFrontmatterField(content: string, field: string): string | undefined {
  const match = content.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : undefined;
}

function extractFileMetadata(raw: string): {
  sizeBytes: number;
  filename: string;
  content: string;
} | null {
  const match = raw.match(FILE_PREFIX_RE);
  if (!match) return null;
  return {
    sizeBytes: parseInt(match[1], 10),
    filename: match[2],
    content: match[3],
  };
}

// --- Core detection function ---

/**
 * detectInput — synchronous, pure, no network calls.
 *
 * Input format conventions:
 *   - Plain URL/command/text: pass as-is
 *   - File content: prefix with "__file__:{sizeInBytes}:{filename}\n{content}"
 *
 * Returns a partial SkillDraft with type, confidence, and any extractable fields.
 * Fields that require network (name from GitHub, description from LLM) are left undefined.
 */
export function detectInput(raw: string): SkillDraft {
  const trimmed = raw.trim();

  // --- File detection (must come before URL/command checks) ---
  const fileMeta = extractFileMetadata(raw);
  if (fileMeta) {
    if (fileMeta.sizeBytes > FILE_SIZE_CAP_BYTES) {
      return {
        type: 'file',
        confidence: 'HIGH',
        raw_input: raw,
        size_error: true,
      };
    }

    // Parse frontmatter from .md/.skill content
    const frontMatterMatch = fileMeta.content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
    let name: string | undefined;
    let description: string | undefined;
    let icon: string | undefined;

    if (frontMatterMatch) {
      const yaml = frontMatterMatch[1];
      name = parseFrontmatterField(yaml, 'name');
      description = parseFrontmatterField(yaml, 'description');
      icon = parseFrontmatterField(yaml, 'icon') ?? parseFrontmatterField(yaml, 'emoji');
    }

    return {
      type: 'file',
      confidence: 'HIGH',
      name,
      description,
      icon,
      origin: 'local',
      content: fileMeta.content,
      raw_input: raw,
    };
  }

  // --- GitHub URL detection ---
  if (GITHUB_URL_RE.test(trimmed)) {
    // Extract owner/repo for source_url normalization
    const urlMatch = trimmed.match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/);
    const repoPath = urlMatch ? urlMatch[1] : undefined;
    const source_url = repoPath ? `https://github.com/${repoPath}` : trimmed;

    return {
      type: 'github_url',
      confidence: 'HIGH',
      origin: 'github',
      source_url,
      raw_input: raw,
    };
  }

  // --- npx command detection ---
  if (NPX_COMMAND_RE.test(trimmed)) {
    // Extract owner/skill-name from the command
    const cmdMatch = trimmed.match(/add\s+([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)/i);
    const repoPath = cmdMatch ? cmdMatch[1] : undefined;

    return {
      type: 'command',
      confidence: 'HIGH',
      origin: 'skills_sh',
      source_url: repoPath ? `https://github.com/${repoPath}` : undefined,
      raw_input: raw,
    };
  }

  // --- Text (natural language) — intent determined by LLM in Phase 43/detect route ---
  if (trimmed.length > 0) {
    return {
      type: 'text',
      confidence: 'LOW',   // promoted to MEDIUM after LLM confirms
      raw_input: raw,
    };
  }

  // --- Unknown / empty ---
  return {
    type: 'unknown',
    confidence: 'LOW',
    raw_input: raw,
  };
}
