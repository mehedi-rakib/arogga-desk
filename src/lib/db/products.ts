import type { RowDataPacket, ResultSetHeader, PoolConnection } from 'mysql2/promise'
import { getPool } from '@/lib/mysql'
import type { Product, ProductVariant, AttachedFile } from '@/types/product'

// ── Coercion helpers for loosely-typed upstream API payloads ─────────────────

const num = (v: unknown): number => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const str = (v: unknown): string => (v == null ? '' : String(v))
const nullableNum = (v: unknown): number | null => {
  const n = Number(v)
  return Number.isFinite(n) && v != null ? n : null
}

// ── Row → Product/ProductVariant assembly ────────────────────────────────────

interface ProductRow extends RowDataPacket {
  p_id: number
  p_name: string
  p_name_bn: string
  p_generic_name: string
  p_type: string
  p_brand: string
  p_brand_name: string
  p_allow_sales: number
  p_is_flash_sale: number
  p_cat_id: number | null
  p_cold: number
  p_is_not_allowed_outside_dhaka: number
  p_short_description: string
  p_trending_score: number
  p_created_at: string | null
  p_active_status: string
  poster: string
  have_image: number
  product_count_viewed: number
  product_count_ordered: number
  product_count_wishlist: number
}

interface VariantRow extends RowDataPacket {
  pv_id: number
  p_id: number
  pv_medicine_id: number | null
  pv_sku: string
  pv_mrp: number
  pv_b2c_mrp: number
  pv_b2b_mrp: number
  pv_b2c_price: number
  pv_b2c_discounted_price: number
  pv_b2b_price: number
  pv_b2b_discounted_price: number
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
  pv_campaign_tag_id: number | null
  pv_created_at: string | null
  pu_base_unit_label: string
  pu_base_unit_multiplier: number
  pu_b2b_sales_unit_label: string
  pu_b2c_sales_unit_label: string
  pu_b2c_base_unit_multiplier: number
  pu_b2b_base_unit_multiplier: number
  pu_b2c_sales_unit_id: number | null
  pu_b2b_sales_unit_id: number | null
  pvc_viewed_count: number
  pvc_ordered_count: number
  pvc_wishlist_count: number
  sort_order: number
}

interface ImageRow extends RowDataPacket {
  p_id: number
  src: string
  title: string
}

interface VariantImageRow extends RowDataPacket {
  pv_id: number
  src: string
  title: string
}

interface TagRow extends RowDataPacket {
  p_id: number
  kind: 'tag' | 'internal_tag'
  tag: string
}

function toVariant(v: VariantRow, images: AttachedFile[]): ProductVariant {
  return {
    pv_id: v.pv_id,
    pv_p_id: v.p_id,
    pv_medicine_id: v.pv_medicine_id ?? 0,
    pv_sku: v.pv_sku,
    pv_mrp: v.pv_mrp,
    pv_b2c_mrp: v.pv_b2c_mrp,
    pv_b2b_mrp: v.pv_b2b_mrp,
    pv_b2c_discounted_price: v.pv_b2c_discounted_price,
    pv_b2c_price: v.pv_b2c_price,
    pv_b2b_discounted_price: v.pv_b2b_discounted_price,
    pv_b2b_price: v.pv_b2b_price,
    pv_purchase_price: v.pv_purchase_price,
    pv_stock_status: v.pv_stock_status,
    pv_allow_purchase: v.pv_allow_purchase,
    pv_allow_sales: v.pv_allow_sales,
    pv_b2b_discount_percent: v.pv_b2b_discount_percent,
    pv_b2c_discount_percent: v.pv_b2c_discount_percent,
    pv_b2b_min_qty: v.pv_b2b_min_qty,
    pv_b2b_max_qty: v.pv_b2b_max_qty,
    pv_b2c_min_qty: v.pv_b2c_min_qty,
    pv_b2c_max_qty: v.pv_b2c_max_qty,
    pv_average_rating: v.pv_average_rating,
    pv_total_rating: v.pv_total_rating,
    pv_trending_score: v.pv_trending_score,
    pv_m_percentage: v.pv_m_percentage,
    pv_campaign_tag_id: v.pv_campaign_tag_id ?? 0,
    pv_created_at: v.pv_created_at ?? '',
    pu_base_unit_label: v.pu_base_unit_label,
    pu_base_unit_multiplier: v.pu_base_unit_multiplier,
    pu_b2b_sales_unit_label: v.pu_b2b_sales_unit_label,
    pu_b2c_sales_unit_label: v.pu_b2c_sales_unit_label,
    pu_b2c_base_unit_multiplier: v.pu_b2c_base_unit_multiplier,
    pu_b2b_base_unit_multiplier: v.pu_b2b_base_unit_multiplier,
    pu_b2c_sales_unit_id: v.pu_b2c_sales_unit_id ?? 0,
    pu_b2b_sales_unit_id: v.pu_b2b_sales_unit_id ?? 0,
    pv_counts: {
      pvc_viewed_count: v.pvc_viewed_count,
      pvc_ordered_count: v.pvc_ordered_count,
      pvc_wishlist_count: v.pvc_wishlist_count,
    },
    attachedFiles_pv_images: images,
  }
}

