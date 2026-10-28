import {
  atSize,
  chartConfig,
  isFitted,
  sizeFor,
  type ChartMode,
} from '../../scripts/chart-theme.mjs';

/**
 * Charts come to life when a reader reaches for one. The page arrives with
 * each chart drawn by the build in both themes (plugins/charts.ts), which is
 * enough to read it, and Vega is loaded only on the first pointer, touch or
 * focus on a chart: a megabyte of script is not worth fetching for a reader
 * who only scrolls past. It redraws the same spec, at the width of the drawing
 * the column was showing (CHART_SIZES), with the theme the build used, so the
 * live chart lands exactly on the drawing it replaces; then it has tooltips and
 * whatever selections the spec defines. A resize that would have shown another
 * drawing redraws it at that one's width.
 *
 * A chart the build did not draw, in development, is drawn live at once.
 * A theme change redraws every live chart in the other palette.
 */

interface Live {
  chart: HTMLElement;
  host: HTMLElement;
  spec: Record<string, unknown>;
  /** The size it was last drawn at, by name. */
  size?: string;
  finalize?: () => void;
}

/** The size this chart shows at its column's current width. */
const sizeOf = (live: Live) =>
  isFitted(live.spec) ? sizeFor(live.chart.clientWidth) : { name: 'only', width: undefined };

function currentMode(): ChartMode {
  const root = document.documentElement;
  if (root.dataset.theme === 'dark') return 'dark';
  if (root.dataset.theme === 'light') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

async function draw(live: Live): Promise<void> {
  // Noted before the wait, so a resize meanwhile does not start a second drawing.
  const size = sizeOf(live);
  live.size = size.name;
  const { default: embed } = await import('vega-embed');
  live.finalize?.();
  const result = await embed(live.host, atSize(live.spec, size), {
    actions: false,
    config: chartConfig(currentMode()),
    renderer: 'svg',
    tooltip: { theme: 'custom' },
  });
  live.finalize = () => result.finalize();
}

export function liveCharts(container: HTMLElement): () => void {
  const charts = [...container.querySelectorAll<HTMLElement>('.chart')];
  if (charts.length === 0) return () => undefined;

  const lives = new Set<Live>();
  const cleanups: (() => void)[] = [];

  const activate = (chart: HTMLElement) => {
    if (chart.dataset.live !== undefined) return;
    const json = chart.querySelector('.chart__spec')?.textContent;
    if (!json) return;
    chart.dataset.live = '';
    const host = document.createElement('div');
    host.className = 'chart__live';
    chart.insertBefore(host, chart.querySelector('.chart__spec'));
    const live: Live = { chart, host, spec: JSON.parse(json) as Record<string, unknown> };
    lives.add(live);
    draw(live).then(
      () => chart.classList.add('chart--live'),
      () => {
        // The drawing the page arrived with stays: a failed load costs only
        // the tooltips.
        host.remove();
        lives.delete(live);
      },
    );
  };

  for (const chart of charts) {
    if (chart.classList.contains('chart--pending')) {
      activate(chart);
      continue;
    }
    const wake = () => activate(chart);
    const events = ['pointerenter', 'focusin', 'touchstart'] as const;
    for (const name of events) chart.addEventListener(name, wake, { once: true, passive: true });
    cleanups.push(() => {
      for (const name of events) chart.removeEventListener(name, wake);
    });
  }

  const redraw = () => {
    for (const live of lives) void draw(live);
  };
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', redraw);
  const observer = new MutationObserver(redraw);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  const resized = new ResizeObserver(() => {
    for (const live of lives) if (live.size !== sizeOf(live).name) void draw(live);
  });
  for (const chart of charts) resized.observe(chart);

  return () => {
    cleanups.forEach((cleanup) => cleanup());
    media.removeEventListener('change', redraw);
    observer.disconnect();
    resized.disconnect();
    for (const live of lives) live.finalize?.();
  };
}
