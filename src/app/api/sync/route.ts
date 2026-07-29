import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import ProductModel from '@/models/Product'

const BASE_URL = 'https://api.arogga.com/general/v3/search'
const PER_PAGE = 100
const CONCURRENCY = 5

interface ApiResponse {
  status: string
  total: number
  data: Record<string, unknown>[]
}

async function fetchPage(page: number): Promise<ApiResponse> {
  const url = `${BASE_URL}?_page=${page}&_perPage=${PER_PAGE}`
  const res = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status} on page ${page}`)
  return res.json() as Promise<ApiResponse>
}

async function upsertProducts(docs: Record<string, unknown>[]) {
  const ops = docs.map((doc) => ({
    updateOne: {
      filter: { p_id: doc.p_id ?? doc.id },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: { $set: { ...doc, p_id: doc.p_id ?? doc.id } as any },
      upsert: true,
    },
  }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (ops.length) await ProductModel.bulkWrite(ops as any, { ordered: false })
}

// GET /api/sync — returns current DB stats
export async function GET() {
  try {
    await connectDB()
    const count = await ProductModel.countDocuments()
    const newest = await ProductModel.findOne({}).sort({ createdAt: -1 }).select('p_name createdAt').lean()
    return NextResponse.json({ count, newest })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// POST /api/sync — starts a background sync (streams progress as NDJSON)
export async function POST(req: NextRequest) {
  const { startPage = 1 } = await req.json().catch(() => ({}))

  const encoder = new TextEncoder()
  const stream = new TransformStream<Uint8Array, Uint8Array>()
  const writer = stream.writable.getWriter()

  const send = (obj: Record<string, unknown>) =>
    writer.write(encoder.encode(JSON.stringify(obj) + '\n'))

  ;(async () => {
    try {
      await connectDB()
      await send({ event: 'connected' })

      const first = await fetchPage(startPage)
      const total = first.total
      const totalPages = Math.ceil(total / PER_PAGE)
      await upsertProducts(first.data)
      await send({ event: 'progress', page: startPage, totalPages, total })

      let done = startPage

      const tasks = Array.from({ length: totalPages - startPage }, (_, i) => {
        const page = startPage + i + 1
        return async () => {
          const json = await fetchPage(page)
          await upsertProducts(json.data)
          done++
          await send({ event: 'progress', page, done, totalPages, total })
        }
      })

      // run with bounded concurrency
      let idx = 0
      async function worker() {
        while (idx < tasks.length) {
          const t = tasks[idx++]
          await t()
        }
      }
      await Promise.all(Array.from({ length: CONCURRENCY }, worker))

      const count = await ProductModel.countDocuments()
      await send({ event: 'done', count })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await send({ event: 'error', message })
    } finally {
      await writer.close()
    }
  })()

  return new NextResponse(stream.readable as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Cache-Control': 'no-store',
      'Transfer-Encoding': 'chunked',
    },
  })
}
