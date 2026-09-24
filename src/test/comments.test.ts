import { describe, expect, it } from 'vitest';
import { commentState, commentWarnings, commentsConfigured, commentsShown } from '../lib/comments';
import { giscusTheme } from '../lib/giscus';
import { canonicalUrl } from '../lib/urls';
import { siteConfig } from '../site.config';

describe('commentState', () => {
  it('reads the two spellings of each answer', () => {
    expect(commentState(true, 'off')).toBe('on');
    expect(commentState('on', 'off')).toBe('on');
    expect(commentState(false, 'on')).toBe('off');
    expect(commentState('off', 'on')).toBe('off');
    expect(commentState('readonly', 'on')).toBe('readonly');
  });

  it('falls back to the site default when the post says nothing', () => {
    expect(commentState(undefined, 'on')).toBe('on');
    expect(commentState(undefined, 'off')).toBe('off');
    expect(commentState(undefined, 'readonly')).toBe('readonly');
  });

  it('falls back rather than guessing at something it cannot read', () => {
    // `comments: no` in YAML is the string "no", not a boolean. Reading it as
    // off would make `comments: yes` silently mean on, which is the same
    // mistake with the opposite result.
    for (const written of ['no', 'yes', 'true', 1, 0, null, {}, []]) {
      expect(commentState(written, 'on'), JSON.stringify(written)).toBe('on');
    }
  });
});

describe('commentsShown', () => {
  it('keeps a thread in both of the states that have one', () => {
    expect(commentsShown('on')).toBe(true);
    expect(commentsShown('readonly')).toBe(true);
    expect(commentsShown('off')).toBe(false);
  });
});

describe('giscusTheme', () => {
  it('uses the built-in themes when the post takes comments', () => {
    expect(giscusTheme('on', false)).toBe('light');
    expect(giscusTheme('on', true)).toBe('dark_dimmed');
  });

  it('hands giscus a stylesheet of the site’s own when they are closed', () => {
    expect(giscusTheme('readonly', false)).toBe(canonicalUrl('/giscus/readonly-light.css'));
    expect(giscusTheme('readonly', true)).toBe(canonicalUrl('/giscus/readonly-dark.css'));
  });

  it('gives an absolute address, since giscus does the fetching, not the page', () => {
    expect(giscusTheme('readonly', false)).toMatch(/^https?:\/\//);
  });

  it('follows the theme in both states', () => {
    expect(giscusTheme('on', false)).not.toBe(giscusTheme('on', true));
    expect(giscusTheme('readonly', false)).not.toBe(giscusTheme('readonly', true));
  });
});

describe('commentsConfigured', () => {
  it('is the site-wide off switch, which predates the per-post one', () => {
    expect(commentsConfigured({ ...siteConfig.giscus, repoId: '' })).toBe(false);
    expect(commentsConfigured({ ...siteConfig.giscus, categoryId: '' })).toBe(false);
  });
});

describe('commentWarnings', () => {
  it('says nothing about a post that leaves it out or writes it properly', () => {
    for (const written of [undefined, null, true, false, 'on', 'off', 'readonly']) {
      expect(commentWarnings('a-post', written), JSON.stringify(written)).toEqual([]);
    }
  });

  it('catches a value that would quietly leave the post on the default', () => {
    // The failure worth catching: a post meant to have its comments closed
    // keeps taking them, and nothing on the page looks wrong.
    const problems = commentWarnings('a-post', 'no');
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain('a-post');
    expect(problems[0]).toContain('"no"');
  });
});
