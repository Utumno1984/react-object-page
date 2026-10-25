// Internal fixture, NOT exported from the package. The CSS build scans the sources for utility
// classes; the style tests use this file to check that a class used in src ends up in
// styles.css (and that one never used does not).
export const styleFixtureClasses = 'px-2 z-rop-popover font-rop-mono text-rop-body';
