import { useState } from "react";
import "./App.css";
import BtcTester from "./components/BtcTester.jsx";
import EvmTester from "./components/EvmTester.jsx";

export default function App() {
  const [view, setView] = useState("home");

  return (
    <>
      {view === "home" && (
        <div>
          <h1>WDK Ledger Tests</h1>
          <div className="card">
            <p className="read-the-docs">Choose a signer to test:</p>
            <button onClick={() => setView("btc")}>Bitcoin (Ledger)</button>
            <button onClick={() => setView("evm")}>Ethereum (EVM)</button>
          </div>
        </div>
      )}

      {view === "btc" && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <button onClick={() => setView("home")}>← Back</button>
            <h2 style={{ margin: 0 }}>Bitcoin (Ledger) Test</h2>
          </div>
          <BtcTester />
        </div>
      )}

      {view === "evm" && (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <button onClick={() => setView("home")}>← Back</button>
            <h2 style={{ margin: 0 }}>Ethereum (EVM) Test</h2>
          </div>
          <EvmTester />
        </div>
      )}
    </>
  );
}
