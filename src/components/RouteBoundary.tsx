import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { looksLikeMissingChunk, recoverFromMissingChunk } from '../lib/recover';

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
    // A missing chunk is a stale tab, not a broken page, so try to become the
    // current build rather than sitting on an explanation the reader cannot act
    // on. If the attempt has already been made, the message below stands.
    if (looksLikeMissingChunk(error)) void recoverFromMissingChunk();
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
          <button
            className="theme-toggle"
            onClick={() => {
              void recoverFromMissingChunk({ force: true });
            }}
            type="button"
          >
            Try again
          </button>
        </p>
      </section>
    );
  }
}
