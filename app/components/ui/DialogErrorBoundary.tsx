"use client";

import { Component, type ReactNode } from "react";
import QueryErrorState from "@/app/components/ui/QueryErrorState";
import { logger } from "@/app/lib/logger";


interface DialogErrorBoundaryProps {
  children: ReactNode;
  /** Optional callback fired when the user clicks retry (before remount). */
  onReset?: () => void;
}

interface DialogErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render errors thrown inside a dialog body (e.g. a MUI date picker
 * blowing up) and renders a recoverable error state *inside the dialog*,
 * instead of letting the error bubble to the route-level boundary — which
 * would unmount the whole page and leave the user staring at a blank screen
 * with no idea their action failed.
 */
export default class DialogErrorBoundary extends Component<
  DialogErrorBoundaryProps,
  DialogErrorBoundaryState
> {
  state: DialogErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): DialogErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    logger.error("[DialogErrorBoundary]", error);
  }

  private handleRetry = () => {
    this.props.onReset?.();
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return <QueryErrorState onRetry={this.handleRetry} dense />;
    }
    return this.props.children;
  }
}
