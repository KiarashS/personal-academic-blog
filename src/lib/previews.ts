/**
 * Previews of what a reference points at. Resting the pointer on "(3)",
 * "Figure 2", "Theorem 1", a citation, a footnote's number or a code callout,
 * or reaching one with the keyboard, shows that equation, figure, statement,
 * reference or note in a card beside the link, so a reader can check it
 * without losing their place. The link still goes there when followed.
 *
 * The card is a copy of the target as the page already draws it, so it is
 * the same picture in the same theme and needs nothing from the build. It is
 * for the eye only: `inert` and hidden from assistive technology, which can
 * follow the link and read the real thing, and it takes no pointer events, so
 * it never stands between the pointer and the text under it. A touch is a
 * tap on the link, which jumps as it always did.
 */

const LINKS = [
  'a.xref',
  'a.eqref',
  'a[href^="#bib-"]',
  'a[data-footnote-ref]',
  'a.code-callout',
].join(', ');

/**
 * Furniture that means nothing in a copy: permalinks, buttons, back-links, and
 * a paragraph's margin notes, which in a card have no margin to stand in and
 * spilled past its edge; their numbers stay in the text.
 */
const STRIP = [
  '.sidenote',
  '.caption-anchor',
  '.heading-anchor',
  '.theorem__anchor',
  '.data-footnote-backref',
  '.mermaid-figure__expand',
  '.chart__spec',
  '.chart__data',
  '.chart__live',
  'button',
  'script',
].join(', ');

const SHOW_AFTER = 350;
/**
 * A card is as wide as what it shows, between these: a one-line footnote or
 * a short equation gets a small card rather than a wide, mostly empty one,
 * and prose wraps at the widest. A chart, a diagram or images side by side
 * have no width of their own to fit (they take their container's), so their
 * cards are the widest.
 */
const WIDTH = { min: 16 * 16, max: 28 * 16 };
const FULL_WIDTH = '.chart, .mermaid-figure, .subfigures, .compare';
const GAP = 8;

/** The part of the page a reference's card shows, or nothing worth showing. */
function contentOf(target: HTMLElement): HTMLElement | undefined {
  // A row of a sub-numbered equation is reached by an empty anchor in it;
  // the card shows the whole equation, which is what the row is read in.
  if (target.classList.contains('equation__anchor')) {
    const equation = target.closest<HTMLElement>('.equation');
    return equation ? (equation.cloneNode(true) as HTMLElement) : undefined;
  }
  // A heading is shown with the first paragraph of its section, which says
  // more than the heading's words, already in the link. The paragraph may be
  // under a sub-heading; the section ends at the next heading of its rank.
  const rank = /^H([2-6])$/.exec(target.tagName)?.[1];
  if (rank) {
    const box = document.createElement('div');
    box.append(target.cloneNode(true));
    for (let next = target.nextElementSibling; next; next = next.nextElementSibling) {
      const level = /^H([2-6])$/.exec(next.tagName)?.[1];
      if (level && level <= rank) break;
      if (next.tagName === 'P') {
        box.append(next.cloneNode(true));
        break;
      }
    }
    return box;
  }
  if (target.matches('details')) return undefined;
  return target.cloneNode(true) as HTMLElement;
}

/** Where a figure or table stands on the page, which means nothing in a card. */
const PLACED = ['figure--wide', 'figure--margin', 'table-wrap--wide'];

function clean(node: HTMLElement): HTMLElement {
  for (const part of node.querySelectorAll(STRIP)) part.remove();
  for (const part of [node, ...node.querySelectorAll<HTMLElement>('[id], [tabindex]')]) {
    part.removeAttribute('id');
    part.removeAttribute('tabindex');
  }
  // A live chart's copy shows the drawing the page arrived with.
  for (const chart of node.querySelectorAll('.chart--live')) chart.classList.remove('chart--live');
  // A figure or table set wider than the column, or out in its margin, is laid
  // out in the card as an ordinary one: the card has no margin to reach into,
  // and a wide figure's copy ran past the card's edge and lost its last
  // picture and the end of its caption.
  for (const part of [node, ...node.querySelectorAll<HTMLElement>(`.${PLACED.join(', .')}`)]) {
    part.classList.remove(...PLACED);
  }
  return node;
}

/**
 * What scrolls sideways on the page, a display equation or a table wider than
 * the column, cannot be scrolled in a card, which takes no pointer events; it
 * lost its right-hand end, an equation its number. Here it is scaled down to
 * the card's width instead. Code is not: it wraps in a card (prose.css).
 */
