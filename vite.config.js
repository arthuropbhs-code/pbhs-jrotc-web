import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Split large, slow-changing vendor libraries into their own chunks
        // (separate from the app code and from each other) so a deploy that
        // only touches app code doesn't invalidate the browser's cached copy
        // of React/Firebase/Framer Motion, and so no single chunk balloons
        // past the 500kB warning threshold.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          // Analytics is intentionally left OUT of vendor-firebase: it's
          // loaded via dynamic import() in firebase.js so it gets its own
          // chunk, fetched lazily after first render instead of bundled
          // into the eager chunk every single page pays for.
          if (id.includes('firebase/analytics') || id.includes('@firebase/analytics')) return;
          if (id.includes('firebase') || id.includes('@firebase')) return 'vendor-firebase';
          if (id.includes('framer-motion')) return 'vendor-motion';
          if (id.includes('react-router') || id.includes('/react/') || id.includes('/react-dom/')) return 'vendor-react';
        },
      },
    },
  },
})