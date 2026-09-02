import { Link, useParams } from 'react-router-dom';
import { AuthorCard } from '../components/AuthorCard';
import { Comments } from '../components/Comments';
import { Markdown } from '../components/Markdown';
import { PageMeta } from '../components/PageMeta';
import { TagList } from '../components/TagList';
import { formatDate, isoDate } from '../lib/format';
import { getPost, neighbours } from '../lib/posts';
import { NotFoundPage } from './NotFoundPage';
import '../styles/prose.css';

export function PostPage() {
  const { slug } = useParams();
  const post = getPost(slug);
  if (!post) return <NotFoundPage what="post" />;

  const { previous, next } = neighbours(post.slug);

  return (
    <article>
      <PageMeta title={post.title} description={post.summary} />

      <header className="post-header">
        <h1>{post.title}</h1>
        <p className="meta">
          <time dateTime={isoDate(post.date)}>{formatDate(post.date)}</time>
          <span className="meta__sep">·</span>
          <span>{post.readingMinutes} min read</span>
          {post.updated ? (
            <>
              <span className="meta__sep">·</span>
              <span>
                updated <time dateTime={isoDate(post.updated)}>{formatDate(post.updated)}</time>
              </span>
            </>
          ) : null}
          {post.doi ? (
            <>
              <span className="meta__sep">·</span>
              <a href={`https://doi.org/${post.doi}`}>doi:{post.doi}</a>
            </>
          ) : null}
        </p>

        {post.authors.length > 0 ? (
          <div className="byline">
            {post.authors.map((author) => (
              <div className="byline__author" key={author.id}>
                <Link to={`/authors/${author.id}`}>{author.name}</Link>
                {author.affiliation ? (
                  <span className="byline__affil">{author.affiliation}</span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </header>

      <div className="prose">
        <Markdown>{post.body}</Markdown>
      </div>

      {post.tags.length > 0 ? (
        <div style={{ marginTop: '2.5rem' }}>
          <TagList tags={post.tags} />
        </div>
      ) : null}

      {post.authors.map((author) => (
        <AuthorCard key={author.id} author={author} />
      ))}

      {previous || next ? (
        <nav className="post-nav" aria-label="Adjacent posts">
          <div>
            {next ? (
              <Link to={`/posts/${next.slug}`} rel="prev">
                <span className="post-nav__label">Newer</span>
                {next.title}
              </Link>
            ) : null}
          </div>
          <div style={{ textAlign: 'right' }}>
            {previous ? (
              <Link to={`/posts/${previous.slug}`} rel="next">
                <span className="post-nav__label">Older</span>
                {previous.title}
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}

      <Comments term={`/posts/${post.slug}`} />
    </article>
  );
}
