import type { Element, Root } from 'hast';
import { fromHtml } from 'hast-util-from-html';
import { toString } from 'hast-util-to-string';
import pseudocode from 'pseudocode';
import { linkIcon } from './link-icon';

/**
 * Algorithms in LaTeX's `algorithmic` style, the way a paper sets them: a
 * numbered caption between two rules, keywords in bold, procedure names in
 * small capitals, numbered lines, and the maths set by KaTeX like the rest of
 * the post.
 *
 *     ```algorithm
 *     \begin{algorithm}
 *     \caption{Gradient descent}
 *     \label{gd}
 *     \begin{algorithmic}
 *     \REQUIRE step size $\eta$
 *     \WHILE{not converged}
 *       \STATE $\theta \gets \theta - \eta \nabla L(\theta)$
 *     \ENDWHILE
 *     \end{algorithmic}
 *     \end{algorithm}
 *     ```
 *
 * The syntax is pseudocode.js's, which is the `algorithmicx` one in capitals.
 * It is rendered here, at build time, to plain HTML: no script reaches the
 * reader. Captioned algorithms are numbered in the post's own sequence, so
 * "Algorithm 2" is the second captioned one, and `\label{gd}` names it
 * `#alg-gd` for a link; `[](#alg-gd)` writes "Algorithm 1" itself.
 */

const LABEL = /\\label\s*\{\s*([^}]+?)\s*\}/;
const CAPTION = /\\caption\s*\{/;

const slug = (key: string): string =>
  key
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

function raw(value: string): Element {
  return { type: 'raw', value } as unknown as Element;
}

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export interface AlgorithmOptions {
  onWarn?: (message: string) => void;
}

export function rehypeAlgorithms(options: AlgorithmOptions = {}) {
  return (tree: Root) => {
    let count = 0;

    const walk = (parent: Root | Element) => {
      parent.children.forEach((node, index) => {
        if (node.type !== 'element') return;
        if (node.tagName !== 'pre') {
          walk(node);
          return;
        }
        const code = node.children.find(
          (child): child is Element => child.type === 'element' && child.tagName === 'code',
        );
        const classes = code?.properties?.className;
        const list = Array.isArray(classes) ? classes.map(String) : [];
        if (!code || !list.includes('language-algorithm')) return;

        const written = toString(code);
        const key = LABEL.exec(written)?.[1];
        const source = written.replace(LABEL, '');
        const captioned = CAPTION.test(source);
        const number = captioned ? count + 1 : undefined;

        let html: string;
        try {
          // pseudocode.js counts captions itself, from the value it is given.
          html = pseudocode.renderToString(source, {
            lineNumber: true,
            lineNumberPunc: '',
            noEnd: false,
            captionCount: count,
          });
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          options.onWarn?.(`an algorithm could not be set: ${message}`);
          (parent.children as Element[])[index] = {
            type: 'element',
            tagName: 'div',
            properties: { className: ['algorithm-error'] },
            children: [
              raw(
                `<strong>Algorithm could not be set.</strong><pre>${escapeHtml(message)}</pre>` +
                  `<pre>${escapeHtml(written)}</pre>`,
              ),
            ],
          };
          return;
        }
        if (number !== undefined) count = number;

        const id = number === undefined ? undefined : key ? `alg-${slug(key)}` : `alg-${number}`;
        const name = number === undefined ? undefined : `Algorithm ${number}`;

        // As nodes rather than a string, so the permalink can go into the
        // caption line the way a figure's does, and later passes see the tree.
        const rendered = fromHtml(html, { fragment: true }).children.filter(
          (child): child is Element => child.type === 'element',
        );
        if (id && name) {
          findCaption(rendered)?.children.push(
            { type: 'text', value: ' ' },
            {
              type: 'element',
              tagName: 'a',
              properties: {
                className: ['caption-anchor'],
                href: `#${id}`,
                ariaLabel: `Copy a link to ${name}`,
              },
              children: [linkIcon('caption-anchor__icon')],
            },
          );
        }

        (parent.children as Element[])[index] = {
          type: 'element',
          tagName: 'div',
          properties: {
            className: ['algorithm'],
            ...(id ? { id, dataRefLabel: name } : {}),
            role: 'figure',
            ...(name ? { ariaLabel: name } : {}),
          },
          children: rendered,
        };
      });
    };

    walk(tree);
  };
}

/** The caption line pseudocode.js writes: the first line of a captioned algorithm. */
function findCaption(nodes: Element[]): Element | undefined {
  for (const node of nodes) {
    const classes = node.properties?.className;
    const list = Array.isArray(classes) ? classes.map(String) : [];
    if (list.includes('ps-algorithm') && list.includes('with-caption')) {
      return node.children.find(
        (child): child is Element => child.type === 'element' && child.tagName === 'p',
      );
    }
    const inner = findCaption(node.children.filter((c): c is Element => c.type === 'element'));
    if (inner) return inner;
  }
  return undefined;
}
