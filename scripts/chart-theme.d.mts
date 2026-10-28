/** Types for `scripts/chart-theme.mjs`, which the page and the plugin both import. */
export type ChartMode = 'light' | 'dark';

export interface ChartTokens {
  bg: string;
  text: string;
  muted: string;
  rule: string;
  ruleStrong: string;
}

export interface ChartSize {
  name: string;
  width: number | undefined;
  below?: number;
  legend?: string;
}

export const CHART_WIDTH: number;
export const CHART_SIZES: ChartSize[];
export function isFitted(spec: object): boolean;
export function sizesOf(spec: object): ChartSize[];
export function sizeFor(columnWidth: number): ChartSize;
export function atSize<T extends object>(spec: T, size: ChartSize): T;
export const CHART_FONT: string;
export const CHART_TOKENS: Record<ChartMode, ChartTokens>;
export const CHART_PALETTE: Record<ChartMode, string[]>;
export function chartConfig(mode: ChartMode): Record<string, unknown>;
export function prepareSpec<T extends object>(spec: T, readText: (path: string) => string): T;
export function withCrosshair<T extends object>(spec: T, series?: unknown[]): T;
export function seriesOf(spec: object, rows: Record<string, unknown>[] | undefined): unknown[];
