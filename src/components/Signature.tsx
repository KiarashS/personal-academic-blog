import { useEffect, useRef } from 'react';
import signatureSource from '../content/signature-script.svg?raw';
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
 * At this size the drawing is close to life size on a desktop screen — 176px is
 * about 4.7cm — and the pen travels 1639 user units through it, 612px or 16.2cm
 * of path, because cursive doubles back on itself and the width is not the
 * distance. Handwriting runs at a few centimetres a second and a signature
 * someone is taking care over is at the slow end of that, so 4.2s puts the hand
 * at 3.9cm/s. The swash is quicker because a flourish is a flick, and the pause
 * between them is the hand lifting.
 */
const NAME_MS = 4200;
const LIFT_MS = 200;
const FLOURISH_MS = 800;

/**
 * The signature, written rather than shown.
 *
 * The letters in `signature-script.svg` are pen strokes — `.ks-stroke` — so the
 * drawing already holds the line a hand would take through them and animating
 * their dash offsets writes the name in the order it was written. That is what
 * makes this look like writing rather than a wipe.
 *
 * The alternative in the repo, `signature.svg`, is a traced signature: filled
 * outlines, which cannot be drawn stroke-wise at all, so it carries a separate
 * centreline in `.ks-pen` and is revealed through it as a mask. Both classes
 * are animated the same way here, which is what makes the two files swappable
 * by changing the import above and nothing else.
 *
 * It plays when the drawing comes into view and again on a click, and the SVG
 * is inlined so the ink comes from the page's own tokens — loaded as an image
 * it would keep the colour it was drawn in, and a reader who picks dark mode on
 * a light system would get dark ink on a dark page.
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
