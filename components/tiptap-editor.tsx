'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useCallback } from 'react'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Link as LinkIcon,
  Unlink,
} from 'lucide-react'

interface TiptapEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

export default function TiptapEditor({
  content,
  onChange,
  placeholder = 'Start typing...',
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        autolink: true,
        defaultProtocol: 'https',
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sync external content resets (e.g., after form submit clearing content)
  useEffect(() => {
    if (editor && content === '' && editor.getHTML() !== '<p></p>') {
      editor.commands.setContent('')
    }
  }, [editor, content])

  const setLink = useCallback(() => {
    if (!editor) return
    const previousUrl = editor.getAttributes('link').href as string
    const url = window.prompt('URL', previousUrl)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  type ToolbarButton = {
    icon: React.ReactNode
    label: string
    action: () => void
    isActive?: boolean
    type: 'button'
  } | {
    type: 'divider'
  }

  const toolbarButtons: ToolbarButton[] = [
    {
      type: 'button',
      icon: <Bold className="w-4 h-4" />,
      label: 'Bold',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      type: 'button',
      icon: <Italic className="w-4 h-4" />,
      label: 'Italic',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    {
      type: 'button',
      icon: <UnderlineIcon className="w-4 h-4" />,
      label: 'Underline',
      action: () => editor.chain().focus().toggleUnderline().run(),
      isActive: editor.isActive('underline'),
    },
    { type: 'divider' },
    {
      type: 'button',
      icon: <List className="w-4 h-4" />,
      label: 'Bullet List',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      type: 'button',
      icon: <ListOrdered className="w-4 h-4" />,
      label: 'Ordered List',
      action: () => editor.chain().focus().toggleOrderedList().run(),
      isActive: editor.isActive('orderedList'),
    },
    { type: 'divider' },
    {
      type: 'button',
      icon: <LinkIcon className="w-4 h-4" />,
      label: 'Add Link',
      action: setLink,
      isActive: editor.isActive('link'),
    },
    {
      type: 'button',
      icon: <Unlink className="w-4 h-4" />,
      label: 'Remove Link',
      action: () => editor.chain().focus().unsetLink().run(),
    },
  ]

  return (
    <div className="tiptap-editor">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-200 bg-gray-50 flex-wrap">
        {toolbarButtons.map((item, index) => {
          if (item.type === 'divider') {
            return <div key={index} className="w-px h-5 bg-gray-200 mx-1" />
          }
          return (
            <button
              key={index}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault()
                item.action()
              }}
              title={item.label}
              className={`p-1.5 rounded transition-colors ${
                item.isActive
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              {item.icon}
            </button>
          )
        })}
      </div>

      {/* Editor Area */}
      <EditorContent editor={editor} className="tiptap-editor" />
    </div>
  )
}
