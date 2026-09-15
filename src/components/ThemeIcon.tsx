/**
 * The three theme states, drawn rather than typed.
 *
 * These were `◐ ☀ ☾` — characters, which means the visitor's system chose the
 * shape, the weight and whether they arrived in colour. Every other icon here
 * is a 24-unit path this repository owns, and these are now too: same grid,
 * same 1.7 stroke, same round caps as the feed mark beside them.
 *
 * `auto` is the outline with half of it filled, which is the convention for
 * "whatever your system says" and the only one of the three a reader has to be
 * taught. The label under it teaches them: it is in the button, for screen
 * readers, and it is the button's tooltip.
 */
const PATHS = {
  // A disc and eight rays.
  light:
    'M12 2.6v2.3M12 19.1v2.3M2.6 12h2.3M19.1 12h2.3M5.3 5.3l1.7 1.7M17 17l1.7 1.7M18.7 5.3 17 7M7 17l-1.7 1.7',
  // A crescent: the moon, cut by the arc of its own shadow.
  dark: 'M20.1 14.6A8.5 8.5 0 0 1 9.4 3.9a8.5 8.5 0 1 0 10.7 10.7z',
} as const;

export function ThemeIcon({ of }: { of: 'auto' | 'light' | 'dark' }) {
  return (
    <svg
      className="theme-toggle__icon"
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      width="17"
      height="17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {of === 'light' ? <circle cx="12" cy="12" r="4.1" /> : null}
      {of === 'auto' ? (
        <>
          <circle cx="12" cy="12" r="8.4" />
          {/* The filled half. Drawn as its own arc rather than a clipped
              circle, so it keeps its edge at any size. */}
          <path d="M12 3.6a8.4 8.4 0 0 1 0 16.8z" fill="currentColor" stroke="none" />
        </>
      ) : (
        <path d={PATHS[of]} />
      )}
    </svg>
  );
}
