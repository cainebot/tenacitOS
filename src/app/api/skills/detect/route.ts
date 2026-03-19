import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { detectInput } from '@/lib/input-detector'
import type { SkillDraft, TextIntent } from '@/types/supabase'

export const dynamic = 'force-dynamic'

// Lazy-init OpenAI client — not instantiated at module load to allow
// the route to return 400/413 errors before any API key check
let openaiClient: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiClient
}

// --- OpenAI prompt for text intent classification ---

const SYSTEM_PROMPT = `You are a skill intake assistant for OpenClaw, an AI agent platform.
A user has typed something in the "Add Skill" input field.
Your task: determine whether the user is describing a SPECIFIC SKILL they want to register,
or expressing a NEED / PROBLEM that should trigger a skill discovery search.

Respond ONLY with a JSON object:
{
  "intent": "skill_description" | "discovery_intent",
  "name": "<concise skill name if skill_description, else null>",
  "description": "<one-sentence description if skill_description, else null>",
  "icon": "<single relevant emoji if skill_description, else null>"
}

Rules:
- "skill_description": user describes a concrete skill as a thing that exists or should exist
  Examples: "skill para auditar PRs", "a skill that reviews code quality", "herramienta para analizar logs"
- "discovery_intent": user describes a need, problem, or vague capability search
  Examples: "necesito algo para encontrar skills de Supabase", "quiero buscar skills de testing", "find me a skill for code review"
- Respond ONLY with valid JSON. No markdown, no explanation.`

async function classifyTextIntent(text: string): Promise<{
  intent: TextIntent
  name?: string
  description?: string
  icon?: string
}> {
  const openai = getOpenAI()

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: text },
    ],
    max_tokens: 200,
    temperature: 0.2,
    response_format: { type: 'json_object' },
  })

  const raw = completion.choices[0]?.message?.content ?? '{}'

  let parsed: { intent?: string; name?: string; description?: string; icon?: string }
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Fallback: treat as skill_description if parse fails
    return { intent: 'skill_description' }
  }

  const intent: TextIntent =
    parsed.intent === 'discovery_intent' ? 'discovery_intent' : 'skill_description'

  return {
    intent,
    name: parsed.name ?? undefined,
    description: parsed.description ?? undefined,
    icon: parsed.icon ?? undefined,
  }
}

// --- Route handler ---

export async function POST(request: NextRequest) {
  let body: { input?: string; type?: string }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 })
  }

  const { input } = body

  if (!input || typeof input !== 'string' || input.trim() === '') {
    return NextResponse.json({ error: 'input is required' }, { status: 400 })
  }

  // Stage 1: Regex classification (synchronous, free)
  const draft = detectInput(input)

  // File size cap — reject before any further processing
  if (draft.size_error) {
    return NextResponse.json(
      { error: 'File exceeds the 500KB size limit. Please upload a smaller file.' },
      { status: 413 }
    )
  }

  // For non-text types, Stage 1 result is definitive — return immediately
  if (draft.type !== 'text') {
    return NextResponse.json(draft)
  }

  // Stage 2: LLM classification — only for text type
  if (!process.env.OPENAI_API_KEY) {
    // Graceful degradation: if key absent, return unclassified text draft
    const fallbackDraft: SkillDraft = {
      ...draft,
      confidence: 'LOW',
      // No intent — caller treats as unknown text
    }
    return NextResponse.json(fallbackDraft)
  }

  try {
    const { intent, name, description, icon } = await classifyTextIntent(input.trim())

    const enrichedDraft: SkillDraft = {
      ...draft,
      confidence: 'MEDIUM',
      intent,
      // Only populate fields for skill_description intent
      ...(intent === 'skill_description' && {
        name: name ?? undefined,
        description: description ?? undefined,
        icon: icon ?? undefined,
        origin: 'local',
      }),
    }

    return NextResponse.json(enrichedDraft)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json(
      { error: `LLM classification failed: ${message}` },
      { status: 502 }
    )
  }
}
