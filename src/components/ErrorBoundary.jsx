import React from 'react';

// React error boundaries have to be class components - there's no hook
// equivalent (getDerivedStateFromError/componentDidCatch aren't available
// as hooks). Without this, any render-time error anywhere in the tree blanks
// the whole page to white with nothing but a browser console error - this
// catches that and shows a real, brand-matched recovery screen instead.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Uncaught render error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6 text-center">
          <div className="max-w-md">
            <h1 className="text-3xl font-black uppercase italic tracking-tighter mb-3">
              Something Went <span className="text-yellow-500">Wrong</span>
            </h1>
            <p className="text-slate-400 text-sm font-medium mb-8">
              An unexpected error occurred. Reloading the page usually fixes this - if it
              keeps happening, let S6 know what you were doing when it broke.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-yellow-500 text-slate-950 px-8 py-4 rounded-2xl font-black uppercase text-sm hover:bg-yellow-400 transition-all"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
