import markSource from '../content/logo-mark.svg?raw';

/**
 * The logo beside the site's name in the header.
 *
 * The flat mark rather than the frosted logo: at the size of a line of type the
 * frost is a smudge, and the header is the one place on the site that has to
 * stay quiet. In `currentColor` it takes the ink of the title it sits next to,
 * so it follows a manual light or dark choice and not only the system one —
 * which is also why it is inlined rather than loaded as an `img`, since an
 * image would keep whatever colour the file was drawn in.
 *
 * The name is already right there in text, so the drawing is decoration and
 * says nothing to a screen reader.
 */
const markup = markSource
  .replace(/ role="img"/, '')
  .replace(/ aria-label="[^"]*"/, ' aria-hidden="true" focusable="false"');

export function SiteMark() {
  return <span className="site-mark" dangerouslySetInnerHTML={{ __html: markup }} />;
}
