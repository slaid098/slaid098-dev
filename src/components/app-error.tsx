"use client";

import Link from "next/link";
import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  title: string;
};

type State = {
  hasError: boolean;
};

export class AppError extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("App crashed:", error, info);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-md px-6 py-16 text-center">
          <p className="text-lg font-medium text-muted">
            Приложение «{this.props.title}» временно недоступно.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-muted transition hover:border-accent hover:text-accent"
          >
            На главную
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}
