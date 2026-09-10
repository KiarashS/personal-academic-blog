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

/** The name, and then the swash under it. Together a shade over two seconds. */
const NAME_MS = 1500;
const FLOURISH_MS = 600;

/**
 * How much of a glyph is still going when the next one starts. Nothing joins up
 * at 0 — each letter waits its turn like a slide — and at 1 they all run at
 * once, which is the wipe this replaced.
 */
const OVERLAP = 0.35;

/**
 * How much of a glyph's time comes from how much ink it has, the rest split
 * evenly. Pure ink gives the K, which is a third of the drawing's width, a
 * third of the runtime while six letters share the rest; pure evenness gives a
 * one-stroke `i` as long as a looping `a`. Between the two reads as writing.
 */
const INK_WEIGHT = 0.65;

/** A little air around each glyph, so the sweep never clips its own edge. */
const PAD = 7;

/**
 * The signature, written rather than shown: each letter's clip rectangle opens
 * across its own width in turn, one starting before the last has finished, and
 * then the flourish underneath draws itself in.
 *
 * A letter at a time, rather than one front crossing the whole drawing. The
 * front is what the original does and it distributes the time by width, so the
 * K — 170 of the 456 units — took 1.12s of a 2.6s animation on its own while
 * the six letters after it shared 750ms. A curtain crossing 62px of one letter
 * is legible as a curtain; crossing the 14 to 22px each of the rest, it is not,
 * and the letters simply appear in the order a hand would make them.
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

    /** When each glyph starts and how long it takes, in milliseconds. */
    const schedule = () => {
      // The outline's length stands in for how much ink the letter is. It is
      // the contour rather than a pen path, since these glyphs are filled
      // shapes, but it ranks them the way an eye does.
      const ink = glyphs.map((glyph) =>
        'getTotalLength' in glyph ? (glyph as SVGPathElement).getTotalLength() : 1,
      );
      const total = ink.reduce((sum, length) => sum + length, 0) || 1;
      const even = 1 / glyphs.length;
      const shares = ink.map((length) => INK_WEIGHT * (length / total) + (1 - INK_WEIGHT) * even);

      // Laid out in shares first, then scaled so the last one lands on NAME_MS.
      const starts: number[] = [];
      let cursor = 0;
      shares.forEach((share, index) => {
        starts[index] = cursor;
        cursor += share * (1 - OVERLAP);
      });
      const span = starts[starts.length - 1] + shares[shares.length - 1];
      const scale = NAME_MS / span;

      return shares.map((share, index) => ({
        start: starts[index] * scale,
        duration: share * scale,
      }));
    };

    const play = () => {
      cancelAnimationFrame(frame);
      hide();

      const boxes = glyphs.map((glyph) => glyph.getBBox());
      const timing = schedule();
      const start = performance.now();
      let drawn = false;

      const step = (now: number) => {
        const elapsed = now - start;

        boxes.forEach((box, index) => {
          const { start: begins, duration } = timing[index];
          const progress = Math.min(1, Math.max(0, (elapsed - begins) / duration));
          const rect = clips[index];
          rect.setAttribute('x', String(box.x - PAD));
          rect.setAttribute('y', String(box.y - PAD));
          rect.setAttribute('height', String(box.height + PAD * 2));
          rect.setAttribute('width', String((box.width + PAD * 2) * ease(progress)));
        });

        // The swash follows the hand off the end of the name, so it is started
        // as the last letter finishes rather than after a pause.
        if (!drawn && elapsed >= NAME_MS) {
          drawn = true;
          flourish.style.transition = `stroke-dashoffset ${FLOURISH_MS}ms cubic-bezier(.4,.1,.3,1)`;
          flourish.style.strokeDashoffset = '0';
        }

        if (elapsed < NAME_MS) frame = requestAnimationFrame(step);
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
