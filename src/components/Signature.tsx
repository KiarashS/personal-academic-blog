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

/**
 * The name, a lift, and then the swash under it.
 *
 * At this size the drawing is close to life size on a desktop screen — 178px is
 * about 4.7cm — and the pen travels 1384 user units through it, 507px or 13.4cm
 * of path. Cursive runs at a few centimetres a second and a signature someone
 * is taking care over is at the slow end of that, so 3.4s puts the hand at
 * 3.9cm/s. The swash is quicker because a flourish is a flick, and the pause
 * between them is the hand lifting.
 */
const NAME_MS = 3400;
const LIFT_MS = 200;
const FLOURISH_MS = 800;

/**
 * The signature, written rather than shown.
 *
 * `.ks-pen` in the drawing is the path a hand would take through the letters —
 * the centreline, traced from the filled glyphs by skeletonising them, one
 * subpath per stroke. It is never drawn. It is the mask the letters are
 * revealed through, stroked wide enough to cover them, and animating its dash
 * offset uncovers the name along the line the pen travels. That is what makes
 * this look like writing rather than a wipe: the glyphs themselves are filled
 * outlines and cannot be drawn stroke-wise at all.
 *
 * It plays when the drawing comes into view and again on a click, and the SVG
 * is inlined so `.ks-glyph` and `.ks-flourish` take their ink from the page's
 * own tokens — loaded as an image it would keep the colour it was drawn in, and
 * a reader who picks dark mode on a light system would get dark ink on a dark
 * page.
 *
 * The markup ships complete, the mask fully open. Nothing is hidden until the
 * effect below hides it, so a reader without JavaScript, or one looking before
 * hydration, sees the name rather than an empty box.
 */
export function Signature() {
  const wrap = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = wrap.current;
    if (!root) return;

    // `.ks-pen` is a mask over filled letterforms; `.ks-stroke` is a letter
    // that is itself a stroke and needs no mask. Both are drawn the same way.
    const pens = [...root.querySelectorAll<SVGPathElement>('.ks-pen, .ks-stroke')];
    const flourish = root.querySelector<SVGPathElement>('.ks-flourish');
    if (pens.length === 0 || !flourish) return;

    // A reader who asks for less motion gets the finished signature.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    /**
     * One stroke per element, rather than one path of nineteen subpaths.
     *
     * A dash pattern restarts at the beginning of every subpath, so a single
     * path holding all of them counts the same offset down in all nineteen
     * places at once and the whole name surfaces together — which is the wipe
     * this exists to replace, only less honest about it. Separate elements,
     * each waiting for the ink before it, put the pen in one place at a time.
     */
    const lengths = pens.map((pen) => pen.getTotalLength());
    const total = lengths.reduce((sum, length) => sum + length, 0) || 1;
    const starts: number[] = [];
    lengths.reduce((run, length, index) => {
      starts[index] = (run / total) * NAME_MS;
      return run + length;
    }, 0);

    let timer = 0;

    const load = (path: SVGPathElement, length: number) => {
      path.style.transition = 'none';
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length);
    };

    const hide = () => {
      window.clearTimeout(timer);
      pens.forEach((pen, index) => {
        load(pen, lengths[index]);
      });
      load(flourish, flourish.getTotalLength());
      // Read the layout back, so the browser starts the next transition from
      // here rather than folding both changes into one frame and showing
      // nothing at all.
      void root.getBoundingClientRect();
    };

    const play = () => {
      hide();

      pens.forEach((pen, index) => {
        const duration = (lengths[index] / total) * NAME_MS;
        pen.style.transition = `stroke-dashoffset ${duration}ms linear ${starts[index]}ms`;
        pen.style.strokeDashoffset = '0';
      });

      // The swash after the hand has lifted off the end of the name.
      timer = window.setTimeout(() => {
        flourish.style.transition = `stroke-dashoffset ${FLOURISH_MS}ms cubic-bezier(.4,.1,.3,1)`;
        flourish.style.strokeDashoffset = '0';
      }, NAME_MS + LIFT_MS);
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
      window.clearTimeout(timer);
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
