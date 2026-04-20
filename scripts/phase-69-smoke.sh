#!/usr/bin/env bash
#
# Phase 69 close-out smoke script.
#
# Runs the static gates from Plan 69-08 (UUI discipline grep, fixtures-leak
# grep, Phase69* type-leak grep, XSS/unsafe-HTML grep, Realtime publication
# migration check, portrait license check, test suite, lint, build). HTTP
# probes (smoke steps 1–5 / 8 from the plan) require a live Next.js server
# and a populated Supabase project; they are documented in SUMMARY and
# intentionally out-of-scope for this static smoke.
#
# Exit 0 if every gate passes. Exit non-zero if any gate fails.
#
# Usage:
#   control-panel/scripts/phase-69-smoke.sh
#
# Each gate prints one line to stdout in the form:
#   [GATE-<n>] <label> — PASS
#   [GATE-<n>] <label> — FAIL (<why>)
# so the orchestrator (and CI) can grep for "FAIL" after the run.

set -u

# Locate workspace root (repo root). The script lives at
#   control-panel/scripts/phase-69-smoke.sh
# so the repo root is two directories up.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
CP_SRC="${REPO_ROOT}/control-panel/src"
MIGRATIONS="${REPO_ROOT}/supabase/migrations"
PORTRAITS_DIR="${REPO_ROOT}/control-panel/public/assets/characters"

FAILED=0
FAIL_REASONS=()

pass() {
  echo "[GATE-$1] $2 — PASS"
}

fail() {
  echo "[GATE-$1] $2 — FAIL ($3)"
  FAILED=1
  FAIL_REASONS+=("GATE-$1 $2: $3")
}

# Use grep -rE with explicit --include filters so we stay portable (no rg
# dependency). All scope directories are globbed for .ts/.tsx files.
scope_grep() {
  local pattern="$1"
  shift
  local targets=("$@")
  # Collect matches across all targets; tolerate missing paths.
  local out=""
  local t
  for t in "${targets[@]}"; do
    if [ -d "$t" ]; then
      local found
      found=$(grep -rnE --include='*.ts' --include='*.tsx' --include='*.js' --include='*.jsx' \
        "$pattern" "$t" 2>/dev/null || true)
      if [ -n "$found" ]; then
        out+="${found}"$'\n'
      fi
    elif [ -f "$t" ]; then
      local found
      found=$(grep -nE "$pattern" "$t" 2>/dev/null || true)
      if [ -n "$found" ]; then
        # Prefix with path like `grep -r` does.
        while IFS= read -r line; do
          out+="${t}:${line}"$'\n'
        done <<< "$found"
      fi
    fi
  done
  # Trim trailing newline.
  printf '%s' "${out%$'\n'}"
}

# Phase 69 scope (UUI discipline + leak checks).
SCOPE_DIRS=(
  "${CP_SRC}/app/(dashboard)/agents"
  "${CP_SRC}/app/(dashboard)/office"
  "${CP_SRC}/app/api/agents"
  "${CP_SRC}/app/api/agent-runs"
  "${CP_SRC}/app/api/nodes"
  "${CP_SRC}/components/application/agent-detail"
  "${CP_SRC}/components/application/agents-table"
  "${CP_SRC}/components/application/agent-form"
  "${CP_SRC}/components/application/node-status-strip"
  "${CP_SRC}/components/application/run-log-stream"
  "${CP_SRC}/components/approvals"
)
SCOPE_FILES=(
  "${CP_SRC}/hooks/useAgentPresence.ts"
  "${CP_SRC}/hooks/useInstructionFiles.ts"
  "${CP_SRC}/hooks/useAgentActions.ts"
  "${CP_SRC}/hooks/useRealtimeRuns.ts"
  "${CP_SRC}/lib/csrf.ts"
  "${CP_SRC}/lib/uuid.ts"
  "${CP_SRC}/lib/run-status.ts"
  "${CP_SRC}/lib/icon-whitelist.ts"
  "${CP_SRC}/lib/agent-validators.ts"
  "${CP_SRC}/lib/agent-display.ts"
)