function toProduct(
  p: ProductRow,
  variants: ProductVariant[],
  images: AttachedFile[],
  tags: string[]
): Product {
  return {
    pv_id: variants[0]?.pv_id ?? 0,
    id: p.p_id,
    p_id: p.p_id,
    p_name: p.p_name,
    p_name_bn: p.p_name_bn,
    p_type: p.p_type,
    p_generic_name: p.p_generic_name,
    p_brand: p.p_brand,
    p_brand_name: p.p_brand_name,
    p_allow_sales: p.p_allow_sales,
    p_is_flash_sale: p.p_is_flash_sale,
    p_cat_id: p.p_cat_id ?? 0,
    p_cold: p.p_cold,
    p_is_not_allowed_outside_dhaka: p.p_is_not_allowed_outside_dhaka,
    p_short_description: p.p_short_description,
    p_product_tags: tags,
    p_trending_score: p.p_trending_score,
    p_created_at: p.p_created_at ?? '',
    p_active_status: p.p_active_status,
    POSTER: p.poster,
    haveImage: p.have_image,
    productCountViewed: p.product_count_viewed,
    productCountOrdered: p.product_count_ordered,
    productCountWishlist: p.product_count_wishlist,
    attachedFiles_p_images: images,
    pv: variants,
  }
}

/** Fetch full Product objects for the given p_ids, preserving input order. */
export async function getProductsByIds(ids: number[]): Promise<Product[]> {
  if (ids.length === 0) return []
  const pool = getPool()

  const [productRows] = await pool.query<ProductRow[]>(
    'SELECT * FROM products WHERE p_id IN (?)',
    [ids]
  )
  const [variantRows] = await pool.query<VariantRow[]>(
    'SELECT * FROM product_variants WHERE p_id IN (?) ORDER BY sort_order, pv_id',
    [ids]
  )
  const [imageRows] = await pool.query<ImageRow[]>(
    'SELECT p_id, src, title FROM product_images WHERE p_id IN (?) ORDER BY sort_order, id',
    [ids]
  )
  const [tagRows] = await pool.query<TagRow[]>(
    "SELECT p_id, kind, tag FROM product_tags WHERE p_id IN (?) AND kind = 'tag'",
    [ids]
  )

  const variantIds = variantRows.map(v => v.pv_id)
  const [variantImageRows] = variantIds.length
    ? await pool.query<VariantImageRow[]>(
        'SELECT pv_id, src, title FROM product_variant_images WHERE pv_id IN (?) ORDER BY sort_order, id',
        [variantIds]
      )
    : [[] as VariantImageRow[]]

  const imagesByProduct = new Map<number, AttachedFile[]>()
  for (const img of imageRows) {
    const list = imagesByProduct.get(img.p_id) ?? []
    list.push({ src: img.src, title: img.title })
    imagesByProduct.set(img.p_id, list)
  }

  const imagesByVariant = new Map<number, AttachedFile[]>()
  for (const img of variantImageRows) {
    const list = imagesByVariant.get(img.pv_id) ?? []
    list.push({ src: img.src, title: img.title })
    imagesByVariant.set(img.pv_id, list)
  }

  const tagsByProduct = new Map<number, string[]>()
  for (const t of tagRows) {
    const list = tagsByProduct.get(t.p_id) ?? []
    list.push(t.tag)
    tagsByProduct.set(t.p_id, list)
  }

  const variantsByProduct = new Map<number, ProductVariant[]>()
  for (const v of variantRows) {
    const list = variantsByProduct.get(v.p_id) ?? []
    list.push(toVariant(v, imagesByVariant.get(v.pv_id) ?? []))
    variantsByProduct.set(v.p_id, list)
  }

  const productMap = new Map<number, Product>()
  for (const p of productRows) {
    productMap.set(
      p.p_id,
      toProduct(
        p,
        variantsByProduct.get(p.p_id) ?? [],
        imagesByProduct.get(p.p_id) ?? [],
        tagsByProduct.get(p.p_id) ?? []
      )
    )
  }

  return ids.map(id => productMap.get(id)).filter((p): p is Product => !!p)
}

