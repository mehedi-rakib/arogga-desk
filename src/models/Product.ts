import mongoose, { Schema, Model } from 'mongoose'
import type { Product } from '@/types/product'

const AttachedFileSchema = new Schema(
  { src: String, title: String },
  { _id: false }
)

const PvCountsSchema = new Schema(
  {
    pvc_viewed_count: Number,
    pvc_ordered_count: Number,
    pvc_wishlist_count: Number,
  },
  { _id: false }
)

const VariantSchema = new Schema({}, { _id: false, strict: false })
const UnitSchema = new Schema({}, { _id: false, strict: false })

// Using Schema without type param so extra fields don't cause TS errors;
// strict:false lets Mongoose store any field sent from the API.
const ProductSchema = new Schema(
  {
    p_id: { type: Number, unique: true, index: true },
    pv_id: Number,
    id: Number,
    p_name: { type: String, index: true },
    p_name_bn: String,
    p_generic_name: String,
    p_type: String,
    p_brand: String,
    p_brand_name: String,
    p_form: String,
    p_strength: String,
    p_short_description: String,
    p_meta_description: String,
    p_active_status: String,
    p_allow_sales: Number,
    p_is_flash_sale: Number,
    p_cat_id: Number,
    p_cold: Number,
    p_is_not_allowed_outside_dhaka: Number,
    p_trending_score: Number,
    p_created_at: String,
    p_product_tags: [String],
    p_product_internal_tags: [String],
    p_rx_req: Number,
    p_generic_id: Number,
    p_manufacturer_id: Number,
    p_company_id: Number,
    p_brand_id: Number,
    p_variant_count: Number,
    p_weight: Number,
    p_stock_status: Number,
    POSTER: String,
    haveImage: Number,
    productCountViewed: Number,
    productCountOrdered: Number,
    productCountWishlist: Number,
    attachedFiles_p_images: { type: [AttachedFileSchema], default: [] },
    pv: { type: [VariantSchema], default: [] },
    pu: { type: [UnitSchema], default: [] },
  },
  { timestamps: true, strict: false }
)

// Text index for full-text search across name, generic name, brand
ProductSchema.index(
  { p_name: 'text', p_name_bn: 'text', p_generic_name: 'text', p_brand_name: 'text' },
  { weights: { p_name: 10, p_generic_name: 5, p_brand_name: 3, p_name_bn: 2 } }
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ProductModel: Model<any> =
  mongoose.models.Product ?? mongoose.model('Product', ProductSchema)

export default ProductModel
