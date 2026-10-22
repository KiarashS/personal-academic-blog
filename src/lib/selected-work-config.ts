import entries from '../content/publications.bib';
import { isEnabled } from './features';
import { selectedWorkWarnings } from './selected-work';
import { siteConfig } from '../site.config';

/**
 * The front page's selected work, checked against the site's own bibliography.
 * Nothing to say when there is no front page to put it on.
 */
export function configuredSelectedWorkWarnings(): string[] {
  if (!isEnabled('home')) return [];
  return selectedWorkWarnings(entries, siteConfig.home.selectedWork);
}