// ── Search ────────────────────────────────────────────────────────────────

const FULLTEXT_COLS = 'p_name, p_name_bn, p_generic_name, p_brand_name'

function buildWhere(search: string, brand: string, cat: string, type: string) {
  const conditions: string[] = []
  const params: unknown[] = []

  if (search) {
    conditions.push(`MATCH(${FULLTEXT_COLS}) AGAINST (? IN NATURAL LANGUAGE MODE)`)
    params.push(search)
  }
  if (brand) {
    conditions.push('p_brand_name LIKE ?')
    params.push(`%${brand}%`)
  }
  if (cat) {
    conditions.push('p_cat_id = ?')
    params.push(parseInt(cat, 10))
  }
  if (type) {
    conditions.push('p_type = ?')
    params.push(type)
  }

  return {
    whereSql: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '',
    whereParams: params,
  }
}

export interface SearchOptions {
  search?: string
  brand?: string
  cat?: string
  type?: string
  page?: number
  perPage?: number
}

export async function searchProducts(opts: SearchOptions) {
  const { search = '', brand = '', cat = '', type = '', page = 1, perPage = 24 } = opts
  const pool = getPool()
  const skip = (page - 1) * perPage

  const { whereSql, whereParams } = buildWhere(search, brand, cat, type)

  const [countRows] = await pool.query<(RowDataPacket & { total: number })[]>(
    `SELECT COUNT(*) AS total FROM products ${whereSql}`,
    whereParams
  )
  const total = countRows[0]?.total ?? 0

  const dataParams = [...whereParams]
  let orderSql: string
  if (search) {
    orderSql = `ORDER BY MATCH(${FULLTEXT_COLS}) AGAINST (?) DESC, p_trending_score DESC`
    dataParams.push(search)
  } else {
    orderSql = 'ORDER BY p_trending_score DESC'
  }
  dataParams.push(perPage, skip)

  const [idRows] = await pool.query<(RowDataPacket & { p_id: number })[]>(
    `SELECT p_id FROM products ${whereSql} ${orderSql} LIMIT ? OFFSET ?`,
    dataParams
  )

  const data = await getProductsByIds(idRows.map(r => r.p_id))
  return { total, data, source: 'mysql' as const }
}

// ── Stats / brands / categories ──────────────────────────────────────────

const FIRST_VARIANT_B2B = `(
  SELECT COALESCE(NULLIF(pv2.pv_b2b_discounted_price, 0), pv2.pv_b2b_price)
  FROM product_variants pv2
  WHERE pv2.p_id = p.p_id
  ORDER BY pv2.sort_order, pv2.pv_id
  LIMIT 1
)`