SCOPE=()
for p in "${SCOPE_DIRS[@]}" "${SCOPE_FILES[@]}"; do
  if [ -e "$p" ]; then
    SCOPE+=("$p")
  fi
done
if [ ${#SCOPE[@]} -eq 0 ]; then
  echo "[phase-69-smoke] FATAL — no Phase 69 scope paths found; aborting."
  exit 2
fi

# ────────────────────────────────────────────────────────────────────────────
# GATE 1 — Forbidden lucide-react imports.
# ────────────────────────────────────────────────────────────────────────────
HITS="$(scope_grep 'from "lucide-react"' "${SCOPE[@]}")"
if [ -z "${HITS}" ]; then
  pass 1 "no lucide-react imports in Phase 69 scope"
else
  fail 1 "no lucide-react imports in Phase 69 scope" "$(echo "${HITS}" | wc -l | tr -d ' ') hit(s)"
  echo "${HITS}"
fi

# ────────────────────────────────────────────────────────────────────────────
# GATE 2 — Forbidden @/components/ui/* imports.
# ────────────────────────────────────────────────────────────────────────────
HITS="$(scope_grep 'from "@/components/ui/' "${SCOPE[@]}")"
if [ -z "${HITS}" ]; then
  pass 2 "no @/components/ui/* imports in Phase 69 scope"
else
  fail 2 "no @/components/ui/* imports in Phase 69 scope" "$(echo "${HITS}" | wc -l | tr -d ' ') hit(s)"
  echo "${HITS}"
fi

# ────────────────────────────────────────────────────────────────────────────
# GATE 3 — Forbidden cn()/clsx()/classnames().
# ────────────────────────────────────────────────────────────────────────────
HITS="$(scope_grep '\b(cn|clsx|classnames)\(' "${SCOPE[@]}")"
if [ -z "${HITS}" ]; then
  pass 3 "no cn()/clsx()/classnames() calls in Phase 69 scope"
else
  fail 3 "no cn()/clsx()/classnames() in Phase 69 scope" "$(echo "${HITS}" | wc -l | tr -d ' ') hit(s)"
  echo "${HITS}"
fi

# ────────────────────────────────────────────────────────────────────────────
# GATE 4 — Forbidden unsafe-HTML APIs. Match literal usage, not comments.
# Strategy: grep for token, then filter out lines whose first non-whitespace
# characters after the line-number prefix are `//` or `*`.
# ────────────────────────────────────────────────────────────────────────────
RAW_HITS="$(scope_grep 'dangerouslySetInnerHTML[[:space:]]*=|rehype-raw|allowDangerousHtml|[[:space:]]eval\(|new Function\(' "${SCOPE[@]}")"
# Filter comments (//, *) — awk uses the colon-delimited format `path:line:content`.
UNSAFE_HITS=""
if [ -n "${RAW_HITS}" ]; then
  while IFS= read -r row; do
    [ -z "$row" ] && continue
    # Extract content after `path:line:` — may contain additional colons.
    content="${row#*:*:}"
    # Strip leading whitespace.
    trimmed="${content#"${content%%[![:space:]]*}"}"
    case "$trimmed" in
      //*) continue ;;
      \**) continue ;;
    esac
    UNSAFE_HITS+="${row}"$'\n'
  done <<< "${RAW_HITS}"
  UNSAFE_HITS="${UNSAFE_HITS%$'\n'}"
fi
if [ -z "${UNSAFE_HITS}" ]; then
  pass 4 "no unsafe-HTML APIs (dangerouslySetInnerHTML=/rehype-raw/eval/new Function) in Phase 69 scope"
else
  fail 4 "unsafe-HTML APIs present in Phase 69 scope" "$(echo "${UNSAFE_HITS}" | wc -l | tr -d ' ') hit(s)"
  echo "${UNSAFE_HITS}"
fi

# ────────────────────────────────────────────────────────────────────────────
# GATE 5 — Fixtures-leak grep (phase-69-fixtures only allowed in fixtures/tests/stories).
# ────────────────────────────────────────────────────────────────────────────
RAW_HITS="$(scope_grep 'phase-69-fixtures' "${CP_SRC}/app" "${CP_SRC}/components/application" "${CP_SRC}/hooks")"
FIX_HITS=""
if [ -n "${RAW_HITS}" ]; then
  while IFS= read -r row; do
    [ -z "$row" ] && continue
    case "$row" in
      */__fixtures__/*|*/__tests__/*|*.stories.ts|*.stories.tsx|*.stories.js|*.stories.jsx) continue ;;
    esac
    # Also allow comment lines (they document the invariant, not import it).
    content="${row#*:*:}"
    trimmed="${content#"${content%%[![:space:]]*}"}"
    case "$trimmed" in
      //*) continue ;;
      \**) continue ;;
    esac
    FIX_HITS+="${row}"$'\n'
  done <<< "${RAW_HITS}"
  FIX_HITS="${FIX_HITS%$'\n'}"
fi
if [ -z "${FIX_HITS}" ]; then
  pass 5 "no phase-69-fixtures imports in production code"
else
  fail 5 "phase-69-fixtures leaked into production code" "$(echo "${FIX_HITS}" | wc -l | tr -d ' ') hit(s)"
  echo "${FIX_HITS}"
fi

# ────────────────────────────────────────────────────────────────────────────
# GATE 6 — Phase69* type-leak grep.
# ────────────────────────────────────────────────────────────────────────────
RAW_HITS="$(scope_grep 'Phase69Agent|Phase69Node|Phase69Run' "${CP_SRC}")"
TYPE_HITS=""
if [ -n "${RAW_HITS}" ]; then
  while IFS= read -r row; do
    [ -z "$row" ] && continue
    case "$row" in
      */__fixtures__/*|*/__tests__/*|*.stories.ts|*.stories.tsx|*.stories.js|*.stories.jsx) continue ;;
    esac
    TYPE_HITS+="${row}"$'\n'
  done <<< "${RAW_HITS}"
  TYPE_HITS="${TYPE_HITS%$'\n'}"
fi
if [ -z "${TYPE_HITS}" ]; then
  pass 6 "no Phase69Agent/Phase69Node/Phase69Run leaks outside test files"
else
  fail 6 "Phase69* view-model types leaked" "$(echo "${TYPE_HITS}" | wc -l | tr -d ' ') hit(s)"
  echo "${TYPE_HITS}"
fi

# ────────────────────────────────────────────────────────────────────────────
# GATE 7 — Realtime publication check (migration 039).
# ────────────────────────────────────────────────────────────────────────────
MIG_039="${MIGRATIONS}/20260420_039_cli_connect_phase69_instructions_schema.sql"
if [ ! -f "${MIG_039}" ]; then
  fail 7 "migration 039 exists" "file not found: ${MIG_039}"
else
  MIG_INSTR="$(grep -nE 'ALTER PUBLICATION supabase_realtime ADD TABLE agent_instructions' "${MIG_039}" || true)"
  MIG_IDENT="$(grep -nE 'ALTER PUBLICATION supabase_realtime ADD TABLE agent_identity_files' "${MIG_039}" || true)"
  if [ -n "${MIG_INSTR}" ] && [ -n "${MIG_IDENT}" ]; then
    pass 7 "migration 039 adds agent_instructions + agent_identity_files to supabase_realtime"
  else
    fail 7 "migration 039 Realtime publication check" "missing ALTER PUBLICATION statements"
  fi
fi

# ────────────────────────────────────────────────────────────────────────────
# GATE 8 — Portrait license trail.
# ────────────────────────────────────────────────────────────────────────────
if [ -d "${PORTRAITS_DIR}" ]; then
  PNG_COUNT="$(find "${PORTRAITS_DIR}" -maxdepth 1 -name '*.png' | wc -l | tr -d ' ')"
  if [ "${PNG_COUNT}" = "0" ]; then
    pass 8 "portrait license trail (no PNGs present; initials-only Avatar fallback)"
  else
    if [ -f "${PORTRAITS_DIR}/LICENSE.md" ]; then
      LIC_LINES="$(wc -l < "${PORTRAITS_DIR}/LICENSE.md" | tr -d ' ')"
      if [ "${LIC_LINES}" -ge 7 ]; then
        pass 8 "portrait license trail present (${PNG_COUNT} PNGs, LICENSE.md ${LIC_LINES} lines)"
      else
        fail 8 "portrait license trail" "LICENSE.md is only ${LIC_LINES} lines (min 7 required)"
      fi
    else
      fail 8 "portrait license trail" "${PNG_COUNT} PNG(s) committed without LICENSE.md"
    fi
  fi
else
  pass 8 "portrait license trail (directory absent)"
fi

# ────────────────────────────────────────────────────────────────────────────
# GATE 9 — Kebab-case file names.
# ────────────────────────────────────────────────────────────────────────────
KEBAB_VIOLATIONS=""
for p in "${SCOPE[@]}"; do
  if [ -d "$p" ]; then
    while IFS= read -r f; do
      base="$(basename "$f")"
      # Allow the approval-payload-<enum>.tsx family (underscores permitted).
      if [[ "${base}" == approval-payload-* ]]; then
        continue
      fi
      # Allow TypeScript declaration files.
      if [[ "${base}" == *.d.ts ]]; then
        continue
      fi
      if ! [[ "${base}" =~ ^[a-z0-9][a-z0-9.-]*\.[tj]sx?$ ]]; then
        KEBAB_VIOLATIONS+="${f}"$'\n'
      fi
    done < <(find "$p" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \))
  fi
done
if [ -z "${KEBAB_VIOLATIONS}" ]; then
  pass 9 "kebab-case file names (approval-payload-* family allowed)"
else
  VC="$(printf '%s' "${KEBAB_VIOLATIONS}" | grep -c '.')"
  fail 9 "kebab-case file names" "${VC} violation(s)"
  printf '%s' "${KEBAB_VIOLATIONS}"
fi

# ────────────────────────────────────────────────────────────────────────────
# GATE 10 — vitest.
# ────────────────────────────────────────────────────────────────────────────
echo ""
echo "[GATE-10] running vitest (control-panel workspace)…"
(
  cd "${REPO_ROOT}" && npm test --workspace=control-panel --silent
) >/tmp/phase-69-smoke-test.log 2>&1
TEST_EXIT=$?
if [ ${TEST_EXIT} -eq 0 ]; then
  pass 10 "vitest suite green"
else
  TEST_TAIL="$(tail -n 6 /tmp/phase-69-smoke-test.log | tr '\n' ' ' | cut -c 1-240)"
  fail 10 "vitest suite" "exit ${TEST_EXIT}; see /tmp/phase-69-smoke-test.log"
fi

# ────────────────────────────────────────────────────────────────────────────
# GATE 11 — eslint.
# ────────────────────────────────────────────────────────────────────────────
echo ""
echo "[GATE-11] running eslint (control-panel workspace)…"
(
  cd "${REPO_ROOT}/control-panel" && npm run lint --silent
) >/tmp/phase-69-smoke-lint.log 2>&1
LINT_EXIT=$?
if [ ${LINT_EXIT} -eq 0 ]; then
  pass 11 "eslint clean"
else
  fail 11 "eslint" "exit ${LINT_EXIT}; see /tmp/phase-69-smoke-lint.log"
fi

# ────────────────────────────────────────────────────────────────────────────
# GATE 12 — next build.
# ────────────────────────────────────────────────────────────────────────────
echo ""
echo "[GATE-12] running next build (control-panel workspace)…"
(
  cd "${REPO_ROOT}/control-panel" && npm run build --silent
) >/tmp/phase-69-smoke-build.log 2>&1
BUILD_EXIT=$?
if [ ${BUILD_EXIT} -eq 0 ]; then
  pass 12 "next build clean"
else
  fail 12 "next build" "exit ${BUILD_EXIT}; see /tmp/phase-69-smoke-build.log"
fi

# ────────────────────────────────────────────────────────────────────────────
# Summary
# ────────────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════════════════"
if [ ${FAILED} -eq 0 ]; then
  echo "✅ Phase 69 smoke — ALL GATES PASS"
  exit 0
else
  echo "❌ Phase 69 smoke — ${#FAIL_REASONS[@]} GATE(S) FAILED"
  for r in "${FAIL_REASONS[@]}"; do
    echo "  - $r"
  done
  exit 1
fi
