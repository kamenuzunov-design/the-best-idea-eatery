/**
 * CSV Utilities for robust Import and Export with 5-language support.
 * Correctly handles:
 * - UTF-8 BOM (\uFEFF)
 * - Escaped quotes ("")
 * - Embedded newlines inside quoted strings (\n, \r\n)
 * - Trailing empty lines
 */

/**
 * Parses raw CSV text into a 2D array of rows and columns.
 * Handles embedded newlines and escaped quotes properly.
 * 
 * @param {string} text 
 * @returns {string[][]} Array of row arrays
 */
export function parseCSV(text) {
  if (!text || typeof text !== 'string') return [];
  const clean = text.replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let cur = '';
  let inQuote = false;

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === '"') {
      if (inQuote && clean[i + 1] === '"') {
        cur += '"';
        i++; // skip escaped quote
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === ',' && !inQuote) {
      row.push(cur);
      cur = '';
    } else if ((ch === '\r' || ch === '\n') && !inQuote) {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(cur);
      if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
        rows.push(row);
      }
      row = [];
      cur = '';
    } else {
      cur += ch;
    }
  }

  if (cur || row.length > 0) {
    row.push(cur);
    if (row.length > 1 || (row.length === 1 && row[0].trim() !== '')) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Escapes a single CSV field.
 * 
 * @param {any} value 
 * @returns {string}
 */
export function escapeCSVField(value) {
  const s = String(value ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

/**
 * Formats headers and row arrays into a UTF-8 BOM CSV string ready for download.
 * 
 * @param {string[]} headers 
 * @param {any[][]} rows 
 * @returns {string}
 */
export function formatCSV(headers, rows) {
  const headerLine = headers.map(escapeCSVField).join(',');
  const rowLines = rows.map(r => r.map(escapeCSVField).join(','));
  return '\uFEFF' + [headerLine, ...rowLines].join('\n');
}

/**
 * Triggers a browser download of a CSV file.
 * 
 * @param {string} filename 
 * @param {string} csvContent 
 */
export function downloadCSV(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
