// The rows of a chart's data, for the table under it and for the crosshair's
// list of series. Node only: it uses Vega's own CSV reader, which the page
// should not have to load to show a drawing.

import { read } from 'vega';

/** The first data source in the spec, as rows, or undefined if it has none to read. */
export function rowsOf(spec) {
  const find = (node) => {
    if (!node || typeof node !== 'object') return undefined;
    if (node.data && 'values' in node.data) return node.data;
    for (const key of ['layer', 'concat', 'hconcat', 'vconcat']) {
      if (Array.isArray(node[key])) {
        for (const child of node[key]) {
          const found = find(child);
          if (found) return found;
        }
      }
    }
    return node.spec ? find(node.spec) : undefined;
  };
  const data = find(spec);
  if (!data) return undefined;
  const rows =
    typeof data.values === 'string'
      ? read(data.values, { type: data.format?.type ?? 'csv', parse: 'auto' })
      : data.values;
  if (!Array.isArray(rows) || rows.length === 0 || typeof rows[0] !== 'object') return undefined;
  return rows;
}
