/**
 * The state of a diagram in the viewer: how far it is zoomed, and how far it
 * has been dragged from the middle of the stage.
 *
 * `x` and `y` are in stage pixels measured from the centre, which is where the
 * transform's origin is. Keeping the arithmetic here rather than in the
 * component is what makes it testable — the test environment has no DOM, so a
 * component cannot be, and the edges are all in the numbers.
 */
export interface View {
  scale: number;
  x: number;
  y: number;
}

export const RESET: View = { scale: 1, x: 0, y: 0 };

/**
 * Half a size to eight times it. Below a half there is nothing left to read,
 * and a diagram drawn at eight times is already past the point where the text
 * inside it is the size of a heading.
 */
export const MIN_SCALE = 0.5;
export const MAX_SCALE = 8;

/** What one press of a zoom button does. */
export const STEP = 1.4;

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/**
 * Zoom about a point of the stage, so whatever is under that point stays
 * under it. A wheel zoom is about the pointer; a button is about the centre.
 *
 * The content coordinate under `point` is `(point - offset) / scale`, and it
 * has to come out at `point` again once the scale has changed, which gives the
 * offset below. Without it, zooming in on a corner of a large diagram walks
 * the part you were looking at off the screen.
 */
export function zoomAt(view: View, factor: number, point: { x: number; y: number }): View {
  const scale = clampScale(view.scale * factor);
  // Clamped to the same value: the offset must not move either, or a press at
  // the limit would drift the diagram while appearing to do nothing.
  if (scale === view.scale) return view;

  const ratio = scale / view.scale;
  return {
    scale,
    x: point.x - (point.x - view.x) * ratio,
    y: point.y - (point.y - view.y) * ratio,
  };
}

/** Zoom about the middle of the stage, which is what the buttons do. */
export function zoomBy(view: View, factor: number): View {
  return zoomAt(view, factor, { x: 0, y: 0 });
}

export function pan(view: View, dx: number, dy: number): View {
  return { ...view, x: view.x + dx, y: view.y + dy };
}

export interface Point {
  x: number;
  y: number;
}

/** The two fingers of a pinch, at one moment. */
export interface Pinch {
  a: Point;
  b: Point;
}

const distance = ({ a, b }: Pinch): number => Math.hypot(a.x - b.x, a.y - b.y);
const midpoint = ({ a, b }: Pinch): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/**
 * A pinch, as a zoom and a drag.
 *
 * Two fingers say both things at once: how far apart they are is the scale,
 * and where their midpoint has moved to is the pan. Zooming about that
 * midpoint is what makes a pinch feel attached to the picture — the point
 * between the fingers is the one that must not move.
 *
 * A factor of 1 when the fingers have not moved apart, rather than a division
 * by zero when they are on top of each other.
 */
export function pinchStep(
  from: Pinch,
  to: Pinch,
): { factor: number; centre: Point; dx: number; dy: number } {
  const was = distance(from);
  const now = distance(to);
  const start = midpoint(from);
  const end = midpoint(to);
  return {
    factor: was > 0 && now > 0 ? now / was : 1,
    centre: end,
    dx: end.x - start.x,
    dy: end.y - start.y,
  };
}

/** A little air, so a fitted drawing does not sit against the edges. */
const FIT_MARGIN = 0.92;

/**
 * The size a diagram was drawn at, which is as large as opening it makes it.
 *
 * The viewer used to fill the stage, and on a desktop that meant enlarging:
 * the flowchart on the diagrams post opened at 1.62x, the sequence diagrams at
 * about 1.5x. Mermaid lays a diagram out around 12-16px text, so past 1x
 * nothing is revealed and the labels just get clumsy.
 *
 * What the viewer is for is undoing the text column, not magnifying. Measured
 * on that same flowchart: 744px drawn, 612px in the post, so 1x is still 22%
 * more than the page gives. A diagram the post already shows whole opens the
 * same size, and the zoom buttons are there for a closer look.
 */
const MAX_FIT_SCALE = 1;

/**
 * The scale that fits a drawing to the stage, never above the size it was
 * drawn at.
 *
 * Clamped like every other scale, which means a drawing large enough to need
 * less than `MIN_SCALE` does not quite fit. That is the better answer: shown
 * at a sixth of its size it is a grey smear, and the reader can drag the rest
 * into view.
 */
export function fitScale(
  drawing: { width: number; height: number },
  stage: { width: number; height: number },
): number {
  if (drawing.width <= 0 || drawing.height <= 0) return 1;
  return clampScale(
    Math.min(
      (stage.width * FIT_MARGIN) / drawing.width,
      (stage.height * FIT_MARGIN) / drawing.height,
      MAX_FIT_SCALE,
    ),
  );
}
