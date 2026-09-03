import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/**
 * A route's code and a post's text are separate chunks, fetched on navigation.
 * Offline, a page the reader has not visited before cannot load them, and
 * without this the screen simply goes blank. Says so instead, and offers the
 * one thing that helps.
 */
export class RouteBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Route failed to render', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;

    return (
      <section className="route-error">
        <h1>This page could not be loaded</h1>
        <p>
          It is probably not available offline: the site keeps the pages you have already visited,
          and fetches the rest when you are connected.
        </p>
        <p>
          <button type="button" className="theme-toggle" onClick={() => window.location.reload()}>
            Try again
          </button>
        </p>
      </section>
    );
  }
}
