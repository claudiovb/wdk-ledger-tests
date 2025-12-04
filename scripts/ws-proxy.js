// Simple WebSocket <-> Electrum TCP proxy for browser ElectrumWs clients.
import { WebSocketServer } from 'ws'
import net from 'node:net'
import process from 'node:process'

function arg (name, def) {
  const p = process.argv.find(a => a.startsWith(`--${name}=`))
  return p ? p.slice(name.length + 3) : def
}

const TCP_HOST = arg('tcp-host', '127.0.0.1')
const TCP_PORT = Number(arg('tcp-port', '50001'))
const WS_PORT = Number(arg('ws-port', '50044'))

const wss = new WebSocketServer({ port: WS_PORT })
wss.on('listening', () => {
  console.log(`[ws-proxy] listening on ws://127.0.0.1:${WS_PORT} -> tcp://${TCP_HOST}:${TCP_PORT}`)
})
wss.on('error', (err) => {
  console.error('[ws-proxy] server error:', err)
})

wss.on('connection', (ws) => {
  const sock = net.createConnection({ host: TCP_HOST, port: TCP_PORT })
  let closed = false
  const closeBoth = () => {
    if (closed) return
    closed = true
    try { sock.destroy() } catch { /* ignore */ }
    try { ws.close() } catch { /* ignore */ }
  }

  sock.on('connect', () => console.log('[ws-proxy] tcp connected'))
  sock.on('error', (e) => { console.error('[ws-proxy] tcp error:', e.message); closeBoth() })
  ws.on('error', (e) => { console.error('[ws-proxy] ws error:', e.message); closeBoth() })

  ws.on('message', (data) => {
    try {
      const msg = typeof data === 'string' ? data : data.toString()
      sock.write(msg + '\n')
    } catch {
      closeBoth()
    }
  })

  sock.on('data', (chunk) => {
    const lines = chunk.toString().split('\n').filter(Boolean)
    for (const line of lines) {
      try { ws.send(line) } catch { closeBoth() }
    }
  })

  ws.on('close', closeBoth)
  sock.on('close', closeBoth)
})


