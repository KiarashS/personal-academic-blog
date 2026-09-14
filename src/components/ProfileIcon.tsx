import { PROFILE_ICONS } from '../lib/profile-icons';
import type { ProfileLink } from '../lib/profiles';

/**
 * The glyph for one profile link: the service's own mark where it has one, and
 * a stroked glyph of this site's where it does not.
 *
 * Always beside the service's name, never instead of it. ORCID's ring is
 * recognisable; Semantic Scholar's is not, and a row of eight marks with no
 * words is a puzzle rather than a set of links. The icon is here to be found
 * quickly by someone who already knows which one they want.
 *
 * Hidden from the accessibility tree, since the word next to it says the same
 * thing and says it better.
 */
export function ProfileIcon({ of }: { of: ProfileLink['key'] }) {
  const icon = PROFILE_ICONS[of];
  if (!icon) return null;

  const stroke = icon.kind === 'line';

  return (
    <svg
      className="profile-icon"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill={stroke ? 'none' : 'currentColor'}
      stroke={stroke ? 'currentColor' : undefined}
      strokeWidth={stroke ? 1.7 : undefined}
      strokeLinecap={stroke ? 'round' : undefined}
      strokeLinejoin={stroke ? 'round' : undefined}
    >
      <path d={icon.path} />
    </svg>
  );
}
