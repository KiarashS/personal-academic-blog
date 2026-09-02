import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import type { Element, Nodes } from 'hast';
import type { PluggableList } from 'unified';
import { CodeBlock } from './CodeBlock';
import { Mermaid } from './Mermaid';
import 'katex/dist/katex.min.css';

/** Recovers the source text of a highlighted code node. */
function nodeText(node: Nodes): string {
  if (node.type === 'text') return node.value;
  if ('children' in node) return node.children.map((child) => nodeText(child)).join('');
  return '';
}

function languageOf(node: Element | undefined): string | undefined {
  const classes = node?.properties?.className;
  const list = Array.isArray(classes) ? classes.map(String) : [String(classes ?? '')];
  const match = list.find((name) => name.startsWith('language-'));
  return match ? match.slice('language-'.length) : undefined;
}

const components: Components = {
  pre({ node, children }) {
    const codeNode = node?.children.find(
      (child): child is Element => child.type === 'element' && child.tagName === 'code',
    );
    const language = languageOf(codeNode);
    const source = codeNode ? nodeText(codeNode) : '';

    if (language === 'mermaid') return <Mermaid chart={source} />;
    return (
      <CodeBlock language={language} source={source}>
        {children}
      </CodeBlock>
    );
  },
  // Wide tables scroll on their own rather than pushing the page sideways.
  table({ children }) {
    return (
      <div className="table-wrap">
        <table>{children}</table>
      </div>
    );
  },
  a({ href, children, ...rest }) {
    const external = !!href && /^https?:\/\//.test(href);
    return (
      <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
        {children}
      </a>
    );
  },
};

const remarkPlugins: PluggableList = [remarkGfm, remarkMath];

// Order matters: raw HTML is parsed first, then headings get ids, then code is
// highlighted, and KaTeX runs last so it sees the finished tree.
const rehypePlugins: PluggableList = [
  rehypeRaw,
  rehypeSlug,
  [rehypeHighlight, { detect: false, ignoreMissing: true }],
  [rehypeKatex, { strict: false, throwOnError: false }],
];

export const Markdown = memo(function Markdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={components}
    >
      {children}
    </ReactMarkdown>
  );
});
