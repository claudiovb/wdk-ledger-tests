import { execFile } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import { NodeGlobalsPolyfillPlugin } from '@esbuild-plugins/node-globals-polyfill'
import { NodeModulesPolyfillPlugin } from '@esbuild-plugins/node-modules-polyfill'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const BITCOIN_RPC_HOST = '127.0.0.1'
const BITCOIN_RPC_PORT = 18443
const BITCOIN_DATA_DIR = resolve(__dirname, '.regtest-data')
const BITCOIN_CLI_BASE_ARGS = [
  '-regtest',
  `-rpcconnect=${BITCOIN_RPC_HOST}`,
  `-rpcport=${BITCOIN_RPC_PORT}`,
  `-datadir=${BITCOIN_DATA_DIR}`
]

function runBitcoinCli (args) {
  return new Promise((resolve, reject) => {
    execFile('bitcoin-cli', [...BITCOIN_CLI_BASE_ARGS, ...args], { encoding: 'utf8' }, (err, stdout, stderr) => {
      if (err) {
        reject(new Error(stderr?.trim() || err.message))
        return
      }
      resolve(stdout.trim())
    })
  })
}

function regtestFaucetPlugin () {
  return {
    name: 'regtest-faucet',
    configureServer (server) {
      server.middlewares.use('/api/faucet/btc', async (req, res, next) => {
        if (req.method !== 'POST') return next()

        try {
          const body = await new Promise((resolve, reject) => {
            let raw = ''
            req.on('data', (chunk) => { raw += chunk.toString() })
            req.on('end', () => {
              try { resolve(raw ? JSON.parse(raw) : {}) } catch (e) { reject(e) }
            })
          })

          const address = body?.address
          const amount = Number(body?.amount || 1)

          if (!address) throw new Error('address is required')
          if (Number.isNaN(amount) || amount <= 0) throw new Error('amount must be > 0')

          // Get a separate address for mining (to avoid creating immature coinbase for user)
          const miningAddr = await runBitcoinCli(['getnewaddress'])
          const txid = await runBitcoinCli(['sendtoaddress', address, String(amount)])
          // Mine 1 block to confirm the transaction, then mine 100 more to mature any coinbase
          // This ensures coinbase transactions are mature and can be spent
          await runBitcoinCli(['generatetoaddress', '1', miningAddr])
          await runBitcoinCli(['generatetoaddress', '100', miningAddr])

          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ txid, minedBlocks: 101 }))
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: e?.message || String(e) }))
        }
      })
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    regtestFaucetPlugin(),
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
     exclude: ['@tetherto/wdk-wallet-evm'],
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
      '@ledgerhq/context-module',
      '@ledgerhq/device-management-kit',
      '@ledgerhq/device-transport-kit-web-hid',
      '@ledgerhq/device-signer-kit-ethereum',
      '@ledgerhq/signer-utils',
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
  server: {
    fs: {
      allow: [
        '/Users/claudiovilasboas/Desktop/Tether/wdk-ledger-tests/web'
      ],
    },
  },
})
