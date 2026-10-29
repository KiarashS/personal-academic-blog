/**
 * Before/after comparisons. The build writes a pair of images flagged
 * `#compare` as two sub-figures side by side (plugins/figures.ts), which is
 * what a reader gets with no script and on paper. Here the pair is laid one
 * over the other, with a divider the reader drags, or moves with the arrow
 * keys, to show more of one or the other.
 *
 * The sub-figures stay in the page, out of sight but read by a screen reader,
 * so their ids still answer `#fig-scan-a` and a reader who cannot see the
 * slider still gets both pictures and both captions. The stage drawn here is
 * for the eye; its one control is a range input, which a keyboard and a
 * screen reader already know how to use.
 */

const STEP = 1;

/** A copy of a sub-figure's pictures, without the zoom links round them. */
function picturesOf(part: Element): HTMLElement {
  const layer = document.createElement('div');
  for (const node of part.children) {
    if (node.tagName === 'FIGCAPTION') continue;
    const copy = node.cloneNode(true) as HTMLElement;
    if (copy.matches('a.figure-zoom')) {
      const image = copy.querySelector('img');
      if (!image) continue;
      image.className = `${image.className} ${[...copy.classList].filter((c) => c !== 'figure-zoom').join(' ')}`;
      layer.append(image);
    } else {
      layer.append(copy);
    }
  }
  for (const image of layer.querySelectorAll('img')) {
    image.loading = 'eager';
    image.alt = '';
  }
  return layer;
}

const captionOf = (part: Element): string =>
  part
    .querySelector('figcaption')
    ?.textContent?.replace(/^\s*\([a-z]\)\s*/, '')
    .trim() ?? '';

function enhance(figure: HTMLElement): (() => void) | undefined {
  const parts = [...figure.querySelectorAll(':scope > .subfigure')];
  if (parts.length !== 2 || figure.classList.contains('compare--live')) return undefined;
  const [before, after] = parts;
  const names = [captionOf(before) || 'before', captionOf(after) || 'after'];

  const stage = document.createElement('div');
  stage.className = 'compare__stage';
  stage.setAttribute('aria-hidden', 'true');

  const under = picturesOf(after);
  under.className = 'compare__layer compare__layer--after';
  const over = picturesOf(before);
  over.className = 'compare__layer compare__layer--before';

  const handle = document.createElement('div');
  handle.className = 'compare__handle';
  const tagBefore = document.createElement('span');
  tagBefore.className = 'compare__tag compare__tag--before';
  tagBefore.textContent = before.querySelector('figcaption')?.textContent?.trim() ?? names[0];
  const tagAfter = document.createElement('span');
  tagAfter.className = 'compare__tag compare__tag--after';
  tagAfter.textContent = after.querySelector('figcaption')?.textContent?.trim() ?? names[1];
  stage.append(under, over, handle, tagBefore, tagAfter);

  const range = document.createElement('input');
  range.type = 'range';
  range.min = '0';
  range.max = '100';
  range.step = String(STEP);
  range.value = '50';
  range.className = 'compare__range';
  range.setAttribute('aria-label', `Compare ${names[0]} with ${names[1]}`);

  const set = (value: number) => {
    const clamped = Math.min(100, Math.max(0, value));
    figure.style.setProperty('--compare', `${clamped}%`);
    range.value = String(Math.round(clamped));
    range.setAttribute(
      'aria-valuetext',
      `${Math.round(clamped)}% ${names[0]}, ${Math.round(100 - clamped)}% ${names[1]}`,
    );
  };
  set(50);

  const caption = figure.querySelector(':scope > figcaption');
  figure.insertBefore(stage, caption);
  figure.insertBefore(range, caption);
  figure.classList.add('compare--live');

  const fromPointer = (event: PointerEvent) => {
    const box = stage.getBoundingClientRect();
    set(((event.clientX - box.left) / box.width) * 100);
  };
  let dragging = false;
  const onDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    dragging = true;
    stage.setPointerCapture(event.pointerId);
    fromPointer(event);
    range.focus({ preventScroll: true });
    event.preventDefault();
  };
  const onMove = (event: PointerEvent) => {
    if (dragging) fromPointer(event);
  };
  const onUp = () => {
    dragging = false;
  };
  const onInput = () => set(Number(range.value));

  stage.addEventListener('pointerdown', onDown);
  stage.addEventListener('pointermove', onMove);
  stage.addEventListener('pointerup', onUp);
  stage.addEventListener('pointercancel', onUp);
  range.addEventListener('input', onInput);

  return () => {
    stage.remove();
    range.remove();
    figure.classList.remove('compare--live');
    figure.style.removeProperty('--compare');
  };
}

export function compareSliders(container: HTMLElement): () => void {
  const undo = [...container.querySelectorAll<HTMLElement>('figure.compare')]
    .map(enhance)
    .filter((fn): fn is () => void => Boolean(fn));
  return () => undo.forEach((fn) => fn());
}
