import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { looksLikeMissingChunk, recoverFromMissingChunk } from '../lib/recover';

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
  /**
   * Starts true because the server renders this too, where there is no
   * `navigator` to ask, and because that is the state the button belongs in.
   * `componentDidMount` replaces it with the truth.
   */
  online: boolean;
}

/**
 * A route's code and a post's text are separate chunks, fetched on navigation.
 * Offline, a page the reader has not visited before cannot load them, and
 * without this the screen simply goes blank. Says so instead, and offers the
 * one thing that helps — once there is a network for it to help with.
 */
export class RouteBoundary extends Component<Props, State> {
  state: State = { failed: false, online: true };

  private readonly follow = (): void => this.setState({ online: navigator.onLine });

  static getDerivedStateFromError(): Partial<State> {
    return { failed: true };
  }

  componentDidMount(): void {
    this.follow();
    window.addEventListener('online', this.follow);
    window.addEventListener('offline', this.follow);
  }

  componentWillUnmount(): void {
    window.removeEventListener('online', this.follow);
    window.removeEventListener('offline', this.follow);
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
          {this.state.online
            ? 'The site keeps the pages you have already visited and fetches the rest when you are connected.'
            : 'You are offline. The site keeps the pages you have already visited; this is not one of them.'}
        </p>
        {/*
         * Offline the button has nothing to do — recovery clears the cache and
         * reloads, which without a network leaves the reader worse off than
         * this message — so it waits for the connection to come back, which
         * the listeners above notice.
         */}
        {this.state.online ? (
          <p>
            <button
              className="header-icon theme-toggle"
              onClick={() => {
                void recoverFromMissingChunk({ force: true });
              }}
              type="button"
            >
              Try again
            </button>
          </p>
        ) : null}
      </section>
    );
  }
}
