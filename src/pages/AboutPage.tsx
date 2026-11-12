import { AuthorCard } from '../components/AuthorCard';
import { authors } from '../content/authors';
import { RoutedHtml } from '../components/RoutedHtml';
import { resource, useResource } from '../lib/resource';

export const aboutBody = resource(() => import('../content/about.md') as Promise<{ html: string }>);

/** Its text, loaded before a prerendered copy of the page is hydrated (`main.tsx`). */
export const preload = () => aboutBody.warm();

function AboutBody() {
  return <RoutedHtml className="prose" html={useResource(aboutBody).html} />;
}

export function AboutPage() {
  return (
    <>
      <h1>About</h1>
      <AboutBody />
      <h2 className="section-heading section-heading--spaced">People</h2>
      {Object.values(authors).map((author) => (
        <AuthorCard key={author.id} author={author} />
      ))}
    </>
  );
}
