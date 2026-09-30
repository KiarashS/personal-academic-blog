import { useParams } from 'react-router-dom';
import { AuthorCard } from '../components/AuthorCard';
import { PostList } from '../components/PostList';
import { authors } from '../content/authors';
import { blogEnabled } from '../lib/features';
import { postsByAuthor } from '../lib/posts';
import { NotFoundPage } from './NotFoundPage';

export function AuthorPage() {
  const { id = '' } = useParams();
  const author = authors[id];
  if (!author) return <NotFoundPage what="author" />;

  const written = postsByAuthor(id);
  const standing = [author.role, author.affiliation].filter(Boolean).join(', ');

  return (
    <>
      <h1>{author.name}</h1>
      {/* The card used to open with the name again, directly under the same
          name as the page's heading. */}
      {standing ? <p className="lede">{standing}</p> : null}
      <AuthorCard author={author} showIdentity={false} />
      {/* Without a blog the page is the person: their bio and profiles, which
          the People page and the research areas link to. */}
      {blogEnabled() ? (
        <>
          <h2 className="section-heading section-heading--spaced">
            {written.length} post{written.length === 1 ? '' : 's'}
          </h2>
          <PostList posts={written} />
        </>
      ) : null}
    </>
  );
}
