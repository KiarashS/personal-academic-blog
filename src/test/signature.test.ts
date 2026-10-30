import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { signatureDrawing, signaturePath } from '../../plugins/signature';
import { beadFor } from '../lib/signature-glass';
import { siteConfig } from '../site.config';

const svg = (attrs: string) => `<svg ${attrs} xmlns="http://www.w3.org/2000/svg" role="img"></svg>`;

describe('signatureDrawing', () => {
  it('takes the ratio from the viewBox and the baseline as y=0 by default', () => {
    const drawing = signatureDrawing(svg('viewBox="-38.4 -230.51 596 346.01"'));
    expect(drawing.ratio).toBe(0.5806);
    expect(drawing.descent).toBe(0.3338);
  });

  it('measures the descent from data-baseline when the file gives one', () => {
    const drawing = signatureDrawing(svg('data-baseline="150" viewBox="0 50 400 200"'));
    expect(drawing.ratio).toBe(0.5);
    expect(drawing.descent).toBe(0.5);
  });

  it('hides the drawing itself from a screen reader, which reads the wrapper', () => {
    const { markup } = signatureDrawing(svg('viewBox="0 0 10 10"'));
    expect(markup).toContain('aria-hidden="true" focusable="false"');
    expect(markup).not.toContain('role="img"');
  });

  it('refuses a file it cannot size', () => {
    expect(() => signatureDrawing('<path/>', 'x.svg')).toThrow(/no <svg>/);
    expect(() => signatureDrawing(svg('viewBox="0 0 0 10"'), 'x.svg')).toThrow(/viewBox/);
    expect(() => signatureDrawing(svg('width="10"'), 'x.svg')).toThrow(/viewBox/);
    expect(() => signatureDrawing(svg('viewBox="0 0 1 1" data-baseline="low"'), 'x.svg')).toThrow(
      /data-baseline/,
    );
  });
});

describe('signaturePath', () => {
  it('finds each of the three drawings the repo carries, and each can be sized', () => {
    for (const file of ['signature-typeset.svg', 'signature-script.svg', 'signature.svg']) {
      const drawing = signatureDrawing(readFileSync(signaturePath(file), 'utf8'), file);
      expect(drawing.ratio).toBeGreaterThan(0);
      expect(drawing.descent).toBeGreaterThanOrEqual(0);
      expect(drawing.descent).toBeLessThan(1);
    }
  });

  it('accepts the configured file', () => {
    expect(() => signaturePath(siteConfig.home.signatureFile)).not.toThrow();
  });

  it('names the choices when the file is not there, and stays inside src/content', () => {
    expect(() => signaturePath('signature-missing.svg')).toThrow(
      /signature-missing\.svg.*signature-script\.svg.*signature-typeset\.svg/,
    );
    expect(() => signaturePath('../../package.json')).toThrow(/not an SVG in src\/content/);
    expect(() => signaturePath('logo.txt')).toThrow(/not an SVG/);
  });
});

describe('the glass bead', () => {
  it('sits left of the letter top and rises above it, with the top inside the lens', () => {
    const top = { x: 100, y: -120 };
    const bead = beadFor(top, 100);
    expect(bead.r).toBeCloseTo(26);
    expect(bead.x).toBeLessThan(top.x);
    expect(bead.y - bead.r).toBeLessThan(top.y);
    expect(Math.hypot(top.x - bead.x, top.y - bead.y)).toBeLessThan(bead.r);
  });
});
