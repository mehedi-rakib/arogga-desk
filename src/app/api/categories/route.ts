import { NextResponse } from 'next/server'
import { isLocalDataAvailable, allCategories } from '@/lib/localProducts'
import { connectDB } from '@/lib/mongodb'
import ProductModel from '@/models/Product'

export async function GET() {
  // Local files
  if (isLocalDataAvailable()) {
    const data = allCategories()
    return NextResponse.json({ data, total: data.length })
  }

  // MongoDB
  try {
    await connectDB()
    const categories = await ProductModel.aggregate([
      { $match: { p_cat_id: { $exists: true, $gt: 0 } } },
      {
        $group: {
          _id: '$p_cat_id',
          count: { $sum: 1 },
          types: { $addToSet: '$p_type' },
          totalOrders: { $sum: '$productCountOrdered' },
          avgB2b: { $avg: { $arrayElemAt: ['$pv.pv_b2b_discounted_price', 0] } },
        },
      },
      { $sort: { count: -1 } },
      { $project: { _id: 0, catId: '$_id', count: 1, types: 1, totalOrders: 1, avgB2b: { $round: ['$avgB2b', 2] } } },
    ])
    return NextResponse.json({ data: categories, total: categories.length })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
