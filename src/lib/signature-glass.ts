/**
 * A glass bead set on the signature's first letter once the pen lifts.
 *
 * It sits at the letter's top-left, over the top of its stem, and is a lens
 * rather than a drawing of one: inside the circle the page is painted again
 * and the letter drawn again a quarter larger, so the ink under it bends the
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
const SIZE = 0.22;
/** How much larger the lens shows what is under it. */
const MAGNIFY = 1.35;
/** Points read off the letter's outline to find its top. */
const SAMPLES = 600;

interface Bead {
  x: number;
  y: number;
  r: number;
}

/**
 * Where the bead goes: centred left of the letter's highest point and a little
 * below it, so the bead rises above the letter's top-left and the top of the
 * stem runs through the lens.
 */
export function beadFor(top: { x: number; y: number }, height: number): Bead {
  const r = height * SIZE;
  return { x: top.x - r * 0.55, y: top.y + r * 0.35, r };
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
 * Adds the bead to the drawing, hidden, and returns it; `.ks-glass--on` shows
 * it. Nothing when the drawing has no letter to measure.
 */
export function addGlass(svg: SVGSVGElement): SVGGElement | undefined {
  const letter = svg.querySelector<SVGGeometryElement>('.ks-glyph, .ks-stroke');
  if (!letter) return undefined;
  const box = letter.getBBox();
  if (box.height === 0) return undefined;
  const { x, y, r } = beadFor(highest(letter), box.height);

  letter.id ||= 'ks-glass-letter';
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
    make('use', { href: `#${letter.id}`, transform: zoom }),
    circle({ fill: `url(#${id('body')})` }),
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
