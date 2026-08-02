import { NextResponse } from 'next/server'
import { isLocalDataAvailable, allBrands as allBrandsLocal } from '@/lib/localProducts'
import { allBrands } from '@/lib/db/products'

export async function GET() {
  // Local files
  if (isLocalDataAvailable()) {
    const data = allBrandsLocal()
    return NextResponse.json({ data, total: data.length })
  }

  // MySQL
  try {
    const data = await allBrands()
    return NextResponse.json({ data, total: data.length })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
