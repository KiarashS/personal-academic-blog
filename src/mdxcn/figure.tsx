import type { ComponentType, ReactNode } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import type { Root } from 'hast';
import { toJsxRuntime, type Options } from 'hast-util-to-jsx-runtime';
import cssHref from './mdxcn.css?url';
import { StillMotion } from './motion';
import type { MdxcnName } from './names';
import { Annotate } from './registry/default/annotate/annotate';
import { Callout } from './registry/default/callout/callout';
import { Changelog } from './registry/default/changelog/changelog';
import { Chat } from './registry/default/chat/chat';
import { Decision } from './registry/default/decision/decision';
import { Endpoint } from './registry/default/endpoint/endpoint';
import { Env } from './registry/default/env/env';
import { Faq } from './registry/default/faq/faq';
import { GraphActivity } from './registry/default/graph-activity/graph-activity';
import { GraphBars } from './registry/default/graph-bars/graph-bars';
import { GraphBoard } from './registry/default/graph-board/graph-board';
import { GraphBullet } from './registry/default/graph-bullet/graph-bullet';
import { GraphCalendar } from './registry/default/graph-calendar/graph-calendar';
import { GraphCells } from './registry/default/graph-cells/graph-cells';
import { GraphCheck } from './registry/default/graph-check/graph-check';
import { GraphCompare } from './registry/default/graph-compare/graph-compare';
import { GraphCountdown } from './registry/default/graph-countdown/graph-countdown';
import { GraphDiff } from './registry/default/graph-diff/graph-diff';
import { GraphFlow } from './registry/default/graph-flow/graph-flow';
import { GraphFunnel } from './registry/default/graph-funnel/graph-funnel';
import { GraphGantt } from './registry/default/graph-gantt/graph-gantt';
import { GraphHeatmap } from './registry/default/graph-heatmap/graph-heatmap';
import { GraphInvoice } from './registry/default/graph-invoice/graph-invoice';
import { GraphKpi } from './registry/default/graph-kpi/graph-kpi';
import { GraphMatrix } from './registry/default/graph-matrix/graph-matrix';
import { GraphMeter } from './registry/default/graph-meter/graph-meter';
import { GraphPlot } from './registry/default/graph-plot/graph-plot';
import { GraphRank } from './registry/default/graph-rank/graph-rank';
import { GraphScore } from './registry/default/graph-score/graph-score';
import { GraphSheet } from './registry/default/graph-sheet/graph-sheet';
import { GraphSlope } from './registry/default/graph-slope/graph-slope';
import { GraphSpark } from './registry/default/graph-spark/graph-spark';
import { GraphSpec } from './registry/default/graph-spec/graph-spec';
import { GraphStack } from './registry/default/graph-stack/graph-stack';
import { GraphStat } from './registry/default/graph-stat/graph-stat';
import { GraphTable } from './registry/default/graph-table/graph-table';
import { GraphTimeline } from './registry/default/graph-timeline/graph-timeline';
import { GraphTimer } from './registry/default/graph-timer/graph-timer';
import { GraphTree } from './registry/default/graph-tree/graph-tree';
import { GraphUptime } from './registry/default/graph-uptime/graph-uptime';
import { GraphWaffle } from './registry/default/graph-waffle/graph-waffle';
import { GraphWaterfall } from './registry/default/graph-waterfall/graph-waterfall';
import { Keys } from './registry/default/keys/keys';
import { Quote } from './registry/default/quote/quote';
import { Steps } from './registry/default/steps/steps';
import { Terminal } from './registry/default/terminal/terminal';

/** Every component, by the name a Markdown file writes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- each has its own props
const COMPONENTS: Record<MdxcnName, ComponentType<any>> = {
  Annotate,
  Callout,
  Changelog,
  Chat,
  Decision,
  Endpoint,
  Env,
  Faq,
  GraphActivity,
  GraphBars,
  GraphBoard,
  GraphBullet,
  GraphCalendar,
  GraphCells,
  GraphCheck,
  GraphCompare,
  GraphCountdown,
  GraphDiff,
  GraphFlow,
  GraphFunnel,
  GraphGantt,
  GraphHeatmap,
  GraphInvoice,
  GraphKpi,
  GraphMatrix,
  GraphMeter,
  GraphPlot,
  GraphRank,
  GraphScore,
  GraphSheet,
  GraphSlope,
  GraphSpark,
  GraphSpec,
  GraphStack,
  GraphStat,
  GraphTable,
  GraphTimeline,
  GraphTimer,
  GraphTree,
  GraphUptime,
  GraphWaffle,
  GraphWaterfall,
  Keys,
  Quote,
  Steps,
  Terminal,
};

/** The stylesheet each figure's shadow root links, built from `./mdxcn.css`. */
export const FIGURE_CSS = cssHref;

export interface FigureData {
  component: string;
  props: Record<string, unknown>;
}

/**
 * The prefix for the ids React makes inside a figure. Each figure is a React
 * root of its own and every root starts from the same first id, so without it
 * two figures on a page would both have `_R_0_`. The build numbers them.
 */
export const figureIds = (figure: string | null): string => `mdxcn-${figure ?? '0'}-`;

/** What the build wrote on an `<mdxcn-figure>`: the component and its props. */
export function figureData(component: string | null, props: string | null): FigureData | null {
  if (!component || !(component in COMPONENTS)) return null;
  try {
    const parsed = JSON.parse(props ?? '{}') as unknown;
    return {
      component,
      props: parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {},
    };
  } catch {
    return { component, props: {} };
  }
}

/**
 * The figure's Markdown children as React elements, which is what the
 * components read: they look for an `li`, a `strong`, a `table` by tag name,
 * the way they would under MDX.
 */
// Declared as returning the global `JSX.Element`, which React 19's types no
// longer define; what it returns is a React element.
const toReact = toJsxRuntime as unknown as (tree: Root, options: Options) => ReactNode;

export function childrenOf(tree: Root): ReactNode {
  return toReact(tree, { Fragment, jsx, jsxs });
}

/**
 * One figure. `still` draws it where its motion would end: on the server, so
 * the prerendered page is not a set of empty frames, and on the hydrating
 * render in the browser, which has to match it. See `./motion.ts`.
 */
export function Figure({
  data,
  children,
  still,
}: {
  data: FigureData;
  children: ReactNode;
  still: boolean;
}) {
  const Component = COMPONENTS[data.component as MdxcnName];
  return (
    <StillMotion.Provider value={still}>
      <Component {...data.props}>{children}</Component>
    </StillMotion.Provider>
  );
}
