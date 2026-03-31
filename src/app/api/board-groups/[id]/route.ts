import { NextRequest, NextResponse } from 'next/server'
import { getProject, updateProject, deleteProject } from '@/lib/projects'
import { getBoards, updateBoard } from '@/lib/boards'

function err(status: number, message: string) {
  return NextResponse.json({ message }, { status })
}

// GET /api/board-groups/[id] — get group + its boards
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const [project, boards] = await Promise.all([getProject(id), getBoards(id)])
    return NextResponse.json({ ...project, boards })
  } catch (e) {
    const error = e as Error & { code?: string }
    return err(error.code === 'PGRST116' ? 404 : 500, error.message)
  }
}

// PATCH /api/board-groups/[id] — update group name/description + optional board assignments
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return err(400, 'Invalid JSON body')
  }

  const { name, description, board_ids } = body as {
    name?: string
    description?: string
    board_ids?: string[]
  }

  try {
    const updated = await updateProject(id, {
      ...(name ? { name: name.trim() } : {}),
      ...(description !== undefined ? { description: description.trim() || undefined } : {}),
    })

    // Reassign boards if board_ids provided
    if (Array.isArray(board_ids)) {
      // Get current boards in this group
      const currentBoards = await getBoards(id)
      const currentIds = new Set(currentBoards.map(b => b.board_id))
      const desiredIds = new Set(board_ids)

      const toAdd = board_ids.filter(bid => !currentIds.has(bid))
      const toRemove = currentBoards.filter(b => !desiredIds.has(b.board_id)).map(b => b.board_id)

      // Get all boards to find a fallback workflow for removed ones
      const allBoards = await getBoards()
      const firstOtherProject = allBoards.find(b => b.project_id !== id)

      await Promise.all([
        ...toAdd.map(bid => updateBoard(bid, { project_id: id })),
        ...toRemove.map(bid =>
          updateBoard(bid, { project_id: firstOtherProject?.project_id ?? id })
        ),
      ])
    }

    return NextResponse.json(updated)
  } catch (e) {
    const error = e as Error
    return err(500, error.message)
  }
}

// DELETE /api/board-groups/[id] — delete group
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await deleteProject(id)
    return new NextResponse(null, { status: 204 })
  } catch (e) {
    const error = e as Error
    return err(500, error.message)
  }
}
