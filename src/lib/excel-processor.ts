import * as XLSX from "xlsx";

export const REQUIRED_COLUMNS = [
  "NOMBRE DEL PRODUCTO EN CHINO",
  "CANTIDAD",
  "PESO NETO",
  "PRECIO UNITARIO",
] as const;

export type RawRow = Record<string, unknown>;

export interface GroupedRow {
  "NUMERO DE ORDEN DE TRANSFERENCIA": string;
  "NOMBRE DEL PRODUCTO EN CHINO": string;
  "CANTIDAD TOTAL": number;
  "PESO NETO TOTAL": number;
  "PRECIO UNITARIO TOTAL": number;
  "REGISTROS AGRUPADOS": number;
}

export interface ProcessResult {
  blob: Blob;
  fileName: string;
  totalRows: number;
  groupedRows: number;
}

function normalizeKey(k: string) {
  return k.replace(/\s+/g, " ").trim().toUpperCase();
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const cleaned = v.replace(/[, ]/g, "").replace(/[^\d.\-]/g, "");
    const n = parseFloat(cleaned);
    return isFinite(n) ? n : 0;
  }
  return 0;
}

export function readWorkbook(data: ArrayBuffer): XLSX.WorkBook {
  return XLSX.read(data, { type: "array" });
}

export function validateColumns(rows: RawRow[]): { ok: boolean; missing: string[] } {
  if (!rows.length) return { ok: false, missing: [...REQUIRED_COLUMNS] };
  const keys = new Set(Object.keys(rows[0]).map(normalizeKey));
  const missing = REQUIRED_COLUMNS.filter((c) => !keys.has(normalizeKey(c)));
  return { ok: missing.length === 0, missing };
}

export function groupRows(rows: RawRow[]): GroupedRow[] {
  const map = new Map<string, GroupedRow>();
  // acumulamos los números de orden únicos por producto
  const orderSets = new Map<string, Set<string>>();
  for (const row of rows) {
    // Locate values via case/space-insensitive keys
    const keyMap: Record<string, string> = {};
    for (const k of Object.keys(row)) keyMap[normalizeKey(k)] = k;

    const name = String(row[keyMap[normalizeKey("NOMBRE DEL PRODUCTO EN CHINO")]] ?? "").trim();
    if (!name) continue;
    const qty = toNumber(row[keyMap[normalizeKey("CANTIDAD")]]);
    const weight = toNumber(row[keyMap[normalizeKey("PESO NETO")]]);
    const price = toNumber(row[keyMap[normalizeKey("PRECIO UNITARIO")]]);

    // Buscar el número de orden con tolerancia a variaciones del encabezado
    const orderKey =
      keyMap[normalizeKey("NUMERO DE ORDEN DE TRANSFERENCIA")] ??
      keyMap[normalizeKey("NÚMERO DE ORDEN DE TRANSFERENCIA")] ??
      keyMap[normalizeKey("NO DE ORDEN DE TRANSFERENCIA")] ??
      keyMap[normalizeKey("N° DE ORDEN DE TRANSFERENCIA")] ??
      keyMap[normalizeKey("ORDEN DE TRANSFERENCIA")];
    const orderValue = orderKey ? String(row[orderKey] ?? "").trim() : "";

    if (!orderSets.has(name)) orderSets.set(name, new Set());
    if (orderValue) orderSets.get(name)!.add(orderValue);

    const existing = map.get(name);
    if (existing) {
      existing["CANTIDAD TOTAL"] += qty;
      existing["PESO NETO TOTAL"] += weight;
      existing["PRECIO UNITARIO TOTAL"] += price;
      existing["REGISTROS AGRUPADOS"] += 1;
    } else {
      map.set(name, {
        "NUMERO DE ORDEN DE TRANSFERENCIA": "",
        "NOMBRE DEL PRODUCTO EN CHINO": name,
        "CANTIDAD TOTAL": qty,
        "PESO NETO TOTAL": weight,
        "PRECIO UNITARIO TOTAL": price,
        "REGISTROS AGRUPADOS": 1,
      });
    }
  }
  // Inyectar los números de orden únicos (separados por coma) por cada grupo
  for (const [name, group] of map.entries()) {
    const orders = Array.from(orderSets.get(name) ?? []);
    group["NUMERO DE ORDEN DE TRANSFERENCIA"] = orders.join(", ");
  }
  return Array.from(map.values());
}

export function buildOutput(originalSheet: XLSX.WorkSheet, grouped: GroupedRow[]): Blob {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, originalSheet, "DATOS_ORIGINALES");
  const groupedSheet = XLSX.utils.json_to_sheet(grouped);
  XLSX.utils.book_append_sheet(wb, groupedSheet, "RESUMEN_AGRUPADO");
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return new Blob([out], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function todayFileName(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}_AGRUPADO.xlsx`;
}

export async function processExcelFile(file: File): Promise<ProcessResult> {
  const buffer = await file.arrayBuffer();
  const wb = readWorkbook(buffer);
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) throw new Error("El archivo no contiene hojas");
  const sheet = wb.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: "" });

  const { ok, missing } = validateColumns(rows);
  if (!ok) {
    throw new Error(
      `Error de consistencia en datos. Faltan columnas: ${missing.join(", ")}`
    );
  }

  const grouped = groupRows(rows);
  const blob = buildOutput(sheet, grouped);
  return {
    blob,
    fileName: todayFileName(),
    totalRows: rows.length,
    groupedRows: grouped.length,
  };
}