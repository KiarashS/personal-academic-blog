export interface ShareTarget {
  /** What the button says, and its accessible name with the title appended. */
  label: string;
  href: string;
}

/**
 * Where a post can be sent, as plain links. Each service takes the URL and a
 * line of text in its query string, so sharing costs no third-party script and
 * works with the page as it was served — nothing here observes the reader.
 */
export function shareTargets(title: string, url: string): ShareTarget[] {
  const text = encodeURIComponent(title);
  const link = encodeURIComponent(url);

  return [
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${link}` },
    { label: 'X', href: `https://x.com/intent/post?text=${text}&url=${link}` },
    // Bluesky has no separate url field: the post is one line of text.
    {
      label: 'Bluesky',
      href: `https://bsky.app/intent/compose?text=${encodeURIComponent(`${title} ${url}`)}`,
    },
    {
      label: 'Email',
      href: `mailto:?subject=${text}&body=${encodeURIComponent(`${title}\n${url}`)}`,
    },
  ];
}
