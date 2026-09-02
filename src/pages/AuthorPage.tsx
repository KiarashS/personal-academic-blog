import { useParams } from 'react-router-dom';
import { AuthorCard } from '../components/AuthorCard';
import { PostList } from '../components/PostList';
import { authors } from '../content/authors';
import { postsByAuthor } from '../lib/posts';
import { NotFoundPage } from './NotFoundPage';

export function AuthorPage() {
  const { id = '' } = useParams();
  const author = authors[id];
  if (!author) return <NotFoundPage what="author" />;

  const written = postsByAuthor(id);

  return (
    <>
      <h1>{author.name}</h1>
      <AuthorCard author={author} headingLevel="h3" linkName={false} />
      <h2 className="section-heading" style={{ marginTop: '2.5rem' }}>
        {written.length} post{written.length === 1 ? '' : 's'}
      </h2>
      <PostList posts={written} />
    </>
  );
}
