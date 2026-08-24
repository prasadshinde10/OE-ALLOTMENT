/**
 * Client-side CSV export utility.
 * Handles proper escaping of commas, quotes, and newlines in field values.
 */

export interface CsvColumn<T = any> {
  header: string;
  key: string;
  transform?: (value: any, row: T) => string;
}

export interface CsvExportOptions<T = any> {
  filename?: string;
  columns: CsvColumn<T>[];
}

function escapeCSVField(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If the field contains a comma, double-quote, or newline, wrap in quotes and escape inner quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCSV<T = any>(data: T[], options: CsvExportOptions<T>): void {
  if (!data || data.length === 0) {
    throw new Error('No data available to export');
  }

  const { columns, filename } = options;

  // Build header row
  const headerRow = columns.map((col) => escapeCSVField(col.header)).join(',');

  // Build data rows
  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const rawValue = (row as any)[col.key];
        const value = col.transform ? col.transform(rawValue, row) : rawValue;
        return escapeCSVField(value);
      })
      .join(',')
  );

  const csvContent = [headerRow, ...dataRows].join('\n');

  // Generate timestamped filename
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const defaultFilename = filename
    ? `${filename}_${dateStr}.csv`
    : `export_${dateStr}.csv`;

  // Trigger browser download
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel compatibility
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', defaultFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
