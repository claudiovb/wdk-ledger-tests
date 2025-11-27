import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Provide global Buffer/process automatically
      protocolImports: true,
      globals: {
        Buffer: true,
        process: true,
      },
      // Polyfill common node libs
      modules: {
        buffer: true,
        process: true,
        util: true,
        stream: true,
        events: true,
        crypto: true,
        assert: true,
        path: true,
        string_decoder: true,
      },
    }),
  ],
  define: {
    'process.env': {},
    global: 'globalThis',
  },
  resolve: {
    alias: {
      stream: 'stream-browserify',
      crypto: 'crypto-browserify',
      util: 'util',
      assert: 'assert',
      events: 'events',
      path: 'path-browserify',
      string_decoder: 'string_decoder',
    },
  },
  optimizeDeps: {
    include: [
      'buffer',
      'process',
      'sodium-universal',
      'sodium-javascript',
      'stream-browserify',
      'crypto-browserify',
      'util',
      'assert',
      'events',
      'path-browserify',
      'string_decoder',
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
      plugins: [
        NodeGlobalsPolyfillPlugin({
          process: true,
          buffer: true,
        }),
        NodeModulesPolyfillPlugin(),
      ],
    },
  },
})
