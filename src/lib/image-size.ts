export interface Dimensions {
  width: number;
  height: number;
}

const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

function png(data: Uint8Array): Dimensions | undefined {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function gif(data: Uint8Array): Dimensions {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  return { width: view.getUint16(6, true), height: view.getUint16(8, true) };
}

function jpeg(data: Uint8Array): Dimensions | undefined {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 2;

  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = data[offset + 1];
    if (SOF.has(marker)) {
      return { height: view.getUint16(offset + 5), width: view.getUint16(offset + 7) };
    }
    // Every other segment carries its length in the two bytes after the marker.
    const length = view.getUint16(offset + 2);
    if (length < 2) return undefined;
    offset += 2 + length;
  }
  return undefined;
}

function webp(data: Uint8Array): Dimensions | undefined {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const chunk = String.fromCharCode(...data.slice(12, 16));

  if (chunk === 'VP8X') {
    const width = 1 + (data[24] | (data[25] << 8) | (data[26] << 16));
    const height = 1 + (data[27] | (data[28] << 8) | (data[29] << 16));
    return { width, height };
  }

  if (chunk === 'VP8 ') {
    return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
  }

  if (chunk === 'VP8L') {
    const bits = view.getUint32(21, true);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }

  return undefined;
}

function svg(text: string): Dimensions | undefined {
  const tag = /<svg\b[^>]*>/i.exec(text)?.[0];
  if (!tag) return undefined;

  const attr = (name: string) => {
    const match = new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i').exec(tag);
    if (!match) return undefined;
    const value = Number.parseFloat(match[1]);
    return Number.isFinite(value) ? value : undefined;
  };

  const width = attr('width');
  const height = attr('height');
  if (width && height) return { width: Math.round(width), height: Math.round(height) };

  const viewBox = /\bviewBox\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
  if (viewBox) {
    const parts = viewBox
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
      return { width: Math.round(parts[2]), height: Math.round(parts[3]) };
    }
  }
  return undefined;
}

const startsWith = (data: Uint8Array, bytes: number[]) =>
  bytes.every((byte, index) => data[index] === byte);

/**
 * Intrinsic dimensions for the image formats a blog actually uses. Deliberately
 * narrow: the point is to set width and height so pages do not reflow while
 * figures load, not to identify arbitrary files.
 */
export function imageSize(data: Uint8Array): Dimensions | undefined {
  if (data.length < 16) return undefined;

  if (startsWith(data, [0x89, 0x50, 0x4e, 0x47])) return png(data);
  if (startsWith(data, [0x47, 0x49, 0x46, 0x38])) return gif(data);
  if (startsWith(data, [0xff, 0xd8])) return jpeg(data);
  if (
    startsWith(data, [0x52, 0x49, 0x46, 0x46]) &&
    startsWith(data.slice(8), [0x57, 0x45, 0x42, 0x50])
  ) {
    return webp(data);
  }

  const head = new TextDecoder().decode(data.slice(0, 2048));
  if (head.includes('<svg')) return svg(new TextDecoder().decode(data));

  return undefined;
}
