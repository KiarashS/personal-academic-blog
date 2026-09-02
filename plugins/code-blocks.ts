import type { Element, Root } from 'hast';

const NOT_CODE = new Set(['language-math', 'math-display', 'math-inline']);

function classesOf(node: Element): string[] {
  const classes = node.properties?.className;
  return Array.isArray(classes) ? classes.map(String) : [String(classes ?? '')];
}

function languageOf(code: Element): string | undefined {
  const match = classesOf(code).find((name) => name.startsWith('language-'));
  return match?.slice('language-'.length);
}

/**
 * Wraps every `pre` in the chrome the reader sees — language label and copy
 * button — at build time, so a prerendered page has them before any script
 * runs. The button only needs a click handler attached later.
 */
export function rehypeCodeBlocks() {
  return (tree: Root) => {
    const walk = (node: Root | Element) => {
      const children = 'children' in node ? node.children : [];
      children.forEach((child, index) => {
        if (child.type !== 'element') return;
        if (child.tagName !== 'pre') {
          walk(child);
          return;
        }

        const code = child.children.find(
          (grandchild): grandchild is Element =>
            grandchild.type === 'element' && grandchild.tagName === 'code',
        );
        if (code && classesOf(code).some((name) => NOT_CODE.has(name))) return;
        const language = code ? languageOf(code) : undefined;

        const chrome: Element[] = [];
        if (language) {
          chrome.push({
            type: 'element',
            tagName: 'span',
            properties: { className: ['code-block__lang'], ariaHidden: 'true' },
            children: [{ type: 'text', value: language }],
          });
        }
        chrome.push({
          type: 'element',
          tagName: 'button',
          properties: { type: 'button', className: ['code-block__copy'] },
          children: [
            { type: 'text', value: 'copy' },
            {
              type: 'element',
              tagName: 'span',
              properties: { className: ['visually-hidden'] },
              children: [{ type: 'text', value: ' code to clipboard' }],
            },
          ],
        });

        children[index] = {
          type: 'element',
          tagName: 'div',
          properties: { className: ['code-block'] },
          children: [...chrome, child],
        };
      });
    };
    walk(tree);
  };
}
