import * as XLSX from 'xlsx'
import { Product } from '@/types/product'
import { analyse, bdt, pct, mgClass } from './pricing'

export interface ExportOptions {
  filename?: string
  includeAnalysis?: boolean
}

export function exportToXLSX(
  products: Product[],
  filters: { query?: string; brand?: string; category?: string },
  options: ExportOptions = {}
) {
  const {
    filename = `products-export-${new Date().toISOString().split('T')[0]}.xlsx`,
    includeAnalysis = true,
  } = options

  // Prepare data rows
  const rows = products.map((p) => {
    const analysis = includeAnalysis ? analyse(p) : null
    const variant = p.pv?.[0]
    const row: Record<string, string | number> = {
      'Product ID': p.p_id,
      'Product Name': p.p_name,
      Brand: p.p_brand_name || p.p_brand || '',
      Category: p.p_cat_id,
      'Generic Name': p.p_generic_name || '',
      Type: p.p_type || '',
    }

    if (includeAnalysis && analysis) {
      row['List Price (BDT)'] = analysis.mrp || 0
      row['B2B Price (BDT)'] = analysis.b2b || 0
      row['B2C Price (BDT)'] = analysis.b2c || 0
      row['Cost (BDT)'] = analysis.cost || 0
      row['B2B Margin %'] = pct(analysis.mgB2b)
      row['Profit/Unit (BDT)'] = bdt(analysis.profitB2b)
      row['Margin Class'] = mgClass(analysis.mgB2b).toUpperCase()
      row['In Stock'] = analysis.inStock ? 'Yes' : 'No'
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

  // Create worksheet
  const ws = XLSX.utils.json_to_sheet(rows)

  // Set column widths
  const columnWidths = [
    { wch: 12 }, // Product ID
    { wch: 30 }, // Product Name
    { wch: 15 }, // Brand
    { wch: 10 }, // Category
    { wch: 20 }, // Generic Name
    { wch: 12 }, // Type
  ]

  if (includeAnalysis) {
    columnWidths.push(
      { wch: 14 }, // List Price
      { wch: 14 }, // B2B Price
      { wch: 14 }, // B2C Price
      { wch: 12 }, // Cost
      { wch: 12 }, // B2B Margin %
      { wch: 16 }, // Profit/Unit
      { wch: 12 }, // Margin Class
      { wch: 10 } // In Stock
    )
  }

  // Add SKU and Unit columns
  columnWidths.push(
    { wch: 14 }, // SKU
    { wch: 12 } // Unit
  )

  if (products.some((p) => p.productCountOrdered)) {
    columnWidths.push({ wch: 12 }) // Times Ordered
  }

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
    ['Total Products', products.length],
    ...(filters.query ? [['Search Query', filters.query]] : []),
    ...(filters.brand ? [['Brand Filter', filters.brand]] : []),
    ...(filters.category ? [['Category Filter', filters.category]] : []),
  ])
  XLSX.utils.book_append_sheet(wb, metaSheet, 'Metadata')

  // Write file
  XLSX.writeFile(wb, filename)
}
