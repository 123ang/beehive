import { parse } from "csv-parse/sync";
import * as XLSX from "xlsx";

export interface ParsedRow {
  wallet_address: string;
  email?: string;
  name?: string;
  phone?: string;
}

/**
 * Parse CSV file
 */
export function parseCSV(buffer: Buffer): ParsedRow[] {
  try {
    const records = parse(buffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    return records;
  } catch (error) {
    throw new Error(`Failed to parse CSV: ${error.message}`);
  }
}

/**
 * Parse Excel file (XLSX, XLS)
 */
export function parseExcel(buffer: Buffer): ParsedRow[] {
  try {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    return data as ParsedRow[];
  } catch (error) {
    throw new Error(`Failed to parse Excel: ${error.message}`);
  }
}

/**
 * Validate wallet address format
 */
export function isValidWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

/**
 * Parse file based on extension
 */
export function parseFile(
  buffer: Buffer,
  fileName: string
): ParsedRow[] {
  const extension = fileName.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "csv":
      return parseCSV(buffer);
    case "xlsx":
    case "xls":
      return parseExcel(buffer);
    default:
      throw new Error(`Unsupported file format: ${extension}`);
  }
}

