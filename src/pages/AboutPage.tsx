import { Suspense, use } from 'react';
import { AuthorCard } from '../components/AuthorCard';
import { authors } from '../content/authors';

const load = () => import('../content/about.md') as Promise<{ html: string }>;
let promise: Promise<{ html: string }> | null = null;

function AboutBody() {
  promise ??= load();
  const { html } = use(promise);
  return <div className="prose" dangerouslySetInnerHTML={{ __html: html }} />;
}

export function AboutPage() {
  return (
    <>
      <h1>About</h1>
      <Suspense fallback={<p className="empty">Loading…</p>}>
        <AboutBody />
      </Suspense>
      <h2 className="section-heading" style={{ marginTop: '3rem' }}>
        People
      </h2>
      {Object.values(authors).map((author) => (
        <AuthorCard key={author.id} author={author} />
      ))}
    </>
  );
}
