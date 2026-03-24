'use client'

import { NodeViewWrapper, ReactNodeViewRenderer } from '@tiptap/react'
import { Image } from '@tiptap/extension-image'
import { mergeAttributes } from '@tiptap/core'
import { useRef, useCallback, useState } from 'react'
import type { NodeViewProps } from '@tiptap/react'

// ── Resize handle positions (4 corners only) ───────────────────────────────────
type Direction = 'nw' | 'ne' | 'se' | 'sw'

const HANDLES: { dir: Direction; style: React.CSSProperties }[] = [
  { dir: 'nw', style: { top: -4,    left: -4,  cursor: 'nw-resize' } },
  { dir: 'ne', style: { top: -4,    right: -4, cursor: 'ne-resize' } },
  { dir: 'se', style: { bottom: -4, right: -4, cursor: 'se-resize' } },
  { dir: 'sw', style: { bottom: -4, left: -4,  cursor: 'sw-resize' } },
]

// ── Node View Component ────────────────────────────────────────────────────────
function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const { src, alt, title, width, caption } = node.attrs

  const startResize = useCallback((e: React.MouseEvent, dir: Direction) => {
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const startW = imgRef.current?.offsetWidth ?? (typeof width === 'number' ? width : 300)

    setIsResizing(true)

    function onMove(ev: MouseEvent) {
      const dx = ev.clientX - startX
      const editorEl = imgRef.current?.closest('[contenteditable]') as HTMLElement | null
      const containerW = editorEl?.offsetWidth ?? Infinity
      const rawW = dir.includes('e') ? startW + dx : startW - dx
      const clampedW = Math.min(Math.max(80, rawW), containerW)
      updateAttributes({ width: Math.round(clampedW) })
    }

    function onUp() {
      setIsResizing(false)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [updateAttributes, width])

  return (
    <NodeViewWrapper style={{ display: 'block', lineHeight: 0 }} data-drag-handle>
      <div style={{ display: 'inline-block', position: 'relative' }}>

        {/* Image + resize handles */}
        <div
          style={{
            position: 'relative',
            display: 'inline-block',
            outline: selected ? '2px solid #2563eb' : 'none',
            outlineOffset: 2,
            borderRadius: 2,
            userSelect: 'none',
            cursor: isResizing ? 'inherit' : 'default',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={src}
            alt={alt ?? ''}
            title={title ?? ''}
            style={{
              display: 'block',
              width: width ? `${width}px` : undefined,
              height: 'auto',
              maxWidth: '100%',
              pointerEvents: 'none',
            }}
            draggable={false}
          />

          {selected && HANDLES.map(({ dir, style }) => (
            <div
              key={dir}
              onMouseDown={(e) => startResize(e, dir)}
              style={{
                position: 'absolute',
                width: 9,
                height: 9,
                background: '#2563eb',
                border: '2px solid white',
                borderRadius: 2,
                boxShadow: '0 0 0 1px #2563eb',
                zIndex: 10,
                ...style,
              }}
            />
          ))}
        </div>

        {/* Caption — shown as input when selected, as plain text otherwise */}
        {selected ? (
          <input
            type="text"
            placeholder="Add a caption…"
            value={caption ?? ''}
            onChange={(e) => updateAttributes({ caption: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'block',
              width: width ? `${width}px` : '100%',
              maxWidth: '100%',
              marginTop: 6,
              padding: '4px 8px',
              fontSize: 13,
              color: '#6b7280',
              textAlign: 'center',
              background: 'transparent',
              border: '1px dashed #d1d5db',
              borderRadius: 4,
              outline: 'none',
              lineHeight: '1.4',
              boxSizing: 'border-box',
            }}
          />
        ) : caption ? (
          <figcaption
            style={{
              display: 'block',
              width: width ? `${width}px` : '100%',
              maxWidth: '100%',
              marginTop: 6,
              fontSize: 13,
              color: '#6b7280',
              textAlign: 'center',
              lineHeight: '1.4',
            }}
          >
            {caption}
          </figcaption>
        ) : null}
      </div>
    </NodeViewWrapper>
  )
}

// ── Custom Extension ───────────────────────────────────────────────────────────
export const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      src: {
        default: null,
        parseHTML: (el) => {
          const img = el.tagName === 'IMG' ? el : el.querySelector('img')
          return img?.getAttribute('src') ?? null
        },
        renderHTML: (attrs) => attrs.src ? { src: attrs.src } : {},
      },
      alt: {
        default: null,
        parseHTML: (el) => {
          const img = el.tagName === 'IMG' ? el : el.querySelector('img')
          return img?.getAttribute('alt') ?? null
        },
        renderHTML: (attrs) => attrs.alt ? { alt: attrs.alt } : {},
      },
      title: {
        default: null,
        parseHTML: (el) => {
          const img = el.tagName === 'IMG' ? el : el.querySelector('img')
          return img?.getAttribute('title') ?? null
        },
        renderHTML: (attrs) => attrs.title ? { title: attrs.title } : {},
      },
      width: {
        default: null,
        parseHTML: (el) => {
          const img = el.tagName === 'IMG' ? el : el.querySelector('img')
          const w = img?.getAttribute('width')
          return w ? parseInt(w) : null
        },
        renderHTML: (attrs) => attrs.width ? { width: attrs.width, style: `width:${attrs.width}px` } : {},
      },
      height: { default: null },
      caption: {
        default: '',
        parseHTML: (el) => {
          const fc = el.tagName === 'FIGURE'
            ? el.querySelector('figcaption')?.textContent
            : null
          return fc ?? ''
        },
        renderHTML: () => ({}), // rendered manually below
      },
    }
  },

  parseHTML() {
    return [
      { tag: 'figure', priority: 51 },
      { tag: 'img[src]' },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const caption = node.attrs.caption as string | undefined
    const { width, height, src, alt, title, ...rest } = HTMLAttributes
    const imgAttrs = mergeAttributes(rest, { src, alt, title }, width ? { width, style: `width:${width}px` } : {})
    if (caption) {
      return ['figure', {}, ['img', imgAttrs], ['figcaption', {}, caption]]
    }
    return ['img', imgAttrs]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView)
  },
})
