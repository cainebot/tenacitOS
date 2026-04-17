/**
 * Tests para MessageBubbleSkeleton (Phase 91.2-02).
 *
 * NOTA: React Testing Library NO está instalada en este workspace (Rule 3 deviation).
 * Usamos `react-dom/server` renderToStaticMarkup para inspeccionar el HTML generado
 * — suficiente para verificar clases, layout structure y ausencia de `animate-pulse`
 * directo en el componente compuesto.
 */

import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MessageBubbleSkeleton } from '../message-bubble-skeleton'

describe('MessageBubbleSkeleton', () => {
  it('variant="text-short" renderiza Skeleton con altura aproximada de 1 línea (h-5)', () => {
    const html = renderToStaticMarkup(<MessageBubbleSkeleton variant="text-short" />)
    expect(html).toContain('h-5')
  })

  it('variant="text-long" renderiza 3 líneas de Skeleton', () => {
    const html = renderToStaticMarkup(<MessageBubbleSkeleton variant="text-long" />)
    // 3 líneas text-long + avatar circle + name text = 5 skeletons; al menos 3 con h-4
    const h4Count = (html.match(/h-4/g) ?? []).length
    expect(h4Count).toBeGreaterThanOrEqual(3)
  })

  it('variant="image" aplica aspect-ratio custom via style', () => {
    const html = renderToStaticMarkup(
      <MessageBubbleSkeleton variant="image" aspectRatio="16 / 9" />,
    )
    expect(html).toContain('aspect-ratio:16 / 9')
  })

  it('variant="image" sin aspectRatio usa 16 / 9 por defecto', () => {
    const html = renderToStaticMarkup(<MessageBubbleSkeleton variant="image" />)
    expect(html).toContain('aspect-ratio:16 / 9')
  })

  it('variant="audio" renderiza Skeleton con altura fija del waveform player', () => {
    const html = renderToStaticMarkup(<MessageBubbleSkeleton variant="audio" />)
    // AudioBubble real: wrapper p-3 + waveform h-8 → altura total ~h-14
    expect(html).toContain('h-14')
  })

  it('variant="file" renderiza Skeleton con altura fija del file card', () => {
    const html = renderToStaticMarkup(<MessageBubbleSkeleton variant="file" />)
    // FileBubble real: p-3 wrapper + 2 líneas de texto + icono md → ~h-[72px]
    expect(html).toContain('h-[72px]')
  })

  it('sent=true aplica items-end y omite header avatar/name', () => {
    const html = renderToStaticMarkup(
      <MessageBubbleSkeleton variant="text-short" sent />,
    )
    expect(html).toContain('items-end')
    // No hay rounded-full (avatar circle) en sent
    expect(html).not.toContain('rounded-full')
  })

  it('sent=false (default) aplica items-start y renderiza avatar+name', () => {
    const html = renderToStaticMarkup(<MessageBubbleSkeleton variant="text-short" />)
    expect(html).toContain('items-start')
    // Hay avatar circle skeleton
    expect(html).toContain('rounded-full')
  })

  it('no usa animate-pulse directamente (delega shimmer al primitivo Skeleton)', () => {
    const html = renderToStaticMarkup(<MessageBubbleSkeleton variant="text-long" />)
    // El primitivo Skeleton usa animate-[shimmer_...], NO animate-pulse literal
    expect(html).not.toContain('animate-pulse')
  })
})
