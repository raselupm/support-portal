'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Upload, X, Check, Trash2 } from 'lucide-react'

interface MediaItem {
  url: string
  key: string
  name: string
}

interface ImagePickerModalProps {
  onInsert: (urls: string[]) => void
  onClose: () => void
}

export default function ImagePickerModal({ onInsert, onClose }: ImagePickerModalProps) {
  const [images, setImages] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const [confirmKey, setConfirmKey] = useState<string | null>(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { fetchImages() }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  async function fetchImages() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/media')
      if (!res.ok) throw new Error()
      setImages(await res.json())
    } catch {
      setError('Failed to load images.')
    } finally {
      setLoading(false)
    }
  }

  function toggleSelect(url: string) {
    setSelected((prev) => (prev === url ? null : url))
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    try {
      const uploaded: MediaItem[] = []
      for (const file of Array.from(files)) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch('/api/admin/media', { method: 'POST', body: fd })
        if (!res.ok) { setError('Upload failed for ' + file.name); continue }
        uploaded.push(await res.json())
      }
      setImages((prev) => [...uploaded, ...prev])
      if (uploaded.length > 0) setSelected(uploaded[0].url)
    } catch {
      setError('Upload failed.')
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(img: MediaItem) {
    setDeletingKey(img.key)
    setConfirmKey(null)
    try {
      await fetch('/api/admin/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: img.key }),
      })
      setImages((prev) => prev.filter((i) => i.key !== img.key))
      if (selected === img.url) setSelected(null)
    } catch {
      setError('Delete failed.')
    } finally {
      setDeletingKey(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onMouseDown={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Media Library</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 px-3 py-1.5 rounded-lg transition-colors"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Upload
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleUpload(e.target.files)}
            />
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto p-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleUpload(e.dataTransfer.files) }}
        >
          {error && (
            <p className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            </div>
          ) : images.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 cursor-pointer hover:border-blue-400 hover:text-blue-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-8 h-8 mb-2" />
              <p className="text-sm font-medium">No images yet</p>
              <p className="text-xs mt-1">Click or drag &amp; drop to upload</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {images.map((img) => {
                const isSelected = selected === img.url
                const isConfirming = confirmKey === img.key
                const isDeleting = deletingKey === img.key

                return (
                  <div key={img.key} className="relative group aspect-square">
                    {/* Image tile */}
                    <button
                      type="button"
                      onClick={() => { setConfirmKey(null); toggleSelect(img.url) }}
                      className={`w-full h-full rounded-lg overflow-hidden border-2 transition-all focus:outline-none
                        ${isSelected ? 'border-blue-500 ring-2 ring-blue-200' : 'border-transparent hover:border-gray-300'}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                      <div className={`absolute inset-0 rounded-lg transition-opacity pointer-events-none
                        ${isSelected ? 'bg-blue-600/20' : 'bg-black/0 group-hover:bg-black/10'}`} />
                    </button>

                    {/* Selected check */}
                    {isSelected && (
                      <div className="absolute top-1.5 left-1.5 w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center pointer-events-none">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </div>
                    )}

                    {/* Delete button — visible on hover */}
                    {!isConfirming && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setConfirmKey(img.key) }}
                        disabled={isDeleting}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-black/50 text-white flex items-center justify-center
                          opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all disabled:opacity-40"
                        title="Delete"
                      >
                        {isDeleting
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />
                        }
                      </button>
                    )}

                    {/* Delete confirmation overlay */}
                    {isConfirming && (
                      <div className="absolute inset-0 rounded-lg bg-black/70 flex flex-col items-center justify-center gap-2 p-2">
                        <p className="text-white text-[11px] font-medium text-center leading-tight">Delete this image?</p>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDelete(img) }}
                            className="px-2 py-1 text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setConfirmKey(null) }}
                            className="px-2 py-1 text-[11px] font-semibold bg-white/20 hover:bg-white/30 text-white rounded-md transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Name tooltip */}
                    {!isConfirming && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity truncate rounded-b-lg pointer-events-none">
                        {img.name}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <p className="text-sm text-gray-500">
            {selected ? '1 selected' : 'Click an image to select'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!selected}
              onClick={() => { onInsert(selected ? [selected] : []); onClose() }}
              className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              Insert
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
