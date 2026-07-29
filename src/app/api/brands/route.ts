import { NextResponse } from 'next/server'
import { isLocalDataAvailable, allBrands } from '@/lib/localProducts'
import { connectDB } from '@/lib/mongodb'
import ProductModel from '@/models/Product'

export async function GET() {
  // Local files
  if (isLocalDataAvailable()) {
    const data = allBrands()
    return NextResponse.json({ data, total: data.length })
  }

  // MongoDB
  try {
    await connectDB()
    const brands = await ProductModel.aggregate([
      { $match: { p_brand_name: { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$p_brand_name',
          count: { $sum: 1 },
          avgB2b: { $avg: { $arrayElemAt: ['$pv.pv_b2b_discounted_price', 0] } },
          totalOrders: { $sum: '$productCountOrdered' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 500 },
      { $project: { _id: 0, name: '$_id', count: 1, avgB2b: { $round: ['$avgB2b', 2] }, totalOrders: 1 } },
    ])
    return NextResponse.json({ data: brands, total: brands.length })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
