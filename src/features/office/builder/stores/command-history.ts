export interface PaintCommand {
  execute: () => void
  undo: () => void
}

export class CommandHistory {
  private past: PaintCommand[] = []
  private future: PaintCommand[] = []
  private maxSize = 100
  onChange: (() => void) | null = null  // Reactive callback for React subscribers

  /** Push a command that has NOT been executed yet. Calls execute() then stores. */
  push(cmd: PaintCommand) {
    cmd.execute()
    this.past.push(cmd)
    this.future = []  // clear redo stack on new action
    if (this.past.length > this.maxSize) this.past.shift()
    this.onChange?.()
  }

  /** Push a command that has ALREADY been executed (cells already painted).
   *  Use this for paint operations where cells are applied during pointer
   *  events and the command only needs to support undo/redo replay. */
  pushExecuted(cmd: PaintCommand) {
    this.past.push(cmd)
    this.future = []
    if (this.past.length > this.maxSize) this.past.shift()
    this.onChange?.()
  }

  undo(): boolean {
    const cmd = this.past.pop()
    if (!cmd) return false
    cmd.undo()
    this.future.push(cmd)
    this.onChange?.()
    return true
  }

  redo(): boolean {
    const cmd = this.future.pop()
    if (!cmd) return false
    cmd.execute()
    this.past.push(cmd)
    this.onChange?.()
    return true
  }

  get canUndo() { return this.past.length > 0 }
  get canRedo() { return this.future.length > 0 }

  clear() { this.past = []; this.future = []; this.onChange?.() }
}

export const commandHistory = new CommandHistory()
