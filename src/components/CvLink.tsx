import { siteConfig } from '../site.config';
import { withBase } from '../lib/urls';

const isUrl = (value: string): boolean => /^https?:\/\//i.test(value);

/**
 * The site owner's CV, beside the navigation, where an academic reader looks
 * for it. It is a document rather than a route, so it opens in its own tab —
 * a PDF that replaces the page you were reading is a small rudeness — and
 * with no `cv` in the config nothing is rendered at all.
 */
export function CvLink() {
  const cv = siteConfig.cv.trim();
  if (!cv) return null;

  return (
    <a
      className="cv-link"
      href={isUrl(cv) ? cv : withBase(cv)}
      target="_blank"
      rel="noopener noreferrer"
    >
      CV
    </a>
  );
}
