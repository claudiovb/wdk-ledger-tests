import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Buffer } from 'buffer'
import process from 'process'

// Minimal Node polyfills for browser usage (bitcoinjs-lib, etc.)
if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer
}
if (!globalThis.process) {
  globalThis.process = process
}
if (!globalThis.process.env) {
  globalThis.process.env = {}
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
