import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import './index.css'

// After a new Vercel deploy, lazy-loaded chunk hashes change. If a visitor has
// the old SPA in their browser tab and clicks a link, React tries to import a
// chunk URL that no longer exists → 404. Listening for vite's preload-failure
// event and forcing a full reload fetches the new index.html and correct
// chunks, making the navigation succeed transparently instead of showing a
// blank page or the app's own 404 route.
window.addEventListener('vite:preloadError', () => {
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
)