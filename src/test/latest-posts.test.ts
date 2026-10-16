import { describe, expect, it } from 'vitest';
import {
  LATEST_POSTS_PLACEHOLDER,
  fillLatestPosts,
  latestPostsMarkup,
  type LatestPost,
} from '../lib/latest-posts';
import type { LatestPostsConfig } from '../site.config';

const config: LatestPostsConfig = {
  enabled: true,
  count: 2,
  title: 'Latest posts',
  dates: true,
  summaries: false,
  allPostsLabel: 'All posts',
};

const list: LatestPost[] = [
  { slug: 'newest', title: 'Bias & <variance>', date: '2026-03-02', summary: 'The first.' },
  { slug: 'middle', title: 'Middle', date: '2026-02-16', summary: 'The second.' },
  { slug: 'oldest', title: 'Oldest', date: '2026-01-05', summary: 'The third.' },
];

const html = `<p>On <a href="/blog">my blog</a>${LATEST_POSTS_PLACEHOLDER}.</p>`;

describe('fillLatestPosts', () => {
  it('puts the button and the list where the placeholder stands', () => {
    const out = fillLatestPosts(html, list, config);
    expect(out).not.toContain(LATEST_POSTS_PLACEHOLDER);
    expect(out).toMatch(/my blog<\/a><span class="latest-posts" data-latest-posts>/);
    expect(out).toContain('</span></span>.</p>');
  });

  it('lists the newest posts, as many as asked for, linked and dated', () => {
    const out = fillLatestPosts(html, list, config);
    expect(out.match(/class="latest-posts__item"/g)).toHaveLength(2);
    expect(out).toContain('href="/blog/newest"');
    expect(out).not.toContain('Oldest');
    expect(out).toContain('<time class="latest-posts__date" datetime="2026-03-02">');
  });

  it('escapes what a title can hold', () => {
    expect(fillLatestPosts(html, list, config)).toContain('Bias &amp; &lt;variance&gt;');
  });

  it('builds nothing that would close the paragraph it sits in', () => {
    const out = fillLatestPosts(html, list, config);
    // A ul, li or div inside a <p> ends the paragraph when the browser parses it.
    expect(out).not.toMatch(/<(ul|li|div)[\s>]/);
  });

  it('shows summaries, and leaves out the dates or the index link, when told to', () => {
    const out = fillLatestPosts(html, list, {
      ...config,
      summaries: true,
      dates: false,
      allPostsLabel: '',
    });
    expect(out).toContain('<span class="latest-posts__summary">The first.</span>');
    expect(out).not.toContain('<time');
    expect(out).not.toContain('latest-posts__all');
  });

  it('takes the placeholder out and shows nothing when the feature is off or there are no posts', () => {
    expect(fillLatestPosts(html, list, { ...config, enabled: false })).toBe(
      '<p>On <a href="/blog">my blog</a>.</p>',
    );
    expect(fillLatestPosts(html, [], config)).toBe('<p>On <a href="/blog">my blog</a>.</p>');
    expect(fillLatestPosts(html, list, { ...config, count: 0 })).not.toContain('latest-posts');
  });

  it('leaves HTML without the placeholder exactly as it was', () => {
    const plain = '<p>On <a href="/blog">my blog</a>.</p>';
    expect(fillLatestPosts(plain, list, config)).toBe(plain);
  });

  it('leaves a placeholder written in code alone, so home.md can show the syntax', () => {
    const code = `<p>Write <code>${LATEST_POSTS_PLACEHOLDER}</code> here: ${LATEST_POSTS_PLACEHOLDER}</p>`;
    const out = fillLatestPosts(code, list, config);
    expect(out).toContain(`<code>${LATEST_POSTS_PLACEHOLDER}</code>`);
    expect(out.match(/data-latest-posts/g)).toHaveLength(1);
  });

  it('gives each of several lists its own id, so each button controls its own', () => {
    const out = fillLatestPosts(
      `<p>${LATEST_POSTS_PLACEHOLDER} and ${LATEST_POSTS_PLACEHOLDER}</p>`,
      list,
      config,
    );
    expect(out).toContain('aria-controls="latest-posts-1"');
    expect(out).toContain('id="latest-posts-2"');
  });
});

describe('latestPostsMarkup', () => {
  it('names the button and the list for a screen reader', () => {
    const out = latestPostsMarkup(list, config);
    expect(out).toContain(
      '<button type="button" class="latest-posts__toggle" aria-expanded="false"',
    );
    expect(out).toContain('aria-label="Latest posts"');
    expect(out).toContain('role="list"');
  });
});
