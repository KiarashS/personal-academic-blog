import { siteConfig } from '../site.config';
import { isEnabled } from './features';
import { siteOwner } from './profiles';

export interface Credit {
  text: string;
  name: string;
  photo?: string;
  href?: string;
}

/**
 * The footer's credit, or nothing when `credit.text` is empty. The portrait is
 * the owner's own, or the front page's while the record has none, so a site
 * with one photo of its owner shows it in both places.
 */
export function footerCredit(): Credit | undefined {
  const text = siteConfig.credit.text.trim();
  if (!text) return undefined;
  const owner = siteOwner();
  const photo = owner.avatar?.trim() || siteConfig.home.avatar.trim() || undefined;
  const href = siteConfig.credit.href.trim() || (isEnabled('about') ? '/about' : undefined);
  return { text, name: owner.name, photo, href };
}
