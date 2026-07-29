import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import ProductModel from '@/models/Product'

const PER_PAGE_DEFAULT = 24

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('_page') ?? '1', 10))
  const perPage = Math.max(1, parseInt(searchParams.get('_perPage') ?? String(PER_PAGE_DEFAULT), 10))
  const search = (searchParams.get('_search') ?? '').trim()
  const brand = (searchParams.get('_brand') ?? '').trim()
  const cat = (searchParams.get('_cat') ?? '').trim()

  try {
    await connectDB()

    // Check if we have data in MongoDB
    const count = await ProductModel.estimatedDocumentCount()

    if (count > 0) {
      return await searchMongo(search, page, perPage, count, brand, cat)
    }
  } catch {
    // MongoDB unavailable — fall through to live proxy
  }

  return proxyLive(search, page, perPage)
}

async function searchMongo(search: string, page: number, perPage: number, totalInDB: number, brand = '', cat = '') {
  const skip = (page - 1) * perPage

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let sortOpt: any

  if (search) {
    query = { $text: { $search: search } }
    sortOpt = { score: { $meta: 'textScore' }, p_trending_score: -1 }
  } else {
    query = {}
    sortOpt = { p_trending_score: -1 }
  }

  if (brand) query.p_brand_name = { $regex: brand, $options: 'i' }
  if (cat) query.p_cat_id = parseInt(cat, 10)

  const [data, total] = await Promise.all([
    ProductModel.find(query, search ? { score: { $meta: 'textScore' } } : {})
      .sort(sortOpt)
      .skip(skip)
      .limit(perPage)
      .lean(),
    search
      ? ProductModel.countDocuments(query)
      : totalInDB,
  ])

  return NextResponse.json({
    status: 'success',
    total,
    data,
    source: 'mongodb',
  })
}

async function proxyLive(search: string, page: number, perPage: number) {
  const upstream = new URL('https://api.arogga.com/general/v3/search')
  upstream.searchParams.set('_page', String(page))
  upstream.searchParams.set('_perPage', String(perPage))
  if (search) upstream.searchParams.set('_search', search)

  try {
    const res = await fetch(upstream.toString(), {
      headers: { Accept: 'application/json' },
      next: { revalidate: 0 },
    })
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') ?? 'application/json',
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Proxy failed', message }, { status: 502 })
  }
}
