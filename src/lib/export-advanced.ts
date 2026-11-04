import * as XLSX from 'xlsx'
import { Product } from '@/types/product'
import { analyse, bdt, pct, mgClass } from './pricing'

export interface ExportOptions {
  filename?: string
  includeAnalysis?: boolean
}

export async function exportAllProductsToXLSX(
  filters: { query?: string; brand?: string },
  onProgress?: (current: number, total: number) => void
) {
  const {
    query = '',
    brand = '',
  } = filters

  // Step 1: Get total count
  const params = new URLSearchParams()
  if (query) params.set('_search', query)
  if (brand) params.set('_brand', brand)

  const countRes = await fetch(`/api/search?${params}&_page=1&_perPage=1`)
  if (!countRes.ok) {
    throw new Error(`Failed to fetch product count: ${countRes.statusText}`)
  }
  const countJson = await countRes.json()
  const total = countJson.total || 0

  if (total === 0) {
    throw new Error('No products found to export')
  }

  // Step 2: Fetch all products in chunks
  const allProducts: Product[] = []
  const perPage = 100 // Fetch 100 at a time
  const totalPages = Math.ceil(total / perPage)

  for (let page = 1; page <= totalPages; page++) {
    const pageParams = new URLSearchParams()
    if (query) pageParams.set('_search', query)
    if (brand) pageParams.set('_brand', brand)
    pageParams.set('_page', String(page))
    pageParams.set('_perPage', String(perPage))

    const res = await fetch(`/api/search?${pageParams}`)
    if (!res.ok) {
      throw new Error(`Failed to fetch products page ${page}: ${res.statusText}`)
    }
    const json = await res.json()
    allProducts.push(...(json.data || []))

    if (onProgress) {
      onProgress(allProducts.length, total)
    }
  }

  // Step 3: Prepare data rows
  const rows = allProducts.map((p) => {
    const analysis = analyse(p)
    const variant = p.pv?.[0]

    const row: Record<string, string | number | boolean> = {
      'Product ID': p.p_id,
      'Product Name': p.p_name,
      Brand: p.p_brand_name || p.p_brand || '',
      'Generic Name': p.p_generic_name || '',
      Type: p.p_type || '',
      'List Price (BDT)': analysis.mrp || 0,
      'B2B Price (BDT)': analysis.b2b || 0,
      'B2C Price (BDT)': analysis.b2c || 0,
      'Cost (BDT)': analysis.cost || 0,
      'B2B Margin %': pct(analysis.mgB2b),
      'Profit/Unit (BDT)': bdt(analysis.profitB2b),
      'Margin Class': mgClass(analysis.mgB2b).toUpperCase(),
      'In Stock': analysis.inStock ? 'Yes' : 'No',
    }

    if (variant) {
      row['SKU'] = variant.pv_sku || ''
      row['Unit'] = variant.pu_b2b_sales_unit_label || variant.pu_base_unit_label || ''
    }

    if (p.productCountOrdered) {
      row['Times Ordered'] = p.productCountOrdered
    }

    return row
  })

  // Step 4: Create workbook
  const ws = XLSX.utils.json_to_sheet(rows)

  // Set column widths
  const columnWidths = [
    { wch: 12 }, // Product ID
    { wch: 30 }, // Product Name
    { wch: 15 }, // Brand
    { wch: 20 }, // Generic Name
    { wch: 12 }, // Type
    { wch: 14 }, // List Price
    { wch: 14 }, // B2B Price
    { wch: 14 }, // B2C Price
    { wch: 12 }, // Cost
    { wch: 12 }, // B2B Margin %
    { wch: 16 }, // Profit/Unit
    { wch: 12 }, // Margin Class
    { wch: 10 }, // In Stock
    { wch: 14 }, // SKU
    { wch: 12 }, // Unit
    { wch: 12 }, // Times Ordered
  ]

  ws['!cols'] = columnWidths

  // Style header row
  const headerRange = XLSX.utils.decode_range(ws['!ref'] || 'A1')
  for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
    const address = XLSX.utils.encode_col(C) + '1'
    if (!ws[address]) continue
    ws[address].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1f2937' } },
      alignment: { horizontal: 'center', vertical: 'center' },
    }
  }

  // Create workbook
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Products')

  // Add metadata sheet
  const metaSheet = XLSX.utils.aoa_to_sheet([
    ['Export Metadata'],
    ['Export Date', new Date().toLocaleString()],
    ['Total Products', allProducts.length],
    ...(query ? [['Search Query', query]] : []),
    ...(brand ? [['Brand Filter', brand]] : []),
  ])
  XLSX.utils.book_append_sheet(wb, metaSheet, 'Metadata')

  // Step 5: Write file
  const filename = `products-export-all-${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, filename)
}
