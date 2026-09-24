import { useCallback, useEffect, useRef, useState } from 'react';
import { fitScale, pan, pinchStep, RESET, STEP, zoomAt, zoomBy } from '../lib/diagram-view';
import type { Point, View } from '../lib/diagram-view';

/** How far a wheel notch zooms. Gentler than a button press, which is deliberate. */
const WHEEL_STEP = 1.12;

function Icon({ paths }: { paths: string[] }) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="16"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
      width="16"
    >
      {paths.map((d) => (
        <path d={d} key={d} />
      ))}
    </svg>
  );
}

/**
 * A diagram, full size, with the controls to get around it.
 *
 * A `dialog` opened with `showModal`, so the focus trap, the Escape key, the
 * backdrop and the stacking above everything else are the browser's job rather
 * than this component's. `markup` is the figure's own HTML, already made unique
 * by `uniqueIds` before it arrives, so both theme copies come along and the
 * rules that swap them keep working inside the dialog.
 */
export function DiagramViewer({ markup, onClose }: { markup: string; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const drawing = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>(RESET);

  // Opened once, on arrival. Closing is the browser's, and `onClose` clears
  // the markup that renders this, so it is unmounted rather than hidden.
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  /**
   * Fit the drawing to the stage, which is what opening does and what the Fit
   * button goes back to.
   *
   * Measured from the `viewBox` rather than from the rendered box. Mermaid
   * writes the drawing's own size there and nothing changes it, where the
   * rendered box is whatever the current zoom has made it — reading that and
   * dividing the zoom back out means holding the zoom in this callback, and a
   * callback holding a value it does not list as a dependency is the stale
   * closure that made Fit jump to half size after zooming in.
   */
  const fit = useCallback(() => {
    const box = stage.current?.getBoundingClientRect();
    const svg = drawing.current?.querySelector<SVGSVGElement>('svg');
    const drawn = svg?.viewBox?.baseVal;
    if (!box || !drawn?.width) {
      setView(RESET);
      return;
    }
    setView({
      ...RESET,
      scale: fitScale(
        { width: drawn.width, height: drawn.height },
        { width: box.width, height: box.height },
      ),
    });
  }, []);

  useEffect(() => {
    // After the SVG has been laid out, so it has a size to measure.
    const frame = requestAnimationFrame(fit);
    return () => cancelAnimationFrame(frame);
  }, [fit, markup]);

  /** Stage coordinates, measured from the middle, which is the transform origin. */
  const pointOn = (event: { clientX: number; clientY: number }) => {
    const box = stage.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return {
      x: event.clientX - (box.left + box.width / 2),
      y: event.clientY - (box.top + box.height / 2),
    };
  };

  /*
   * The wheel is listened for on the element rather than through `onWheel`.
   * React registers its wheel handlers passively at the root, so the
   * `preventDefault` in one never runs — it logged "Unable to preventDefault
   * inside passive event listener invocation" on every notch and left the
   * browser free to do its own thing with the gesture underneath.
   */
  useEffect(() => {
    const element = stage.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP;
      setView((current) => zoomAt(current, factor, pointOn(event)));
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, []);

  /*
   * Every pointer currently down, by id, at the position it was last seen.
   *
   * One is a drag and two are a pinch, which is why they are held together
   * rather than each installing listeners of its own: the first version did
   * that, and a second finger added a second drag handler, so a pinch sent
   * the diagram skidding across the stage while the scale never moved.
   */
  const pointers = useRef(new Map<number, Point>());

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      event.currentTarget.classList.add('diagram-viewer__stage--dragging');
    }
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const down = pointers.current;
    const previous = down.get(event.pointerId);
    if (!previous) return;
    const next = { x: event.clientX, y: event.clientY };

    if (down.size === 1) {
      down.set(event.pointerId, next);
      setView((current) => pan(current, next.x - previous.x, next.y - previous.y));
      return;
    }

    if (down.size === 2) {
      const [first, second] = [...down.entries()];
      const other = first[0] === event.pointerId ? second : first;
      const step = pinchStep({ a: previous, b: other[1] }, { a: next, b: other[1] });
      down.set(event.pointerId, next);
      // The centre is in client coordinates; the stage measures from its middle.
      const centre = pointOn({ clientX: step.centre.x, clientY: step.centre.y });
      setView((current) => pan(zoomAt(current, step.factor, centre), step.dx, step.dy));
    }
    // Three fingers or more: wait for the reader to make up their mind.
  };

  const onPointerUp = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size === 0) {
      event.currentTarget.classList.remove('diagram-viewer__stage--dragging');
    }
  };

  return (
    <dialog className="diagram-viewer" onClose={onClose} ref={dialog}>
      <div className="diagram-viewer__bar">
        <div className="diagram-viewer__zoom" role="group" aria-label="Zoom">
          <button
            aria-label="Zoom out"
            onClick={() => setView((current) => zoomBy(current, 1 / STEP))}
            type="button"
          >
            <Icon paths={['M5 12h14']} />
          </button>
          <span className="diagram-viewer__scale" aria-live="polite">
            {Math.round(view.scale * 100)}%
          </span>
          <button
            aria-label="Zoom in"
            onClick={() => setView((current) => zoomBy(current, STEP))}
            type="button"
          >
            <Icon paths={['M12 5v14', 'M5 12h14']} />
          </button>
          {/* Never disabled, even sitting exactly on the fit: a button that
              disables itself under the reader's finger drops the focus out of
              the dialog, and pressing this one twice costs nothing. */}
          <button onClick={fit} type="button">
            Fit
          </button>
        </div>
        <button
          aria-label="Close"
          className="diagram-viewer__close"
          onClick={() => dialog.current?.close()}
          type="button"
        >
          <Icon paths={['M18 6 6 18', 'm6 6 12 12']} />
        </button>
      </div>

      <div
        className="diagram-viewer__stage"
        onDoubleClick={(event) => setView((current) => zoomAt(current, STEP, pointOn(event)))}
        onPointerCancel={onPointerUp}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        ref={stage}
      >
        <div
          className="diagram-viewer__drawing"
          dangerouslySetInnerHTML={{ __html: markup }}
          ref={drawing}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})` }}
        />
      </div>

      <p className="diagram-viewer__hint">Drag to move · pinch or scroll to zoom · Esc to close</p>
    </dialog>
  );
}
