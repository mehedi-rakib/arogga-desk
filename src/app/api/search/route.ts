import { NextRequest, NextResponse } from 'next/server'
import { isLocalDataAvailable, searchLocal } from '@/lib/localProducts'
import { searchProducts, countProducts } from '@/lib/db/products'

const PER_PAGE_DEFAULT = 24

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const page = Math.max(1, parseInt(searchParams.get('_page') ?? '1', 10))
  const perPage = Math.max(1, parseInt(searchParams.get('_perPage') ?? String(PER_PAGE_DEFAULT), 10))
  const search = (searchParams.get('_search') ?? '').trim()
  const brand = (searchParams.get('_brand') ?? '').trim()
  const cat = (searchParams.get('_cat') ?? '').trim()

  // 1. Local JSON files (fastest, no network)
  if (isLocalDataAvailable()) {
    const result = searchLocal({ search, brand, cat, page, perPage })
    return NextResponse.json({ status: 'success', ...result })
  }

  // 2. MySQL
  try {
    const count = await countProducts()
    if (count > 0) {
      const result = await searchProducts({ search, brand, cat, page, perPage })
      return NextResponse.json({ status: 'success', ...result })
    }
  } catch {
    // MySQL unavailable — fall through
  }

  // 3. Live API proxy
  return proxyLive(search, page, perPage)
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
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: 'Proxy failed', message }, { status: 502 })
  }
}
