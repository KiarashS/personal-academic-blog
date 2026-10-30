import { useEffect, useRef } from 'react';
import { descent, markup, ratio } from 'virtual:signature';
import { addGlass } from '../lib/signature-glass';
import { siteConfig } from '../site.config';

// One object for the life of the page; see src/lib/inner-html.ts. The markup is
// the file `home.signatureFile` names, read by plugins/signature.ts.
const inner = { __html: markup };

/**
 * The name, a lift, and then the swash under it.
 *
 * This timing is for a drawing without a timetable of its own (see below), and
 * is worked out for `signature-typeset.svg`, the previous default. At this
 * size the drawing is close to life size on a desktop screen — 176px is
 * about 4.7cm — and the pen lays down 2347 user units of ink, 693px or 18.3cm
 * of it, because script doubles back on itself and the width is not the
 * distance. Handwriting runs at a few centimetres a second and a signature
 * someone is taking care over is at the slow end of that, so 3.9cm/s is 4.7s of
 * writing. On top of that the pen covers 1181 units going back over strokes
 * already down to reach parts of a letter it has not written yet; at the
 * TRAVEL rate below that is another 0.8s. Hence 5.5s.
 *
 * The swash, where the drawing has one, is quicker because a flourish is a
 * flick, and the pause before it is the hand lifting.
 */
const NAME_MS = 5500;
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
 * `signature.svg` is a traced signature, and `signature-typeset.svg` a name set
 * in a font: filled outlines, which cannot be drawn stroke-wise at all, so
 * each carries a separate centreline in `.ks-pen` and is revealed through it
 * as a mask. Both classes are animated the same way here, which is what makes
 * the files swappable with `home.signatureFile` and nothing else.
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
    // Optional: the drawn and traced signatures end on a swash, the typeset
    // one does not, because a font has no such thing to give it.
    const flourish = root.querySelector<SVGPathElement>('.ks-flourish');
    if (pens.length === 0) return;

    // The glass bead on the first letter, which lands once the pen lifts.
    const svg = root.querySelector('svg');
    const glass = svg ? addGlass(svg) : undefined;
    const removeGlass = () => glass?.remove();

    // A reader who asks for less motion gets the finished signature, bead and all.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      glass?.classList.add('ks-glass--on', 'ks-glass--still');
      return removeGlass;
    }

    /**
     * One run per element, rather than one path of many subpaths.
     *
     * A dash pattern restarts at the beginning of every subpath, so a single
     * path holding all of them counts the same offset down in every one of
     * those places at once and the whole name surfaces together — which is the
     * wipe this exists to replace, only less honest about it. Separate
     * elements, each waiting for the ink before it, put the pen in one place at
     * a time.
     *
     * Consecutive runs in a letter share an endpoint, so the reveal hands over
     * without moving and the letter is one unbroken journey. Runs are split
     * only where the pen's errand changes: a `data-retrace` run is one the
     * tracer had to take back over a stroke already on the page to reach a part
     * of the letter it had not written yet. Nothing is uncovered while it does
     * that, so at writing speed it would read as a stall. Weighting it down
     * spends a third of the time on it, which is also what a hand does — it
     * moves faster over a line already laid down than over one it is drawing.
     */
    const TRAVEL = 1 / 3;
    const lengths = pens.map((pen) => pen.getTotalLength());
    const weights = pens.map(
      (pen, index) => lengths[index] * (pen.dataset.retrace === 'true' ? TRAVEL : 1),
    );
    const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    const starts: number[] = [];
    weights.reduce((run, weight, index) => {
      starts[index] = (run / total) * NAME_MS;
      return run + weight;
    }, 0);

    /**
     * A drawing can carry its own timetable instead, as `signature-sacramento.svg`
     * does: when each stroke starts, how long it takes, and in `data-pace` how
     * far along it the pen is at each of a run of equal moments, which is
     * what lets the pen slow into the turns. See
     * scripts/pace-signature.mjs. A CSS transition has one easing per
     * stroke and cannot follow that, so these are drawn frame by frame.
     */
    const timetable = pens.every((pen) => pen.dataset.ms)
      ? pens.map((pen) => ({
          at: Number(pen.dataset.at ?? 0),
          ms: Number(pen.dataset.ms),
          pace: [0, ...(pen.dataset.pace ?? '').split(' ').filter(Boolean).map(Number), 1],
        }))
      : null;

    // When the last ink is down: the timetable's last stroke, or the name and
    // then the swash after the lift.
    const finished = timetable
      ? Math.max(...timetable.map(({ at, ms }) => at + ms))
      : NAME_MS + (flourish ? LIFT_MS + FLOURISH_MS : 0);

    let timer = 0;
    let glassTimer = 0;
    let frame = 0;

    const load = (path: SVGPathElement, length: number) => {
      path.style.transition = 'none';
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length);
    };

    const hide = () => {
      window.clearTimeout(timer);
      window.clearTimeout(glassTimer);
      window.cancelAnimationFrame(frame);
      glass?.classList.remove('ks-glass--on');
      pens.forEach((pen, index) => {
        load(pen, lengths[index]);
        // A round cap is drawn even on a dash pushed entirely off the path,
        // as a dot where the stroke begins; hidden until the pen gets there.
        if (timetable) pen.style.opacity = '0';
      });
      if (flourish) load(flourish, flourish.getTotalLength());
      // Read the layout back, so the browser starts the next transition from
      // here rather than folding both changes into one frame and showing
      // nothing at all.
      void root.getBoundingClientRect();
    };

    const write = (started: number, now: number) => {
      if (!timetable) return;
      const elapsed = now - started;
      let busy = false;
      timetable.forEach(({ at, ms, pace }, index) => {
        const local = (elapsed - at) / ms;
        if (local <= 0) {
          busy = true;
          return;
        }
        const step = Math.min(local, 1) * (pace.length - 1);
        const below = Math.min(Math.floor(step), pace.length - 2);
        const share = pace[below] + (pace[below + 1] - pace[below]) * (step - below);
        pens[index].style.opacity = '1';
        pens[index].style.strokeDashoffset = String(lengths[index] * (1 - share));
        if (local < 1) busy = true;
      });
      if (busy) frame = window.requestAnimationFrame((next) => write(started, next));
    };

    const play = () => {
      hide();
      glassTimer = window.setTimeout(() => glass?.classList.add('ks-glass--on'), finished);

      if (timetable) {
        frame = window.requestAnimationFrame((now) => write(now, now));
        return;
      }

      pens.forEach((pen, index) => {
        const duration = (weights[index] / total) * NAME_MS;
        pen.style.transition = `stroke-dashoffset ${duration}ms linear ${starts[index]}ms`;
        pen.style.strokeDashoffset = '0';
      });

      // The swash, if there is one, after the hand has lifted off the name.
      if (flourish) {
        timer = window.setTimeout(() => {
          flourish.style.transition = `stroke-dashoffset ${FLOURISH_MS}ms cubic-bezier(.4,.1,.3,1)`;
          flourish.style.strokeDashoffset = '0';
        }, NAME_MS + LIFT_MS);
      }
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
      window.clearTimeout(glassTimer);
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      root.removeEventListener('click', play);
      removeGlass();
    };
  }, []);

  return (
    <span
      aria-label={siteConfig.title}
      className="banner__signature"
      dangerouslySetInnerHTML={inner}
      ref={wrap}
      role="img"
      style={
        {
          '--signature-ratio': ratio,
          '--signature-descent': descent,
          transform: `rotate(${siteConfig.home.signatureTilt}deg)`,
        } as React.CSSProperties
      }
    />
  );
}
