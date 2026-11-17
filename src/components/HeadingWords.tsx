import type { Heading } from '../lib/types';

/**
 * A heading as the contents list, the rail and the contents sheet show it: its
 * markup when it holds maths, which the build rendered (`Heading.html`), and
 * its words otherwise.
 */
export function HeadingWords({ heading }: { heading: Heading }) {
  if (!heading.html) return <>{heading.text}</>;
  return <span className="heading-words" dangerouslySetInnerHTML={{ __html: heading.html }} />;
}
