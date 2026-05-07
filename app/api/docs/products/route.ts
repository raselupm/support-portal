import { NextResponse } from 'next/server'
import { redis } from '@/lib/redis'
import { DocProduct } from '@/lib/types'

export async function GET() {
  const ids = (await redis.zrange('doc_products', 0, -1, { rev: true })) as string[]
  if (ids.length === 0) return NextResponse.json([])

  const products: DocProduct[] = []
  for (const id of ids) {
    const prod = await redis.get<DocProduct>(`doc_product:${id}`)
    if (prod) products.push(prod)
  }
  return NextResponse.json(products)
}
