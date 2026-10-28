// pseudocode.js ships no types; this is the one call the build makes.
declare module 'pseudocode' {
  interface Options {
    lineNumber?: boolean;
    lineNumberPunc?: string;
    noEnd?: boolean;
    captionCount?: number;
    indentSize?: string;
    commentDelimiter?: string;
    titlePrefix?: string;
    scopeLines?: boolean;
  }
  const pseudocode: { renderToString(input: string, options?: Options): string };
  export default pseudocode;
}
