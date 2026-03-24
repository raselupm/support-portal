import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { isStaff } from '@/lib/auth'
import { getStorageDriver, uploadToS3, uploadToCloudinary, listFromS3, listFromCloudinary, deleteFromS3, deleteFromCloudinary } from '@/lib/storage'
import { randomUUID } from 'crypto'

export async function GET() {
  const session = await getSession()
  if (!session.email || !(await isStaff(session.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const driver = getStorageDriver()
  if (!driver) return NextResponse.json({ error: 'No storage driver configured' }, { status: 400 })

  try {
    const images = driver === 'cloudinary' ? await listFromCloudinary() : await listFromS3()
    return NextResponse.json(images)
  } catch (e) {
    console.error('media list error', e)
    return NextResponse.json({ error: 'Failed to list media' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session.email || !(await isStaff(session.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const driver = getStorageDriver()
  if (!driver) return NextResponse.json({ error: 'No storage driver configured' }, { status: 400 })

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const key = `media/${randomUUID()}.${ext}`
    const buffer = Buffer.from(await file.arrayBuffer())

    let url: string
    if (driver === 'cloudinary') {
      url = await uploadToCloudinary(buffer, key)
    } else {
      url = await uploadToS3(buffer, key, file.type)
    }

    return NextResponse.json({ url, key, name: file.name })
  } catch (e) {
    console.error('media upload error', e)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession()
  if (!session.email || !(await isStaff(session.email))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const driver = getStorageDriver()
  if (!driver) return NextResponse.json({ error: 'No storage driver configured' }, { status: 400 })

  try {
    const { key } = await request.json() as { key: string }
    if (!key) return NextResponse.json({ error: 'Key is required' }, { status: 400 })

    if (driver === 'cloudinary') {
      await deleteFromCloudinary(key)
    } else {
      await deleteFromS3(key)
    }
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('media delete error', e)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
