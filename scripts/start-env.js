// ESM script to bootstrap regtest bitcoind + electrs, mine funds, and start a WS->TCP proxy.
// After setup, the script exits so "&& vite" can run. Background processes stay alive.
import { execSync, spawn } from 'node:child_process'
import net from 'node:net'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const ROOT = resolve(__dirname, '..')

const HOST = '127.0.0.1'
const RPC_PORT = 18443
const ELECTRUM_TCP_PORT = 50001
const WS_PROXY_PORT = 50044
const DATA_DIR = resolve(ROOT, '.regtest-data')

const BITCOIN_CLI = `bitcoin-cli -regtest -rpcconnect=${HOST} -rpcport=${RPC_PORT} -datadir=${DATA_DIR}`

function checkBinary (name) {
  try {
    execSync(`${name} --version`, { stdio: ['ignore', 'pipe', 'ignore'] })
    return true
  } catch {
    return false
  }
}

function killOnPort (port) {
  try {
    execSync(`lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`, { stdio: 'ignore' })
  } catch {}
}

function waitUntil (predicate, timeoutMs = 20000, intervalMs = 100) {
  return new Promise((resolve, reject) => {
    const start = Date.now()
    const tick = async () => {
      try {
        const ok = await predicate()
        if (ok) return resolve()
      } catch {}
      if (Date.now() - start > timeoutMs) return reject(new Error('Timeout waiting for condition'))
      setTimeout(tick, intervalMs)
    }
    tick()
  })
}

function waitPortOpen (host, port, timeoutMs = 20000) {
  return waitUntil(() => new Promise(res => {
    const socket = net.createConnection({ host, port }, () => {
      socket.end(); res(true)
    })
    socket.on('error', () => { socket.destroy(); res(false) })
    socket.unref()
  }), timeoutMs)
}

function bitcoinCall (cmd, raw = false) {
  const out = execSync(`${BITCOIN_CLI} ${cmd}`, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  return raw ? out : JSON.parse(out)
}

async function main () {
  if (!checkBinary('bitcoind') || !checkBinary('electrs')) {
    console.error('Missing required binaries:')
    console.error(`- bitcoind (Bitcoin Core)`)
    console.error(`- electrs`)
    process.exit(1)
  }

  try { execSync(`${BITCOIN_CLI} stop`, { stdio: 'ignore' }) } catch {}
  try { execSync(`rm -rf "${resolve(DATA_DIR, 'regtest')}"`, { stdio: 'ignore' }) } catch {}
  try { execSync(`mkdir -p "${DATA_DIR}"`, { stdio: 'ignore' }) } catch {}
  killOnPort(RPC_PORT)
  killOnPort(ELECTRUM_TCP_PORT)
  killOnPort(WS_PROXY_PORT)

  // Start bitcoind (daemonized)
  execSync(
    'bitcoind -regtest -daemon ' +
    '-server=1 ' +
    '-txindex=1 ' +
    '-fallbackfee=0.0001 ' +
    '-paytxfee=0.0001 ' +
    '-minrelaytxfee=0.000001 ' +
    `-rpcbind=${HOST} ` +
    `-rpcport=${RPC_PORT} ` +
    `-datadir="${DATA_DIR}"`,
    { stdio: 'ignore' }
  )

  // Wait for bitcoind RPC
  await waitUntil(() => {
    try { bitcoinCall('getblockchaininfo'); return true } catch { return false }
  })

  // Start electrs
  const electrs = spawn('electrs', [
    '--network', 'regtest',
    '--daemon-dir', DATA_DIR,
    '--electrum-rpc-addr', `${HOST}:${ELECTRUM_TCP_PORT}`
  ], { stdio: 'ignore', detached: true })
  electrs.unref()

  await waitPortOpen(HOST, ELECTRUM_TCP_PORT)

  // Wallet + initial mining
  try { bitcoinCall('createwallet testwallet', true) } catch {}
  const addr = bitcoinCall('getnewaddress', true)
  bitcoinCall(`generatetoaddress 101 ${addr}`, false)

  // Start WS proxy that forwards to electrum TCP
  const proxy = spawn(process.execPath, [
    resolve(__dirname, 'ws-proxy.js'),
    `--tcp-host=${HOST}`,
    `--tcp-port=${ELECTRUM_TCP_PORT}`,
    `--ws-port=${WS_PROXY_PORT}`
  ], { stdio: 'inherit', detached: true })
  proxy.unref()

  // Ensure the WS port is accepting TCP before exiting
  await waitPortOpen(HOST, WS_PROXY_PORT)

  console.log('[regtest] bitcoind + electrs ready')
  console.log(`[regtest] WS proxy listening on ws://${HOST}:${WS_PROXY_PORT}`)
  console.log('[regtest] You can now run Vite.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})