export async function getStats() {
  const pool = getPool()

  const [[{ totalProducts }]] = await pool.query<(RowDataPacket & { totalProducts: number })[]>(
    'SELECT COUNT(*) AS totalProducts FROM products'
  )
  const [[{ totalBrands }]] = await pool.query<(RowDataPacket & { totalBrands: number })[]>(
    "SELECT COUNT(DISTINCT p_brand_name) AS totalBrands FROM products WHERE p_brand_name <> ''"
  )
  const [[{ totalCategories }]] = await pool.query<(RowDataPacket & { totalCategories: number })[]>(
    'SELECT COUNT(DISTINCT p_cat_id) AS totalCategories FROM products WHERE p_cat_id IS NOT NULL AND p_cat_id > 0'
  )
  const [topRows] = await pool.query<(RowDataPacket & { p_id: number })[]>(
    'SELECT p_id FROM products ORDER BY product_count_ordered DESC LIMIT 5'
  )
  const topOrdered = await getProductsByIds(topRows.map(r => r.p_id))

  return { totalProducts, totalBrands, totalCategories, topOrdered }
}

export async function allBrands() {
  const pool = getPool()
  const [rows] = await pool.query<
    (RowDataPacket & { name: string; count: number; totalOrders: number; avgB2b: number })[]
  >(
    `SELECT p.p_brand_name AS name,
            COUNT(*) AS count,
            SUM(p.product_count_ordered) AS totalOrders,
            ROUND(AVG(${FIRST_VARIANT_B2B}), 2) AS avgB2b
     FROM products p
     WHERE p.p_brand_name <> ''
     GROUP BY p.p_brand_name
     ORDER BY count DESC
     LIMIT 500`
  )
  return rows.map(r => ({
    name: r.name,
    count: r.count,
    totalOrders: r.totalOrders ?? 0,
    avgB2b: r.avgB2b ?? 0,
  }))
}

export async function allCategories() {
  const pool = getPool()
  const [rows] = await pool.query<
    (RowDataPacket & {
      catId: number
      count: number
      name: string | null
      types_concat: string | null
      totalOrders: number
      avgB2b: number
    })[]
  >(
    `SELECT p.p_cat_id AS catId,
            COUNT(*) AS count,
            MAX(c.mi_name) AS name,
            GROUP_CONCAT(DISTINCT p.p_type SEPARATOR '') AS types_concat,
            SUM(p.product_count_ordered) AS totalOrders,
            ROUND(AVG(${FIRST_VARIANT_B2B}), 2) AS avgB2b
     FROM products p
     LEFT JOIN categories c ON c.mi_cat_id = p.p_cat_id
     WHERE p.p_cat_id IS NOT NULL AND p.p_cat_id > 0
     GROUP BY p.p_cat_id
     ORDER BY count DESC`
  )
  return rows.map(r => ({
    catId: r.catId,
    count: r.count,
    name: r.name ?? '',
    types: (r.types_concat ?? '').split('').filter(Boolean),
    totalOrders: r.totalOrders ?? 0,
    avgB2b: r.avgB2b ?? 0,
  }))
}

export async function countProducts(): Promise<number> {
  const pool = getPool()
  const [[{ count }]] = await pool.query<(RowDataPacket & { count: number })[]>(
    'SELECT COUNT(*) AS count FROM products'
  )
  return count
}

// ── Upsert (used by /api/sync and the migration/upload scripts) ──────────

export type WriteResult = 'inserted' | 'updated' | 'skipped' | 'error'

interface RawVariant {
  pv_id?: unknown
  [key: string]: unknown
}

interface RawImage {
  src?: unknown
  title?: unknown
}

