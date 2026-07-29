import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/mongodb'
import ProductModel from '@/models/Product'

export async function GET() {
  try {
    await connectDB()

    const [totalProducts, brandsResult, catsResult, topOrdered] = await Promise.all([
      ProductModel.countDocuments(),
      ProductModel.distinct('p_brand_name'),
      ProductModel.distinct('p_cat_id'),
      ProductModel.find({})
        .sort({ productCountOrdered: -1 })
        .limit(5)
        .select('p_name p_brand_name productCountOrdered productCountViewed pv')
        .lean(),
    ])

    return NextResponse.json({
      totalProducts,
      totalBrands: brandsResult.filter(Boolean).length,
      totalCategories: catsResult.filter(Boolean).length,
      topOrdered,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