function fitSideways(card: HTMLElement): void {
  for (const box of card.querySelectorAll<HTMLElement>('*')) {
    if (box.tagName === 'PRE' || !/auto|scroll/.test(getComputedStyle(box).overflowX)) continue;
    const scale = box.clientWidth / box.scrollWidth;
    if (scale >= 0.99) continue;
    for (const child of box.children) (child as HTMLElement).style.zoom = String(scale);
  }
}

export function referencePreviews(container: HTMLElement): () => void {
  let card: HTMLDivElement | undefined;
  let showing: HTMLAnchorElement | undefined;
  let timer = 0;

  const hide = () => {
    window.clearTimeout(timer);
    showing = undefined;
    card?.remove();
    card = undefined;
  };

  const show = (link: HTMLAnchorElement) => {
    const id = decodeURIComponent(link.getAttribute('href')?.slice(1) ?? '');
    const target = id ? document.getElementById(id) : null;
    if (!target || target.contains(link)) return;

    // A footnote whose note stands in the margin beside the link is already
    // in view; a card would only cover it.
    const note = link.closest('sup')?.nextElementSibling;
    if (note instanceof HTMLElement && note.classList.contains('sidenote') && note.offsetParent) {
      return;
    }

    const content = contentOf(target);
    if (!content) return;

    hide();
    showing = link;
    card = document.createElement('div');
    card.className = 'prose ref-preview';
    card.inert = true;
    card.setAttribute('aria-hidden', 'true');
    card.append(clean(content));
    document.body.append(card);

    const widest = Math.min(WIDTH.max, window.innerWidth - 2 * GAP);
    if (card.querySelector(FULL_WIDTH)) {
      card.style.width = `${widest}px`;
    } else {
      card.style.width = 'max-content';
      card.style.minWidth = `${Math.min(WIDTH.min, widest)}px`;
      card.style.maxWidth = `${widest}px`;
    }
    // Fixed at what it measured, rounded up so no line wraps again, so the
    // card does not reflow as it is placed.
    const width = Math.ceil(card.getBoundingClientRect().width);
    card.style.width = `${width}px`;
    fitSideways(card);
    const box = link.getBoundingClientRect();
    const height = card.offsetHeight;
    const below = window.innerHeight - box.bottom - GAP >= height || box.top < height + GAP;
    const top = below ? box.bottom + GAP : box.top - height - GAP;
    const left = Math.min(
      Math.max(GAP, box.left + box.width / 2 - width / 2),
      window.innerWidth - width - GAP,
    );
    card.style.top = `${Math.max(GAP, top)}px`;
    card.style.left = `${left}px`;
    card.dataset.side = below ? 'below' : 'above';
    if (card.scrollHeight > card.clientHeight + 1) card.dataset.clipped = '';
    // Measured above, then shown.
    card.dataset.open = '';
  };

  const linkOf = (event: Event): HTMLAnchorElement | null => {
    const target = event.target;
    return target instanceof Element ? target.closest<HTMLAnchorElement>(LINKS) : null;
  };

  const onOver = (event: PointerEvent) => {
    if (event.pointerType === 'touch') return;
    const link = linkOf(event);
    if (!link || link === showing) return;
    window.clearTimeout(timer);
    timer = window.setTimeout(() => show(link), SHOW_AFTER);
  };

  const onOut = (event: PointerEvent) => {
    const link = linkOf(event);
    if (!link) return;
    const into = event.relatedTarget;
    if (into instanceof Node && link.contains(into)) return;
    hide();
  };

  const onFocus = (event: FocusEvent) => {
    const link = linkOf(event);
    if (link?.matches(':focus-visible')) show(link);
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape' && card) hide();
  };

  container.addEventListener('pointerover', onOver);
  container.addEventListener('pointerout', onOut);
  container.addEventListener('focusin', onFocus);
  container.addEventListener('focusout', hide);
  // Following the link, or the page moving under the card, ends it.
  container.addEventListener('click', hide);
  document.addEventListener('keydown', onKey);
  window.addEventListener('scroll', hide, { passive: true });
  window.addEventListener('resize', hide);

  return () => {
    hide();
    container.removeEventListener('pointerover', onOver);
    container.removeEventListener('pointerout', onOut);
    container.removeEventListener('focusin', onFocus);
    container.removeEventListener('focusout', hide);
    container.removeEventListener('click', hide);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('scroll', hide);
    window.removeEventListener('resize', hide);
  };
}
