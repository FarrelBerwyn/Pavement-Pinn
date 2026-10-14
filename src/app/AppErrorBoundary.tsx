import React from 'react';

interface AppErrorBoundaryProps {
  children: React.ReactNode;
}

interface AppErrorBoundaryState {
  error: Error | null;
  /** Bumped on retry so the subtree remounts from scratch. */
  attempt: number;
}

/**
 * Last line of defence: without a boundary, one component throwing during render or in
 * an effect makes React unmount the entire application and leaves a blank page (this is
 * what the map zero-size crash did). The boundary keeps the page usable and offers a
 * retry. It does not hide errors: the message is shown and logged.
 */
export class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<AppErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    console.error('PAVEMENT-PINN view crashed:', error, info?.componentStack);
  }

  private retry = (): void => {
    this.setState((previous) => ({ error: null, attempt: previous.attempt + 1 }));
  };

  render(): React.ReactNode {
    if (!this.state.error) {
      return <React.Fragment key={this.state.attempt}>{this.props.children}</React.Fragment>;
    }

    return (
      <div className="h-screen w-screen bg-[#0b0f19] text-slate-100 flex items-center justify-center p-6" role="alert">
        <div className="bg-[#121622] border border-white/15 rounded-3xl max-w-lg w-full p-6 space-y-4">
          <h1 className="text-lg font-black text-white">Tampilan mengalami galat</h1>
          <p className="text-sm text-slate-300">
            Sebuah komponen berhenti bekerja. Data sesi di peramban tidak terpengaruh. Coba muat ulang tampilan.
          </p>
          <p className="text-xs font-mono text-amber-300 break-words">{this.state.error.message}</p>
          <div className="flex flex-wrap gap-2">
            <button onClick={this.retry} className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 font-black text-xs cursor-pointer">
              Muat ulang tampilan
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/15 text-slate-200 font-bold text-xs cursor-pointer"
            >
              Muat ulang halaman
            </button>
          </div>
        </div>
      </div>
    );
  }
}