async function upsertOne(conn: PoolConnection, doc: Record<string, unknown>): Promise<WriteResult> {
  const pid = num(doc.p_id ?? doc.id)
  if (!pid) return 'error'

  try {
    await conn.beginTransaction()

    const [result] = await conn.query<ResultSetHeader>(
      `INSERT INTO products (
        p_id, p_name, p_name_bn, p_generic_name, p_type, p_brand, p_brand_name, p_brand_id,
        p_form, p_strength, p_short_description, p_meta_description, p_active_status,
        p_allow_sales, p_is_flash_sale, p_cat_id, p_cold, p_is_not_allowed_outside_dhaka,
        p_trending_score, p_created_at, p_rx_req, p_generic_id, p_manufacturer_id, p_company_id,
        p_variant_count, p_weight, p_stock_status, poster, have_image,
        product_count_viewed, product_count_ordered, product_count_wishlist
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        p_name = VALUES(p_name), p_name_bn = VALUES(p_name_bn), p_generic_name = VALUES(p_generic_name),
        p_type = VALUES(p_type), p_brand = VALUES(p_brand), p_brand_name = VALUES(p_brand_name),
        p_brand_id = VALUES(p_brand_id), p_form = VALUES(p_form), p_strength = VALUES(p_strength),
        p_short_description = VALUES(p_short_description), p_meta_description = VALUES(p_meta_description),
        p_active_status = VALUES(p_active_status), p_allow_sales = VALUES(p_allow_sales),
        p_is_flash_sale = VALUES(p_is_flash_sale), p_cat_id = VALUES(p_cat_id), p_cold = VALUES(p_cold),
        p_is_not_allowed_outside_dhaka = VALUES(p_is_not_allowed_outside_dhaka),
        p_trending_score = VALUES(p_trending_score), p_created_at = VALUES(p_created_at),
        p_rx_req = VALUES(p_rx_req), p_generic_id = VALUES(p_generic_id),
        p_manufacturer_id = VALUES(p_manufacturer_id), p_company_id = VALUES(p_company_id),
        p_variant_count = VALUES(p_variant_count), p_weight = VALUES(p_weight),
        p_stock_status = VALUES(p_stock_status), poster = VALUES(poster), have_image = VALUES(have_image),
        product_count_viewed = VALUES(product_count_viewed), product_count_ordered = VALUES(product_count_ordered),
        product_count_wishlist = VALUES(product_count_wishlist)`,
      [
        pid, str(doc.p_name), str(doc.p_name_bn), str(doc.p_generic_name), str(doc.p_type),
        str(doc.p_brand), str(doc.p_brand_name), nullableNum(doc.p_brand_id),
        str(doc.p_form), str(doc.p_strength), str(doc.p_short_description), str(doc.p_meta_description),
        str(doc.p_active_status), num(doc.p_allow_sales), num(doc.p_is_flash_sale),
        nullableNum(doc.p_cat_id), num(doc.p_cold), num(doc.p_is_not_allowed_outside_dhaka),
        num(doc.p_trending_score), doc.p_created_at != null ? str(doc.p_created_at) : null,
        num(doc.p_rx_req), nullableNum(doc.p_generic_id), nullableNum(doc.p_manufacturer_id),
        nullableNum(doc.p_company_id), num(doc.p_variant_count), num(doc.p_weight),
        num(doc.p_stock_status), str(doc.POSTER), num(doc.haveImage),
        num(doc.productCountViewed), num(doc.productCountOrdered), num(doc.productCountWishlist),
      ]
    )

    // Tags: full replace (cheap, catalog tags are small lists)
    await conn.query('DELETE FROM product_tags WHERE p_id = ?', [pid])
    const tagSet = new Set<string>()
    const tagRows: [number, string, string][] = []
    for (const t of (doc.p_product_tags as unknown[]) ?? []) {
      const tag = str(t)
      if (tag && !tagSet.has(`tag:${tag}`)) {
        tagSet.add(`tag:${tag}`)
        tagRows.push([pid, 'tag', tag])
      }
    }
    for (const t of (doc.p_product_internal_tags as unknown[]) ?? []) {
      const tag = str(t)
      if (tag && !tagSet.has(`internal_tag:${tag}`)) {
        tagSet.add(`internal_tag:${tag}`)
        tagRows.push([pid, 'internal_tag', tag])
      }
    }
    if (tagRows.length) {
      await conn.query('INSERT IGNORE INTO product_tags (p_id, kind, tag) VALUES ?', [tagRows])
    }

    // Product images: full replace
    await conn.query('DELETE FROM product_images WHERE p_id = ?', [pid])
    const images = ((doc.attachedFiles_p_images as RawImage[]) ?? []).filter(i => i?.src)
    if (images.length) {
      await conn.query('INSERT INTO product_images (p_id, src, title, sort_order) VALUES ?', [
        images.map((img, i) => [pid, str(img.src), str(img.title), i]),
      ])
    }

    // Variants: match by pv_id — insert new ones, update ones whose data
    // differs (ON DUPLICATE KEY UPDATE is a no-op write when nothing changed),
    // and prune variants that no longer appear upstream.
    const variants = (doc.pv as RawVariant[]) ?? []
    const incomingVariantIds: number[] = []

    for (let i = 0; i < variants.length; i++) {
      const v = variants[i]
      const pvId = num(v.pv_id)
      if (!pvId) continue
      incomingVariantIds.push(pvId)

      const counts = (v.pv_counts as Record<string, unknown>) ?? {}

      await conn.query<ResultSetHeader>(
        `INSERT INTO product_variants (
          pv_id, p_id, pv_medicine_id, pv_sku, pv_mrp, pv_b2c_mrp, pv_b2b_mrp,
          pv_b2c_price, pv_b2c_discounted_price, pv_b2b_price, pv_b2b_discounted_price, pv_purchase_price,
          pv_stock_status, pv_allow_purchase, pv_allow_sales, pv_b2b_discount_percent, pv_b2c_discount_percent,
          pv_b2b_min_qty, pv_b2b_max_qty, pv_b2c_min_qty, pv_b2c_max_qty,
          pv_average_rating, pv_total_rating, pv_trending_score, pv_m_percentage, pv_campaign_tag_id, pv_created_at,
          pu_base_unit_label, pu_base_unit_multiplier, pu_b2b_sales_unit_label, pu_b2c_sales_unit_label,
          pu_b2c_base_unit_multiplier, pu_b2b_base_unit_multiplier, pu_b2c_sales_unit_id, pu_b2b_sales_unit_id,
          pvc_viewed_count, pvc_ordered_count, pvc_wishlist_count, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          pv_medicine_id = VALUES(pv_medicine_id), pv_sku = VALUES(pv_sku), pv_mrp = VALUES(pv_mrp),
          pv_b2c_mrp = VALUES(pv_b2c_mrp), pv_b2b_mrp = VALUES(pv_b2b_mrp), pv_b2c_price = VALUES(pv_b2c_price),
          pv_b2c_discounted_price = VALUES(pv_b2c_discounted_price), pv_b2b_price = VALUES(pv_b2b_price),
          pv_b2b_discounted_price = VALUES(pv_b2b_discounted_price), pv_purchase_price = VALUES(pv_purchase_price),
          pv_stock_status = VALUES(pv_stock_status), pv_allow_purchase = VALUES(pv_allow_purchase),
          pv_allow_sales = VALUES(pv_allow_sales), pv_b2b_discount_percent = VALUES(pv_b2b_discount_percent),
          pv_b2c_discount_percent = VALUES(pv_b2c_discount_percent), pv_b2b_min_qty = VALUES(pv_b2b_min_qty),
          pv_b2b_max_qty = VALUES(pv_b2b_max_qty), pv_b2c_min_qty = VALUES(pv_b2c_min_qty), pv_b2c_max_qty = VALUES(pv_b2c_max_qty),
          pv_average_rating = VALUES(pv_average_rating), pv_total_rating = VALUES(pv_total_rating),
          pv_trending_score = VALUES(pv_trending_score), pv_m_percentage = VALUES(pv_m_percentage),
          pv_campaign_tag_id = VALUES(pv_campaign_tag_id), pv_created_at = VALUES(pv_created_at),
          pu_base_unit_label = VALUES(pu_base_unit_label), pu_base_unit_multiplier = VALUES(pu_base_unit_multiplier),
          pu_b2b_sales_unit_label = VALUES(pu_b2b_sales_unit_label), pu_b2c_sales_unit_label = VALUES(pu_b2c_sales_unit_label),
          pu_b2c_base_unit_multiplier = VALUES(pu_b2c_base_unit_multiplier), pu_b2b_base_unit_multiplier = VALUES(pu_b2b_base_unit_multiplier),
          pu_b2c_sales_unit_id = VALUES(pu_b2c_sales_unit_id), pu_b2b_sales_unit_id = VALUES(pu_b2b_sales_unit_id),
          pvc_viewed_count = VALUES(pvc_viewed_count), pvc_ordered_count = VALUES(pvc_ordered_count),
          pvc_wishlist_count = VALUES(pvc_wishlist_count), sort_order = VALUES(sort_order)`,
        [
          pvId, pid, nullableNum(v.pv_medicine_id), str(v.pv_sku), num(v.pv_mrp), num(v.pv_b2c_mrp), num(v.pv_b2b_mrp),
          num(v.pv_b2c_price), num(v.pv_b2c_discounted_price), num(v.pv_b2b_price), num(v.pv_b2b_discounted_price), num(v.pv_purchase_price),
          num(v.pv_stock_status), num(v.pv_allow_purchase), num(v.pv_allow_sales), num(v.pv_b2b_discount_percent), num(v.pv_b2c_discount_percent),
          num(v.pv_b2b_min_qty), num(v.pv_b2b_max_qty), num(v.pv_b2c_min_qty), num(v.pv_b2c_max_qty),
          num(v.pv_average_rating), num(v.pv_total_rating), num(v.pv_trending_score), num(v.pv_m_percentage), nullableNum(v.pv_campaign_tag_id),
          v.pv_created_at != null ? str(v.pv_created_at) : null,
          str(v.pu_base_unit_label), num(v.pu_base_unit_multiplier) || 1, str(v.pu_b2b_sales_unit_label), str(v.pu_b2c_sales_unit_label),
          num(v.pu_b2c_base_unit_multiplier) || 1, num(v.pu_b2b_base_unit_multiplier) || 1, nullableNum(v.pu_b2c_sales_unit_id), nullableNum(v.pu_b2b_sales_unit_id),
          num(counts.pvc_viewed_count), num(counts.pvc_ordered_count), num(counts.pvc_wishlist_count), i,
        ]
      )

      // Variant images: small list, cheap to fully replace on every touch
      await conn.query('DELETE FROM product_variant_images WHERE pv_id = ?', [pvId])
      const variantImages = ((v.attachedFiles_pv_images as RawImage[]) ?? []).filter(img => img?.src)
      if (variantImages.length) {
        await conn.query('INSERT INTO product_variant_images (pv_id, src, title, sort_order) VALUES ?', [
          variantImages.map((img, idx) => [pvId, str(img.src), str(img.title), idx]),
        ])
      }
    }

    // Prune variants that no longer exist upstream (cascades to their images)
    if (incomingVariantIds.length) {
      await conn.query('DELETE FROM product_variants WHERE p_id = ? AND pv_id NOT IN (?)', [pid, incomingVariantIds])
    }

    await conn.commit()
    if (result.affectedRows === 1) return 'inserted'
    if (result.affectedRows >= 2) return 'updated'
    return 'skipped'
  } catch (err) {
    await conn.rollback()
    throw err
  }
}

