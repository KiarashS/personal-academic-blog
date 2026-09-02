import { AuthorCard } from '../components/AuthorCard';
import { Markdown } from '../components/Markdown';
import { PageMeta } from '../components/PageMeta';
import { authors } from '../content/authors';
import { parseFrontmatter } from '../lib/frontmatter';
import aboutRaw from '../content/about.md?raw';
import '../styles/prose.css';

const { data, content } = parseFrontmatter<{ title: string }>(aboutRaw);

export function AboutPage() {
  return (
    <>
      <PageMeta title={data.title ?? 'About'} />
      <h1>{data.title ?? 'About'}</h1>
      <div className="prose">
        <Markdown>{content}</Markdown>
      </div>
      <h2 className="section-heading" style={{ marginTop: '3rem' }}>
        People
      </h2>
      {Object.values(authors).map((author) => (
        <AuthorCard key={author.id} author={author} />
      ))}
    </>
  );
}
