import type { CellObject, WorkSheet } from "xlsx"

import { categorySummary } from "@/data/aggregate"
import type { CategoryIndex } from "@/data/categories"
import type { DashboardData, Review, SummaryRow } from "@/data/types"
import { EXPORT_CONFIG, type ExportColumn } from "@/export-config"

type Row = Record<string, unknown>

const MAX_CELL_TEXT = 32_767

export interface ExportRequest {
  data: DashboardData
  categories: CategoryIndex
  reviews: Review[]
  /** false = use data.summary as is (the "All reviews" export). */
  recomputeSummary: boolean
}

export function exportFileName(appId: string, now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  const day = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return `${appId}_reviews_${day}.xlsx`
}

/** Builds the workbook described by EXPORT_CONFIG and returns xlsx bytes. */
export async function buildWorkbook(req: ExportRequest): Promise<Uint8Array> {
  const XLSX = await import("xlsx")
  const { data, categories } = req
  const summary: SummaryRow[] = req.recomputeSummary
    ? categorySummary(req.reviews)
    : data.summary
  const label = (id: string) => categories.get(id).label

  const wb = XLSX.utils.book_new()
  const frozen: number[] = []
  EXPORT_CONFIG.forEach((sheet, index) => {
    const columns = sheet.columns.filter((c) => c.requires !== "keep_user_names" || data.meta.keep_user_names)
    const rows: Row[] =
      sheet.source === "reviews"
        ? req.reviews.map((r) => ({ ...r, category_label: label(r.primary_category) }))
        : summary.map((s) => ({ ...s, category_label: label(s.category) }))
    const ws = buildSheet(XLSX.utils.encode_cell, columns, rows)
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31))
    if (sheet.freezeHeader) frozen.push(index + 1)
  })

  const bytes = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer
  if (!frozen.length) return new Uint8Array(bytes)
  return freezeHeaderRows(XLSX.CFB, new Uint8Array(bytes), frozen)
}

export async function downloadWorkbook(req: ExportRequest, fileName: string) {
  const bytes = await buildWorkbook(req)
  const blob = new Blob([bytes as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

function buildSheet(
  encodeCell: (c: { r: number; c: number }) => string,
  columns: ExportColumn[],
  rows: Row[],
): WorkSheet {
  const ws: WorkSheet = {}
  columns.forEach((col, c) => {
    ws[encodeCell({ r: 0, c })] = { t: "s", v: col.header }
  })
  rows.forEach((row, i) => {
    const r = i + 1
    columns.forEach((col, c) => {
      const cell = toCell(row[col.key], col)
      if (cell) ws[encodeCell({ r, c })] = cell
    })
  })
  const lastCol = encodeCell({ r: rows.length, c: Math.max(columns.length - 1, 0) })
  ws["!ref"] = `A1:${lastCol}`
  ws["!cols"] = columns.map((c) => ({ wch: c.width }))
  ws["!autofilter"] = { ref: `A1:${lastCol}` }
  return ws
}

function toCell(value: unknown, col: ExportColumn): CellObject | null {
  if (value === null || value === undefined || value === "") return null
  if (col.type === "date") {
    const t = typeof value === "string" ? Date.parse(value) : Number.NaN
    if (Number.isNaN(t)) return { t: "s", v: String(value) }
    return { t: "n", v: t / 86_400_000 + 25_569, z: "yyyy-mm-dd hh:mm:ss" }
  }
  if (typeof value === "number") return { t: "n", v: value }
  if (typeof value === "boolean") return { t: "b", v: value }
  const text = Array.isArray(value) ? value.join(";") : String(value)
  if (!text) return null
  return { t: "s", v: text.length > MAX_CELL_TEXT ? text.slice(0, MAX_CELL_TEXT) : text }
}

type Cfb = typeof import("xlsx").CFB

/**
 * SheetJS Community Edition cannot write frozen panes, so patch the sheet XML
 * inside the zip: add a frozen pane below row 1 to each listed sheet.
 */
function freezeHeaderRows(CFB: Cfb, bytes: Uint8Array, sheetNumbers: number[]): Uint8Array {
  const zip = CFB.read(bytes, { type: "array" })
  for (const n of sheetNumbers) {
    const idx = zip.FullPaths.findIndex((p: string) => p.endsWith(`xl/worksheets/sheet${n}.xml`))
    const entry = idx >= 0 ? zip.FileIndex[idx] : undefined
    if (!entry?.content) continue
    const xml = new TextDecoder().decode(entry.content as Uint8Array)
    const patched = xml.replace(
      /<sheetView ([^>]*?)\/>/,
      '<sheetView $1><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView>',
    )
    const content = new TextEncoder().encode(patched)
    entry.content = content
    entry.size = content.length
  }
  const out = CFB.write(zip, { fileType: "zip", type: "array", compression: true }) as ArrayBuffer | number[]
  return out instanceof ArrayBuffer ? new Uint8Array(out) : Uint8Array.from(out)
}
