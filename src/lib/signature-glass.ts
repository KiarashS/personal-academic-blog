/**
 * A glass bead set on the signature's first letter once the pen lifts.
 *
 * It sits on the top of the letter's stem, centred on it, and is a lens
 * rather than a drawing of one: inside the circle the page is painted again
 * and the letter drawn again a third larger, so the ink under it bends the
 * way it would under a drop of glass. On a plain page that is what reads as
 * glass at all, since there is nothing behind it to blur. A rim lit from the
 * top-left, a highlight and a fainter catch-light opposite finish it, and a
 * shine crosses it once as it lands.
 *
 * Built here, in the page, rather than written into the SVG files: where it
 * goes depends on the letter, and this finds the letter's top in whichever
 * drawing `home.signatureFile` names. Its colours are the page's tokens
 * (`.ks-glass` in global.css), so it follows the theme like the ink does.
 */

const NS = 'http://www.w3.org/2000/svg';

/** The bead's radius, as a share of the letter's height. */
const SIZE = 0.3;
/** How much larger the lens shows what is under it. */
const MAGNIFY = 1.35;
/** Points read off the letter's outline to find its top. */
const SAMPLES = 600;

interface Bead {
  x: number;
  y: number;
  r: number;
}

/** A point on the stem's middle line, which runs from `upper` to `lower`. */
interface Axis {
  upper: { x: number; y: number };
  lower: { x: number; y: number };
}

/**
 * Where the bead is set from the place found for it, in radii: a quarter left
 * of the stem's middle line and a sixth higher, 3px and 2px where the front
 * page draws the signature on a desktop, a radius being about 12px there, and
 * the same share of the bead at any other size.
 */
const NUDGE = { left: 0.25, up: 0.17 };

/** How far the bead is raised at first, and at most, in radii above the letter's top. */
const LIFT = { from: 0.2, step: 0.05, to: 1 };

/**
 * Where the bead goes: on the stem's middle line, `lift` radii above the
 * letter's highest point, so the stem rises into the lower half of the lens
 * and the glass stands above the letter. `addGlass` raises it from
 * `LIFT.from` until nothing but the stem is under the glass.
 */
export function beadFor(
  top: { x: number; y: number },
  height: number,
  axis?: Axis,
  lift = LIFT.from,
): Bead {
  const r = height * SIZE;
  const y = top.y - lift * r;
  if (!axis) return { x: top.x, y, r };
  const { upper, lower } = axis;
  const x = upper.x + ((y - upper.y) / (lower.y - upper.y || 1)) * (lower.x - upper.x);
  return { x, y, r };
}

/**
 * Whether the glass would cover ink other than the stem: the arm of a K, the
 * bowl of a P. Points across the bead are tested against the letter's fill;
 * ink further from the stem's middle line than the stem is wide is not stem.
 */
function coversMoreThanStem(path: SVGGeometryElement, bead: Bead, axis: Axis, half: number) {
  const { upper, lower } = axis;
  const axisAt = (y: number) =>
    upper.x + ((y - upper.y) / (lower.y - upper.y || 1)) * (lower.x - upper.x);
  const step = bead.r / 14;
  for (let y = bead.y - bead.r; y <= bead.y + bead.r; y += step) {
    for (let x = bead.x - bead.r; x <= bead.x + bead.r; x += step) {
      if (Math.hypot(x - bead.x, y - bead.y) > bead.r) continue;
      if (Math.abs(x - axisAt(y)) <= half) continue;
      if (path.isPointInFill(new DOMPoint(x, y))) return true;
    }
  }
  return false;
}

/**
 * The middle of the stroke at height `y` nearest `near`, read off the letter's
 * fill: where the ink on that row begins and ends, halved.
 */
