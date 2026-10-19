import { createRoot, hydrateRoot, type Root as ReactRoot } from 'react-dom/client';
import type { Root } from 'hast';
import { fromDom } from 'hast-util-from-dom';
import { childrenOf, Figure, FIGURE_CSS, figureData, figureIds } from './figure';

/** What can scroll sideways inside a figure: the frame body, and mdxcn's own. */
const SCROLLERS = '.mdxcn-root > figure > div, .overflow-x-auto';

/** The light DOM the build wrote, as hast, leaving out an inert template. */
function lightChildren(host: Element): Root {
  const children = [...host.childNodes]
    .filter((node) => node.nodeName !== 'TEMPLATE')
    .map((node) => fromDom(node))
    .filter((node) => node.type !== 'root' && node.type !== 'doctype');
  return { type: 'root', children };
}

/**
 * Brings every `<mdxcn-figure>` under `container` to life, and returns what
 * takes them down again.
 *
 * A figure the prerenderer drew already has a shadow root with the markup in
 * it, and is hydrated: the first render is the still one the server made, so
 * nothing moves. One that arrived with a navigation has only its light DOM,
 * since `innerHTML` does not read declarative shadow roots; it gets a shadow
 * root here and a fresh render, which animates in as mdxcn intends.
 */
export function mountFigures(container: HTMLElement): () => void {
  const roots: ReactRoot[] = [];

  for (const host of container.querySelectorAll('mdxcn-figure')) {
    const data = figureData(host.getAttribute('data-component'), host.getAttribute('data-props'));
    if (!data) continue;
    const children = childrenOf(lightChildren(host));
    const identifierPrefix = figureIds(host.getAttribute('data-figure'));

    const drawn = host.shadowRoot?.querySelector('.mdxcn-root');
    if (drawn && drawn.hasChildNodes()) {
      roots.push(
        hydrateRoot(
          drawn,
          <Figure data={data} still>
            {children}
          </Figure>,
          { identifierPrefix },
        ),
      );
      continue;
    }

    for (const template of host.querySelectorAll(':scope > template')) template.remove();
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    shadow.innerHTML = `<link rel="stylesheet" href="${FIGURE_CSS}"><div class="mdxcn-root"></div>`;
    const root = createRoot(shadow.querySelector('.mdxcn-root')!, { identifierPrefix });
    root.render(
      <Figure data={data} still={false}>
        {children}
      </Figure>,
    );
    roots.push(root);
  }

  // A frame body narrower than its content scrolls (`mdxcn.css`), as do the
  // boxes Uptime and Activity scroll themselves, and a region that scrolls
  // has to take focus to be scrolled without a pointer.
  // Watched per figure: the observer fires once at the start, again when
  // React has drawn a figure into it, and whenever the width changes.
  const observer = new ResizeObserver((entries) => {
    for (const { target } of entries) {
      for (const body of target.shadowRoot?.querySelectorAll(SCROLLERS) ?? []) {
        if (body.scrollWidth > body.clientWidth + 1) body.setAttribute('tabindex', '0');
        else body.removeAttribute('tabindex');
      }
    }
  });
  for (const host of container.querySelectorAll('mdxcn-figure')) observer.observe(host);

  return () => {
    observer.disconnect();
    for (const root of roots) root.unmount();
  };
}
