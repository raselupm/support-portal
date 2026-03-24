import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { v2 as cloudinary } from 'cloudinary'

export type StorageDriver = 'aws' | 'digital-ocean' | 'cloudinary'

export function getStorageDriver(): StorageDriver | null {
  const d = process.env.STORAGE_DRIVER as StorageDriver | undefined
  if (d === 'aws' || d === 'digital-ocean' || d === 'cloudinary') return d
  return null
}

// ── S3 / DigitalOcean Spaces ─────────────────────────────────────────────────

function getS3Client(): S3Client {
  const driver = getStorageDriver()
  if (driver === 'digital-ocean') {
    return new S3Client({
      region: process.env.DO_SPACES_REGION || 'us-east-1',
      endpoint: process.env.DO_SPACES_ENDPOINT,
      credentials: {
        accessKeyId: process.env.DO_SPACES_KEY!,
        secretAccessKey: process.env.DO_SPACES_SECRET!,
      },
      forcePathStyle: false,
    })
  }
  return new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  })
}

function getS3Bucket(): string {
  const driver = getStorageDriver()
  return (driver === 'digital-ocean' ? process.env.DO_SPACES_BUCKET : process.env.AWS_BUCKET) || ''
}

export async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const client = getS3Client()
  const bucket = getS3Bucket()
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    ACL: 'public-read' as never,
  }))
  const driver = getStorageDriver()
  if (driver === 'digital-ocean') {
    const endpoint = process.env.DO_SPACES_ENDPOINT || ''
    const host = endpoint.replace(/^https?:\/\//, '')
    return `https://${bucket}.${host}/${key}`
  }
  return `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`
}

export async function listFromS3(prefix = 'media/'): Promise<{ url: string; key: string; name: string }[]> {
  const client = getS3Client()
  const bucket = getS3Bucket()
  const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix }))
  const driver = getStorageDriver()
  return (res.Contents || [])
    .filter((obj) => obj.Key && /\.(jpe?g|png|gif|webp|svg)$/i.test(obj.Key))
    .map((obj) => {
      const key = obj.Key!
      let url: string
      if (driver === 'digital-ocean') {
        const endpoint = process.env.DO_SPACES_ENDPOINT || ''
        const host = endpoint.replace(/^https?:\/\//, '')
        url = `https://${bucket}.${host}/${key}`
      } else {
        url = `https://${bucket}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`
      }
      return { url, key, name: key.replace(prefix, '') }
    })
}

export async function deleteFromS3(key: string): Promise<void> {
  const client = getS3Client()
  const bucket = getS3Bucket()
  await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
}

// ── Cloudinary ────────────────────────────────────────────────────────────────

function configureCloudinary() {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

export async function uploadToCloudinary(
  buffer: Buffer,
  filename: string
): Promise<string> {
  configureCloudinary()
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder: 'media', public_id: filename.replace(/\.[^.]+$/, ''), resource_type: 'image' },
      (err, result) => {
        if (err || !result) return reject(err || new Error('Upload failed'))
        resolve(result.secure_url)
      }
    ).end(buffer)
  })
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  configureCloudinary()
  await cloudinary.uploader.destroy(publicId)
}

export async function listFromCloudinary(): Promise<{ url: string; key: string; name: string }[]> {
  configureCloudinary()
  const res = await cloudinary.api.resources({ type: 'upload', prefix: 'media/', max_results: 200 })
  return (res.resources || []).map((r: { secure_url: string; public_id: string }) => ({
    url: r.secure_url,
    key: r.public_id,
    name: r.public_id.replace('media/', ''),
  }))
}
