import { describe, expect, it } from 'vitest';
import {
  clampScale,
  fitScale,
  MAX_SCALE,
  MIN_SCALE,
  pan,
  pinchStep,
  RESET,
  STEP,
  zoomAt,
  zoomBy,
} from '../lib/diagram-view';

describe('clampScale', () => {
  it('holds the range', () => {
    expect(clampScale(0.01)).toBe(MIN_SCALE);
    expect(clampScale(100)).toBe(MAX_SCALE);
    expect(clampScale(2)).toBe(2);
  });
});

describe('zoomBy', () => {
  it('leaves a diagram centred when it started centred', () => {
    expect(zoomBy(RESET, STEP)).toEqual({ scale: STEP, x: 0, y: 0 });
  });

  it('stops at the limits rather than drifting past them', () => {
    let view = RESET;
    for (let press = 0; press < 40; press += 1) view = zoomBy(view, STEP);
    expect(view.scale).toBe(MAX_SCALE);
    for (let press = 0; press < 40; press += 1) view = zoomBy(view, 1 / STEP);
    expect(view.scale).toBe(MIN_SCALE);
  });

  it('does not move a diagram that is already at the limit', () => {
    const edge = { scale: MAX_SCALE, x: 120, y: -40 };
    expect(zoomBy(edge, STEP)).toBe(edge);
  });
});

describe('zoomAt', () => {
  it('keeps what is under the pointer under the pointer', () => {
    const point = { x: 200, y: -80 };
    const before = { scale: 1, x: 0, y: 0 };
    const after = zoomAt(before, 2, point);

    // The content coordinate under the point is the same before and after.
    const content = (view: typeof before) => ({
      x: (point.x - view.x) / view.scale,
      y: (point.y - view.y) / view.scale,
    });
    expect(content(after).x).toBeCloseTo(content(before).x, 10);
    expect(content(after).y).toBeCloseTo(content(before).y, 10);
  });

  it('is the same as zooming about the centre when the point is the centre', () => {
    expect(zoomAt({ scale: 2, x: 30, y: 10 }, STEP, { x: 0, y: 0 })).toEqual(
      zoomBy({ scale: 2, x: 30, y: 10 }, STEP),
    );
  });

  it('zooming in and back out about one point returns where it started', () => {
    const point = { x: -150, y: 90 };
    const start = { scale: 1.5, x: 20, y: -10 };
    const round = zoomAt(zoomAt(start, STEP, point), 1 / STEP, point);
    expect(round.scale).toBeCloseTo(start.scale, 10);
    expect(round.x).toBeCloseTo(start.x, 10);
    expect(round.y).toBeCloseTo(start.y, 10);
  });
});

describe('pan', () => {
  it('adds the drag to the offset and leaves the scale alone', () => {
    expect(pan({ scale: 2, x: 10, y: 10 }, -30, 5)).toEqual({ scale: 2, x: -20, y: 15 });
  });
});

describe('fitScale', () => {
  it('shrinks a drawing too big for the stage, leaving a little air', () => {
    // 2000 wide into a 2000 stage: 0.92 of it, not the whole of it.
    expect(fitScale({ width: 2000, height: 500 }, { width: 2000, height: 800 })).toBeCloseTo(
      0.92,
      10,
    );
  });

  it('takes whichever side runs out first, and is the same either way round', () => {
    const stage = { width: 2000, height: 2000 };
    expect(fitScale({ width: 1000, height: 2000 }, stage)).toBeCloseTo(0.92, 10);
    expect(fitScale({ width: 2000, height: 1000 }, stage)).toBeCloseTo(0.92, 10);
  });

  it('stops at the minimum rather than shrinking a huge diagram to a smear', () => {
    expect(fitScale({ width: 6000, height: 4800 }, { width: 1000, height: 800 })).toBe(MIN_SCALE);
  });

  it('opens a small diagram at the size it was drawn, not the size of the stage', () => {
    // Filling the stage used to open the flowchart on the diagrams post at
    // 1.62x. Mermaid lays a diagram out around 12-16px text, so past 1x
    // nothing is revealed and the labels only get clumsy.
    expect(fitScale({ width: 400, height: 200 }, { width: 1600, height: 900 })).toBe(1);
    expect(fitScale({ width: 20, height: 10 }, { width: 1600, height: 900 })).toBe(1);
  });

  it('still undoes the text column, which is what opening it was for', () => {
    // 744px drawn and 612px in the post: 1x is 22% more than the page gives.
    expect(fitScale({ width: 744, height: 167 }, { width: 1314, height: 740 })).toBe(1);
  });

  it('shrinks anything wider than the stage, on a phone as much as a desktop', () => {
    // Fitting that flowchart to a 390px phone wants 0.44, which is under the
    // floor, so it opens at the floor and the reader drags the rest into view.
    expect(fitScale({ width: 744, height: 167 }, { width: 358, height: 620 })).toBe(MIN_SCALE);
    // A narrow window shrinks it without hitting the floor: 700 x 0.92 / 744.
    expect(fitScale({ width: 744, height: 167 }, { width: 700, height: 740 })).toBeCloseTo(
      0.8656,
      3,
    );
  });

  it('answers for a drawing it could not measure', () => {
    expect(fitScale({ width: 0, height: 0 }, { width: 800, height: 600 })).toBe(1);
  });
});

describe('pinchStep', () => {
  const at = (ax: number, ay: number, bx: number, by: number) => ({
    a: { x: ax, y: ay },
    b: { x: bx, y: by },
  });

  it('reads the scale from how far the fingers moved apart', () => {
    expect(pinchStep(at(-50, 0, 50, 0), at(-100, 0, 100, 0)).factor).toBeCloseTo(2, 10);
    expect(pinchStep(at(-100, 0, 100, 0), at(-50, 0, 50, 0)).factor).toBeCloseTo(0.5, 10);
  });

  it('zooms about the point between the fingers, which must not move', () => {
    expect(pinchStep(at(0, 0, 100, 0), at(-50, 0, 150, 0)).centre).toEqual({ x: 50, y: 0 });
  });

  it('reads the pan from where that point travelled to', () => {
    const step = pinchStep(at(0, 0, 100, 0), at(40, 20, 140, 20));
    expect([step.dx, step.dy]).toEqual([40, 20]);
    expect(step.factor).toBeCloseTo(1, 10);
  });

  it('holds the scale still rather than dividing by zero', () => {
    expect(pinchStep(at(10, 10, 10, 10), at(0, 0, 60, 0)).factor).toBe(1);
    expect(pinchStep(at(0, 0, 60, 0), at(10, 10, 10, 10)).factor).toBe(1);
  });

  it('measures diagonally, not along one axis', () => {
    expect(pinchStep(at(0, 0, 3, 4), at(0, 0, 6, 8)).factor).toBeCloseTo(2, 10);
  });
});
