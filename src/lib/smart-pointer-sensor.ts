'use client'

import { PointerSensor, type PointerSensorOptions } from '@dnd-kit/core'
import type { PointerEvent } from 'react'

/** PointerSensor that ignores drags starting inside contentEditable or input/textarea */
export class SmartPointerSensor extends PointerSensor {
  static activators = PointerSensor.activators.map((activator) => ({
    ...activator,
    eventName: activator.eventName,
    handler: ({ nativeEvent: event }: PointerEvent, options: PointerSensorOptions) => {
      const target = event.target as HTMLElement | null
      if (
        target?.isContentEditable ||
        target?.closest('[contenteditable]') ||
        target?.closest('input, textarea, select')
      ) {
        return false
      }
      return activator.handler({ nativeEvent: event } as PointerEvent, options)
    },
  }))
}
