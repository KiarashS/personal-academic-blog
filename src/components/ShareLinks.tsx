import { CopyButton } from './CopyButton';
import { PrintButton } from './PrintButton';
import { shareTargets } from '../lib/share';
import { canonicalUrl } from '../lib/urls';
import type { Post } from '../lib/types';

/**
 * Where to send a post. Every target is an ordinary link built at render time,
 * so no share widget, script or beacon loads, and the links work from the
 * prerendered HTML before React takes over.
 */
export function ShareLinks({ post }: { post: Post }) {
  const url = canonicalUrl(`/posts/${post.slug}`);

  return (
    <section className="share" aria-labelledby="share-heading">
      <h2 className="share__heading" id="share-heading">
        Share
      </h2>
      <ul className="share__list">
        {shareTargets(post.title, url).map((target) => {
          const mail = target.href.startsWith('mailto:');
          return (
            <li key={target.label}>
              <a
                className="share__link"
                href={target.href}
                {...(mail ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
              >
                {target.label}
                <span className="visually-hidden"> — share “{post.title}”</span>
              </a>
            </li>
          );
        })}
        <li>
          <CopyButton
            className="share__copy"
            name="Copy link"
            text={url}
            label="to the clipboard"
          />
        </li>
        <li>
          <PrintButton />
        </li>
      </ul>
    </section>
  );
}
