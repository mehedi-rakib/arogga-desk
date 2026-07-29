export interface AttachedFile {
  src: string
  title: string
}

export interface ProductVariant {
  pv_id: number
  pv_p_id: number
  pv_medicine_id: number
  pv_sku: string
  pv_mrp: number
  pv_b2c_mrp: number
  pv_b2b_mrp: number
  pv_b2c_discounted_price: number
  pv_b2c_price: number
  pv_b2b_discounted_price: number
  pv_b2b_price: number
  pv_purchase_price: number
  pv_stock_status: number
  pv_allow_purchase: number
  pv_allow_sales: number
  pv_b2b_discount_percent: number
  pv_b2c_discount_percent: number
  pv_b2b_min_qty: number
  pv_b2b_max_qty: number
  pv_b2c_min_qty: number
  pv_b2c_max_qty: number
  pv_average_rating: number
  pv_total_rating: number
  pv_trending_score: number
  pv_m_percentage: number
  pv_campaign_tag_id: number
  pv_created_at: string
  pu_base_unit_label: string
  pu_base_unit_multiplier: number
  pu_b2b_sales_unit_label: string
  pu_b2c_sales_unit_label: string
  pu_b2c_base_unit_multiplier: number
  pu_b2b_base_unit_multiplier: number
  pu_b2c_sales_unit_id: number
  pu_b2b_sales_unit_id: number
  pv_counts: {
    pvc_viewed_count: number
    pvc_ordered_count: number
    pvc_wishlist_count: number
  }
  attachedFiles_pv_images: AttachedFile[]
}

export interface Product {
  pv_id: number
  id: number
  p_id: number
  p_name: string
  p_name_bn: string
  p_type: string
  p_generic_name: string
  p_brand: string
  p_brand_name: string
  p_allow_sales: number
  p_is_flash_sale: number
  p_cat_id: number
  p_cold: number
  p_is_not_allowed_outside_dhaka: number
  p_short_description: string
  p_product_tags: string[]
  p_trending_score: number
  p_created_at: string
  p_active_status: string
  POSTER: string
  haveImage: number
  productCountViewed: number
  productCountOrdered: number
  productCountWishlist: number
  attachedFiles_p_images: AttachedFile[]
  pv: ProductVariant[]
}

export interface SearchResponse {
  status: string
  total: number
  data: Product[]
}

export type SortMode = 'rel' | 'mgB2b' | 'profit' | 'priceAsc' | 'priceDesc' | 'orders'