/** Upsert a batch of raw upstream-API product docs with bounded concurrency. */
export async function upsertProducts(
  docs: Record<string, unknown>[],
  concurrency = 5
): Promise<{ inserted: number; updated: number; skipped: number; errors: number }> {
  const pool = getPool()
  let inserted = 0, updated = 0, skipped = 0, errors = 0

  for (let i = 0; i < docs.length; i += concurrency) {
    const chunk = docs.slice(i, i + concurrency)
    const results = await Promise.all(
      chunk.map(async doc => {
        const maxAttempts = 6
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          const conn = await pool.getConnection()
          try {
            return await upsertOne(conn, doc)
          } catch (err) {
            const isDeadlock = (err as { code?: string }).code === 'ER_LOCK_DEADLOCK'
            const pid = doc.p_id ?? doc.id
            if (isDeadlock && attempt < maxAttempts) {
              await new Promise(r => setTimeout(r, 75 * attempt))
              continue
            }
            process.stderr.write(`\n  ✘  p_id=${pid}: ${(err as Error).message}\n`)
            return 'error' as WriteResult
          } finally {
            conn.release()
          }
        }
        return 'error' as WriteResult
      })
    )
    for (const r of results) {
      if (r === 'inserted') inserted++
      else if (r === 'updated') updated++
      else if (r === 'skipped') skipped++
      else errors++
    }
  }

  return { inserted, updated, skipped, errors }
}
