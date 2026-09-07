import { useEffect, useRef } from 'react';
import signatureSource from '../content/signature.svg?raw';
import { siteConfig } from '../site.config';

/**
 * The file is stored exactly as it is published, `role="img"` included, which
 * axe reports as an image with no alternative text. The name belongs on the
 * wrapper, which is what a screen reader announces, so the inner element is
 * hidden from the accessibility tree here rather than by editing the drawing.
 */
const markup = signatureSource.replace('role="img"', 'aria-hidden="true" focusable="false"');

/** Ease in and out, as the original does: slow at both ends of the stroke. */
const ease = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

const GLYPH_MS = 2600;
const FLOURISH_MS = 820;

/** A little air around each glyph, so the sweep never clips its own edge. */
const PAD = 7;

/**
 * The signature, written rather than shown: a vertical front sweeps left to
 * right and each letter's clip rectangle opens as it passes, then the flourish
 * underneath draws itself in. It is the same shape of animation the original
 * uses, at the same durations.
 *
 * It plays when the drawing comes into view and again on a click, and the SVG
 * is inlined so `.ks-glyph` and `.ks-flourish` take their ink from the page's
 * own tokens — loaded as an image it would keep the colour it was drawn in, and
 * a reader who picks dark mode on a light system would get dark ink on a dark
 * page.
 *
 * The markup ships complete. Nothing is hidden until the effect below hides it,
 * so a reader without JavaScript, or one looking before hydration, sees the
 * name rather than an empty box.
 */
export function Signature() {
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = wrap.current;
    if (!root) return;

    const glyphs = [...root.querySelectorAll<SVGGraphicsElement>('.ks-glyph')];
    const clips = [...root.querySelectorAll<SVGRectElement>('clipPath > rect')];
    const flourish = root.querySelector<SVGPathElement>('.ks-flourish');
    if (glyphs.length === 0 || clips.length < glyphs.length || !flourish) return;

    // A reader who asks for less motion gets the finished signature.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let frame = 0;

    const hide = () => {
      for (const rect of clips) rect.setAttribute('width', '0');
      const length = flourish.getTotalLength();
      flourish.style.transition = 'none';
      flourish.style.strokeDasharray = String(length);
      flourish.style.strokeDashoffset = String(length);
    };

    const play = () => {
      cancelAnimationFrame(frame);
      hide();

      const boxes = glyphs.map((glyph) => glyph.getBBox());
      const from = Math.min(...boxes.map((box) => box.x)) - PAD;
      const to = Math.max(...boxes.map((box) => box.x + box.width)) + PAD;
      const start = performance.now();

      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / GLYPH_MS);
        const front = from + (to - from) * ease(progress);

        boxes.forEach((box, index) => {
          const rect = clips[index];
          rect.setAttribute('x', String(box.x - PAD));
          rect.setAttribute('y', String(box.y - PAD));
          rect.setAttribute('height', String(box.height + PAD * 2));
          const width = Math.min(box.width + PAD * 2, front - (box.x - PAD));
          rect.setAttribute('width', String(Math.max(0, width)));
        });

        if (progress < 1) {
          frame = requestAnimationFrame(step);
          return;
        }

        flourish.style.transition = `stroke-dashoffset ${FLOURISH_MS}ms cubic-bezier(.4,.1,.3,1)`;
        flourish.style.strokeDashoffset = '0';
      };

      frame = requestAnimationFrame(step);
    };

    hide();
    root.addEventListener('click', play);

    // Play once it is on screen. On the front page that is immediately, but the
    // observer costs nothing and covers a reader who arrives scrolled down.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.disconnect();
          play();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(root);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      root.removeEventListener('click', play);
    };
  }, []);

  return (
    <span
      aria-label={siteConfig.title}
      className="banner__signature"
      dangerouslySetInnerHTML={{ __html: markup }}
      ref={wrap}
      role="img"
      style={{ transform: `rotate(${siteConfig.home.signatureTilt}deg)` }}
    />
  );
}
