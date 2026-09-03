import { describe, expect, it } from 'vitest';
import { imageSize } from '../lib/image-size';

function png(width: number, height: number): Uint8Array {
  const data = new Uint8Array(32);
  data.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const view = new DataView(data.buffer);
  view.setUint32(16, width);
  view.setUint32(20, height);
  return data;
}

function gif(width: number, height: number): Uint8Array {
  const data = new Uint8Array(16);
  data.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
  const view = new DataView(data.buffer);
  view.setUint16(6, width, true);
  view.setUint16(8, height, true);
  return data;
}

function jpeg(width: number, height: number): Uint8Array {
  // SOI, then an APP0 segment to skip, then SOF0 carrying the dimensions.
  const data = new Uint8Array(32);
  const view = new DataView(data.buffer);
  data.set([0xff, 0xd8], 0);
  data.set([0xff, 0xe0], 2);
  view.setUint16(4, 6); // APP0 length, including these two bytes
  data.set([0xff, 0xc0], 10);
  view.setUint16(12, 17);
  view.setUint16(15, height);
  view.setUint16(17, width);
  return data;
}

describe('imageSize', () => {
  it('reads PNG', () => {
    expect(imageSize(png(1200, 630))).toEqual({ width: 1200, height: 630 });
  });

  it('reads GIF', () => {
    expect(imageSize(gif(64, 48))).toEqual({ width: 64, height: 48 });
  });

  it('reads JPEG, skipping segments before the frame header', () => {
    expect(imageSize(jpeg(800, 600))).toEqual({ width: 800, height: 600 });
  });

  it('reads SVG width and height attributes', () => {
    const svg = new TextEncoder().encode('<svg width="320" height="240" xmlns="http://x"></svg>');
    expect(imageSize(svg)).toEqual({ width: 320, height: 240 });
  });

  it('falls back to the SVG viewBox', () => {
    const svg = new TextEncoder().encode('<svg viewBox="0 0 100 50" xmlns="http://x"></svg>');
    expect(imageSize(svg)).toEqual({ width: 100, height: 50 });
  });

  it('returns nothing for a format it does not know', () => {
    expect(imageSize(new Uint8Array(64))).toBeUndefined();
    expect(imageSize(new Uint8Array(4))).toBeUndefined();
  });
});