function middleAt(path: SVGGeometryElement, y: number, near: number, span: number) {
  const inside = (x: number) => path.isPointInFill(new DOMPoint(x, y));
  const step = span / 400;
  let x = near;
  // Find ink on the row, starting from straight below the top and widening.
  for (let d = 0; d <= span && !inside(x); d += step) x = inside(near - d) ? near - d : near + d;
  if (!inside(x)) return undefined;
  let left = x;
  let right = x;
  while (inside(left - step) && left > near - span) left -= step;
  while (inside(right + step) && right < near + span) right += step;
  return { x: (left + right) / 2, y, half: (right - left) / 2 };
}

/** The highest point on a path's outline, in its own user units. */
function highest(path: SVGGeometryElement): { x: number; y: number } {
  const length = path.getTotalLength();
  let best = path.getPointAtLength(0);
  for (let i = 1; i <= SAMPLES; i += 1) {
    const point = path.getPointAtLength((length * i) / SAMPLES);
    if (point.y < best.y) best = point;
  }
  return { x: best.x, y: best.y };
}

const make = <K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number>,
  children: SVGElement[] = [],
): SVGElementTagNameMap[K] => {
  const element = document.createElementNS(NS, tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, String(value));
  element.append(...children);
  return element;
};

/**
 * The letter again, for the lens: a copy rather than a `<use>` of it. Safari
 * styles what a `<use>` shows by the file's own colour, the navy the drawing
 * was made in, and not by the page's ink, so on the dark theme the letter
 * under the glass went dark and vanished. A copy in the page takes the ink's
 * colour like any other element (`.ks-glass__ink`). It has no mask: the bead
 * shows only once the letter is written.
 */
function enlarged(letter: SVGGeometryElement, transform: string): SVGElement {
  const copy = letter.cloneNode(false) as SVGElement;
  for (const name of ['id', 'mask', 'style', 'fill', 'stroke']) copy.removeAttribute(name);
  const drawn = letter.classList.contains('ks-stroke') ? 'stroke' : 'fill';
  copy.setAttribute('class', `ks-glass__ink ks-glass__ink--${drawn}`);
  copy.setAttribute('transform', transform);
  return copy;
}

/**
 * Adds the bead to the drawing, hidden, and returns it; `.ks-glass--on` shows
 * it. Nothing when the drawing has no letter to measure.
 */
