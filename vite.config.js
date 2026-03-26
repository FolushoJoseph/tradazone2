import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Build size budget limits in KB
const SIZE_LIMITS = {
  // Maximum size for any single chunk (KB)
  maxChunkSize: 500,
  // Maximum size for the DataContext chunk specifically (KB)
  maxDataContextSize: 50,
  // Maximum total bundle size (KB)
  maxTotalSize: 1000,
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [react()],
    // Base path is driven by VITE_BASE_PATH so staging and production
    // can deploy to different sub-paths without code changes.
    base: env.VITE_BASE_PATH || '/Tradazone/',
    build: {
      // Enable compressed size reporting for monitoring bundle sizes
      reportCompressedSize: true,
      // Set chunk size warnings to prevent large bundles
      chunkSizeWarningLimit: SIZE_LIMITS.maxChunkSize,
      rollupOptions: {
        output: {
          // Manual chunking to optimize loading
          manualChunks: (id) => {
            // Separate DataContext into its own chunk for size monitoring
            if (id.includes('DataContext')) {
              return 'data-context';
            }
            // Separate wallet-related code into its own chunk
            if (id.includes('@lobstrco/signer-extension-api') || id.includes('get-starknet') || id.includes('ethers')) {
              return 'wallet';
            }
            // UI libraries
            if (id.includes('lucide-react')) {
              return 'ui';
            }
            // Auth context and related
            if (id.includes('react-router-dom')) {
              return 'auth';
            }
          },
        },
      },
    },
    test: {
      environment: 'happy-dom',
      globals: true,
      setupFiles: './src/test/setup.js',
    },
  }
})
