import { NextResponse } from 'next/server'
import { isLocalDataAvailable, getStats as getLocalStats } from '@/lib/localProducts'
import { getStats } from '@/lib/db/products'

export async function GET() {
  // Local files
  if (isLocalDataAvailable()) {
    return NextResponse.json(getLocalStats())
  }

  // MySQL
  try {
    const stats = await getStats()
    return NextResponse.json(stats)
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
