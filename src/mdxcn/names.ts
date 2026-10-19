/**
 * The mdxcn components a Markdown file can use, by tag name, and the folder
 * each lives in under `./registry/default`. Read by the build
 * (`plugins/mdxcn.ts`) to recognise a tag, and by `./figure.tsx` to render
 * one; kept free of React so the build can import it.
 *
 * The data-only children some components accept as JSX (`<Event />`,
 * `<Step />`) are not here: in Markdown a component reads its Markdown
 * children instead, which is the form mdxcn's own docs prefer.
 */
export const MDXCN_COMPONENTS = {
  Annotate: 'annotate',
  Callout: 'callout',
  Changelog: 'changelog',
  Chat: 'chat',
  Decision: 'decision',
  Endpoint: 'endpoint',
  Env: 'env',
  Faq: 'faq',
  GraphActivity: 'graph-activity',
  GraphBars: 'graph-bars',
  GraphBoard: 'graph-board',
  GraphBullet: 'graph-bullet',
  GraphCalendar: 'graph-calendar',
  GraphCells: 'graph-cells',
  GraphCheck: 'graph-check',
  GraphCompare: 'graph-compare',
  GraphCountdown: 'graph-countdown',
  GraphDiff: 'graph-diff',
  GraphFlow: 'graph-flow',
  GraphFunnel: 'graph-funnel',
  GraphGantt: 'graph-gantt',
  GraphHeatmap: 'graph-heatmap',
  GraphInvoice: 'graph-invoice',
  GraphKpi: 'graph-kpi',
  GraphMatrix: 'graph-matrix',
  GraphMeter: 'graph-meter',
  GraphPlot: 'graph-plot',
  GraphRank: 'graph-rank',
  GraphScore: 'graph-score',
  GraphSheet: 'graph-sheet',
  GraphSlope: 'graph-slope',
  GraphSpark: 'graph-spark',
  GraphSpec: 'graph-spec',
  GraphStack: 'graph-stack',
  GraphStat: 'graph-stat',
  GraphTable: 'graph-table',
  GraphTimeline: 'graph-timeline',
  GraphTimer: 'graph-timer',
  GraphTree: 'graph-tree',
  GraphUptime: 'graph-uptime',
  GraphWaffle: 'graph-waffle',
  GraphWaterfall: 'graph-waterfall',
  Keys: 'keys',
  Quote: 'quote',
  Steps: 'steps',
  Terminal: 'terminal',
} as const;

export type MdxcnName = keyof typeof MDXCN_COMPONENTS;
