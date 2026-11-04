import { NextResponse } from 'next/server'
import { isLocalDataAvailable, allCategories as allCategoriesLocal } from '@/lib/localProducts'
import { allCategories } from '@/lib/db/products'

export async function GET() {
  // Local files
  if (isLocalDataAvailable()) {
    const data = allCategoriesLocal()
    return NextResponse.json({ data, total: data.length })
  }

  // MySQL
  try {
    const data = await allCategories()
    return NextResponse.json({ data, total: data.length })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
