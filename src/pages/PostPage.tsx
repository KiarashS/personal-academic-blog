import { Suspense, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AuthorCard } from '../components/AuthorCard';
import { CiteBlock } from '../components/CiteBlock';
import { Comments } from '../components/Comments';
import { PostBody } from '../components/PostBody';
import { ReadingProgress } from '../components/ReadingProgress';
import { Revisions } from '../components/Revisions';
import { SeriesHeader, SeriesLinks } from '../components/SeriesNav';
import { ShareLinks } from '../components/ShareLinks';
import { TableOfContents } from '../components/TableOfContents';
import { RelatedPosts } from '../components/RelatedPosts';
import { TagList } from '../components/TagList';
import { formatDate, isoDate } from '../lib/format';
import { getPost, neighbours, relatedPosts, seriesFor } from '../lib/posts';
import { tableOfContents } from '../lib/post-builder';
import { canonicalUrl } from '../lib/urls';
import { NotFoundPage } from './NotFoundPage';

export function PostPage() {
  const { slug } = useParams();
  const article = useRef<HTMLDivElement>(null);
  const post = getPost(slug);
  if (!post) return <NotFoundPage what="post" />;

  const { previous, next } = neighbours(post.slug);
  const contents = tableOfContents(post.headings);
  const series = seriesFor(post.slug);

  return (
    <article>
      <ReadingProgress target={article} />
      {/* The reading matter, which is what the progress bar measures: the tags,
          share row, citation, comments and related posts below are not reading. */}
      <div className="post-reading" ref={article}>
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
                  updated{' '}
                  {post.revisions.length > 0 ? (
                    <a href="#revisions">
                      <time dateTime={isoDate(post.updated)}>{formatDate(post.updated)}</time>
                    </a>
                  ) : (
                    <time dateTime={isoDate(post.updated)}>{formatDate(post.updated)}</time>
                  )}
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

        {/* Printed pages leave the address bar behind, so the URL goes on the
            page itself, where a reader can type it back in. */}
        <p className="print-only print-source">{canonicalUrl(`/posts/${post.slug}`)}</p>

        {series ? <SeriesHeader series={series} /> : null}

        <TableOfContents headings={contents} />

        <Suspense fallback={<p className="empty">Loading…</p>}>
          <PostBody slug={post.slug} />
        </Suspense>
      </div>

      {post.tags.length > 0 ? (
        <div className="post-tags">
          <TagList tags={post.tags} />
        </div>
      ) : null}

      <Revisions revisions={post.revisions} />

      <ShareLinks post={post} />

      <CiteBlock post={post} />

      {post.authors.map((author) => (
        <AuthorCard key={author.id} author={author} />
      ))}

      {series ? <SeriesLinks series={series} /> : null}

      {previous || next ? (
        <nav className="post-nav" aria-label="Adjacent posts">
          <div>
            {next ? (
              <Link to={`/posts/${next.slug}`} rel="prev">
                <span className="post-nav__label">Newer post</span>
                {next.title}
              </Link>
            ) : null}
          </div>
          <div className="post-nav__end">
            {previous ? (
              <Link to={`/posts/${previous.slug}`} rel="next">
                <span className="post-nav__label">Older post</span>
                {previous.title}
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}

      <RelatedPosts posts={relatedPosts(post.slug)} />

      <Comments term={`/posts/${post.slug}`} />
    </article>
  );
}