export function addGlass(svg: SVGSVGElement): SVGGElement | undefined {
  const letter = svg.querySelector<SVGGeometryElement>('.ks-glyph, .ks-stroke');
  if (!letter) return undefined;
  const box = letter.getBBox();
  if (box.height === 0) return undefined;
  const top = highest(letter);
  const upper = middleAt(letter, top.y + box.height * 0.1, top.x, box.height * 0.3);
  const lower = middleAt(letter, top.y + box.height * 0.25, upper?.x ?? top.x, box.height * 0.3);
  const axis = upper && lower ? { upper, lower } : undefined;
  let bead = beadFor(top, box.height, axis);
  // Raise it until the stem is all the glass covers. The stem's half-width,
  // and a little, counts as stem; its widening into a junction lower down
  // does not reach this high.
  if (axis) {
    const half = Math.max(upper!.half, lower!.half) * 1.25;
    for (let lift = LIFT.from; lift <= LIFT.to; lift += LIFT.step) {
      bead = beadFor(top, box.height, axis, lift);
      if (!coversMoreThanStem(letter, bead, axis, half)) break;
    }
  }
  const { r } = bead;
  const x = bead.x - NUDGE.left * r;
  const y = bead.y - NUDGE.up * r;

  const id = (name: string) => `ks-glass-${name}`;
  const circle = (attributes: Record<string, string | number> = {}) =>
    make('circle', { cx: x, cy: y, r, ...attributes });
  const stop = (offset: number, className: string) => make('stop', { offset, class: className });
  const zoom = `translate(${x} ${y}) scale(${MAGNIFY}) translate(${-x} ${-y})`;

  const defs = make('defs', {}, [
    make('clipPath', { id: id('clip') }, [circle()]),
    // Clear in the middle; at the edge the glass bends the light away and goes
    // darker, which is most of what outlines a clear bead on paper.
    make('radialGradient', { id: id('body'), cx: 0.42, cy: 0.38, r: 0.66 }, [
      stop(0, 'ks-glass__tint'),
      stop(0.7, 'ks-glass__tint'),
      stop(0.9, 'ks-glass__edge'),
      stop(1, 'ks-glass__deep'),
    ]),
    // The rim catches the light at the top-left and falls into shade opposite.
    make('linearGradient', { id: id('rim'), x1: 0.15, y1: 0.1, x2: 0.85, y2: 0.9 }, [
      stop(0, 'ks-glass__lit'),
      stop(0.45, 'ks-glass__clear'),
      stop(1, 'ks-glass__shade'),
    ]),
    // The shadow it casts, drawn here rather than as a CSS drop-shadow, whose
    // lengths on an SVG element are not read in the same units everywhere.
    // Light that has come through the glass, gathered on the side away from it.
    make('radialGradient', { id: id('glow') }, [
      stop(0, 'ks-glass__glow'),
      stop(1, 'ks-glass__clear'),
    ]),
    make('radialGradient', { id: id('shadow') }, [
      stop(0, 'ks-glass__shadow'),
      stop(1, 'ks-glass__clear'),
    ]),
    make('linearGradient', { id: id('shine'), x1: 0, y1: 0, x2: 1, y2: 0 }, [
      stop(0, 'ks-glass__clear'),
      stop(0.5, 'ks-glass__lit'),
      stop(1, 'ks-glass__clear'),
    ]),
  ]);

  const shine = make('rect', {
    class: 'ks-glass__shine',
    x: x - r * 0.45,
    y: y - r * 1.6,
    width: r * 0.9,
    height: r * 3.2,
    fill: `url(#${id('shine')})`,
    transform: `rotate(35 ${x} ${y})`,
  });

  const lens = make('g', { 'clip-path': `url(#${id('clip')})` }, [
    // The page again, over the ink it covers, and then the ink enlarged.
    circle({ class: 'ks-glass__page' }),
    enlarged(letter, zoom),
    circle({ fill: `url(#${id('body')})` }),
    make('ellipse', {
      cx: x + r * 0.3,
      cy: y + r * 0.5,
      rx: r * 0.75,
      ry: r * 0.55,
      fill: `url(#${id('glow')})`,
    }),
    make('g', { class: 'ks-glass__sweep' }, [shine]),
  ]);

  const glass = make('g', { class: 'ks-glass', 'aria-hidden': 'true' }, [
    defs,
    make('ellipse', {
      cx: x + r * 0.22,
      cy: y + r * 0.42,
      rx: r * 1.05,
      ry: r * 0.85,
      fill: `url(#${id('shadow')})`,
    }),
    lens,
    circle({
      class: 'ks-glass__rim',
      fill: 'none',
      stroke: `url(#${id('rim')})`,
      'stroke-width': r * 0.09,
    }),
    // A hairline round the edge, for the light theme, where the lit half of the
    // rim is white on white and the bead had no edge to speak of.
    circle({ class: 'ks-glass__line', fill: 'none', 'stroke-width': r * 0.035 }),
    // The window's reflection, and the light that comes back out of the far side.
    make('ellipse', {
      class: 'ks-glass__highlight',
      cx: x - r * 0.36,
      cy: y - r * 0.4,
      rx: r * 0.3,
      ry: r * 0.17,
      transform: `rotate(-38 ${x - r * 0.36} ${y - r * 0.4})`,
    }),
    make('path', {
      class: 'ks-glass__catch',
      d:
        `M ${x + r * 0.62} ${y + r * 0.2} ` +
        `A ${r * 0.66} ${r * 0.66} 0 0 1 ${x + r * 0.15} ${y + r * 0.64}`,
      fill: 'none',
      'stroke-width': r * 0.08,
      'stroke-linecap': 'round',
    }),
  ]);
  glass.style.setProperty('--glass-r', String(r));
  svg.append(glass);
  return glass;
}
