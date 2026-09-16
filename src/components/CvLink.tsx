import { siteConfig } from '../site.config';
import { withBase } from '../lib/urls';

const isUrl = (value: string): boolean => /^https?:\/\//i.test(value);

/**
 * The site owner's CV, beside the navigation, where an academic reader looks
 * for it. It is a document rather than a route, so it opens in its own tab —
 * a PDF that replaces the page you were reading is a small rudeness — and
 * with no `cv` in the config nothing is rendered at all.
 *
 * Rendered twice: once in the header's own nav and once on the narrow-screen
 * sheet, which builds its list from `navFor` and so cannot pick this up on its
 * own. Without the second one a phone had no way to the CV at all — the header
 * nav it sits in is the part that is hidden at that width, and unlike the feed
 * it has no second home in the footer.
 *
 * `onClick` is the sheet's: the link opens a new tab and leaves this one where
 * it was, so nothing else would close the menu behind it.
 */
export function CvLink({ onClick }: { onClick?: () => void }) {
  const cv = siteConfig.cv.trim();
  if (!cv) return null;

  return (
    <a
      className="cv-link"
      href={isUrl(cv) ? cv : withBase(cv)}
      onClick={onClick}
      target="_blank"
      rel="noopener noreferrer"
    >
      CV
    </a>
  );
}
