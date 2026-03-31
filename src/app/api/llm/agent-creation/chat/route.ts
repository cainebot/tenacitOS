import { streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { NextRequest, NextResponse } from 'next/server'
import { getOpenAIToken } from '@/lib/openai-token'
import type { LLMMessage } from '@/types/agents'

export const dynamic = 'force-dynamic'

/**
 * System prompt for agent identity creation assistant.
 * Guides the user through creating 7 identity documents for a new CircOS agent.
 * Uses <!-- DOC:FILENAME --> markers for LLM-generated identity file extraction.
 */
const AGENT_CREATION_SYSTEM_PROMPT = `You are an agent identity creation assistant for CircOS, a distributed AI agent sales office.

Your job is to help the user create a new agent by gathering information through conversation and generating 7 identity documents:

1. SOUL.md — Core identity, personality, communication style, values
2. AGENTS.md — Agent capabilities, specializations, team interactions
3. USER.md — User-facing description, how the agent presents itself
4. IDENTITY.md — Technical identity: role, department, model config
5. TOOLS.md — Available tools, permissions, integrations
6. HEARTBEAT.md — Health check configuration, active hours, monitoring
7. MEMORY.md — Initial memory seeds, knowledge base bootstrapping

Guidelines:
- Ask focused questions one at a time to gather the information needed
- Be conversational and helpful, not like a form
- After gathering enough context for a document, generate it
- Wrap each generated document in markers: <!-- DOC:FILENAME --> content <!-- /DOC:FILENAME -->
  Example: <!-- DOC:SOUL.md --> ... content ... <!-- /DOC:SOUL.md -->
- Generate documents progressively as conversation provides enough context
- You may generate multiple documents at once if the conversation provides enough information
- Keep documents concise but complete — they are operational configs, not essays
- The agent's character (name, emoji) is already selected before this conversation starts`

export async function POST(request: NextRequest) {
  // 1. Parse request body
  let body: { messages?: LLMMessage[]; system?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { messages = [], system } = body

  // 2. Get OpenAI token (env var or httpOnly cookie)
  const apiToken = await getOpenAIToken(request)
  if (!apiToken) {
    return NextResponse.json(
      { error: 'No OpenAI token configured. Set OPENAI_API_KEY or authenticate via OAuth.' },
      { status: 401 }
    )
  }

  // 3. Create OpenAI provider with optional base URL override (Codex proxy)
  const provider = createOpenAI({
    apiKey: apiToken,
    ...(process.env.OPENAI_BASE_URL && { baseURL: process.env.OPENAI_BASE_URL }),
  })

  // 4. Map LLMMessage[] → ModelMessage[] format
  // LLMMessage has extra fields (id, createdAt, data) that are NOT in ModelMessage.
  // Filter to user/assistant only (system messages handled via the system param).
  const modelMessages = messages
    .filter((m): m is LLMMessage & { role: 'user' | 'assistant' } =>
      m.role === 'user' || m.role === 'assistant'
    )
    .map((m) => ({ role: m.role, content: m.content }))

  // 5. Stream via AI SDK v6
  const result = streamText({
    model: provider(process.env.OPENAI_MODEL ?? 'gpt-4o-mini'),
    system: system ?? AGENT_CREATION_SYSTEM_PROMPT,
    messages: modelMessages,
    abortSignal: request.signal, // Client disconnect cancels the LLM call
  })

  // 6. Return as text/plain stream — CRITICAL: toTextStreamResponse(), NOT toDataStreamResponse()
  // The useLLMChat hook reads response.body as raw ReadableStream bytes via TextDecoder.
  // It does NOT parse SSE "data:" lines. Using toDataStreamResponse() would cause the hook
  // to accumulate literal "data:" prefix strings into streamingContent.
  return result.toTextStreamResponse()
}
