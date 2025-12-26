import { useMemo, useState } from "react";

import { ElectrumWs, WalletAccountBtc } from "@tetherto/wdk-wallet-btc";
import { SeedSignerBtc } from "@tetherto/wdk-wallet-btc/signers";
import LedgerSignerBtc from "@tetherto/wdk-wallet-btc/signers/ledger";

export default function BtcTester() {
  const [signerType, setSignerType] = useState("seed"); // 'seed' | 'ledger'
  const [seed, setSeed] = useState(
    "test test test test test test test test test test test junk"
  );
  const [path, setPath] = useState(`0'/0/0`);
  const [network, setNetwork] = useState("regtest");
  const [electrumUrl, setElectrumUrl] = useState("ws://127.0.0.1:50044");

  const [status, setStatus] = useState("idle");
  const [address, setAddress] = useState("—");
  const [balance, setBalance] = useState("—");
  const [wallet, setWallet] = useState(null);
  const [signature, setSignature] = useState("");
  const [logs, setLogs] = useState([]);

  const appendLog = (msg, level = "info") => {
    setLogs((prev) => [...prev, { msg, level }]);
    (level === "error" ? console.error : console.log)(msg);
  };

  const fieldRowStyle = useMemo(
    () => ({ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }),
    []
  );

  const buildConfig = () => ({
    client: new ElectrumWs(electrumUrl),
    network,
    bip: 84, // default to Native SegWit
  });

  const handleCreateSigner = async () => {
    setStatus("creating signer…");
    appendLog(
      `createSigner: type=${signerType} path=${path} network=${network} electrum=${electrumUrl}`
    );
    try {
      const config = buildConfig();
      config.network = "testnet";
      if (signerType === "seed") {
        const root = new SeedSignerBtc(seed, config);
        const child = root.derive(path);
        const w = new WalletAccountBtc(child);
        setWallet(w);
        appendLog("seed signer created");
      } else {
        appendLog(
          "ledger selected: ensure 'Bitcoin' app is open on your Ledger device."
        );
        const signer = new LedgerSignerBtc(path, config);
        appendLog(`signer: ${signer}`);
        const w = new WalletAccountBtc(signer);
        appendLog(`wallet: ${w}`);
        setWallet(w);
        appendLog(
          "ledger signer initialized. Attempting connection via WebHID…"
        );
        setStatus("connecting ledger…");
        try {
          const resolvedAddr = await w.getAddress();
          setAddress(resolvedAddr);
          appendLog(`ledger address: ${resolvedAddr}`);
        } catch (e) {
          appendLog(
            `ledger connect error: ${
              e?.message || e
            }. Ensure WebHID is allowed, device is unlocked, and Bitcoin app is open.`,
            "error"
          );
          setStatus("idle");
          return;
        }
      }
      setStatus("ready");
    } catch (e) {
      appendLog(`createSigner error: ${e?.message || e}`, "error");
      setStatus("idle");
    }
  };

  const handleGetAddress = async () => {
    if (!wallet) return;
    setStatus("getting address…");
    appendLog("getAddress clicked");
    try {
      const addr = await wallet.getAddress();
      setAddress(addr);
      appendLog(`address: ${addr}`);
    } catch (e) {
      appendLog(`getAddress error: ${e?.message || e}`, "error");
    } finally {
      setStatus("idle");
    }
  };

  const handleGetBalance = async () => {
    if (!wallet) return;
    setStatus("getting balance…");
    appendLog("getBalance clicked");
    try {
      const value = await wallet.getBalance();
      const display =
        typeof value === "bigint" ? value.toString() : String(value);
      setBalance(display);
      appendLog(`balance: ${display} sats`);
    } catch (e) {
      appendLog(`getBalance error: ${e?.message || e}`, "error");
    } finally {
      setStatus("idle");
    }
  };

  const handleSignMessage = async () => {
    if (!wallet) return;
    const msg = "Hello from WDK BTC test";
    setStatus("signing message…");
    appendLog(`signMessage: "${msg}"`);
    try {
      const sig = await wallet.sign(msg);
      setSignature(sig);
      appendLog(`signature: ${sig}`);
    } catch (e) {
      appendLog(`signMessage error: ${e?.message || e}`, "error");
    } finally {
      setStatus("idle");
    }
  };

  const handleVerifyMessage = async () => {
    if (!wallet) return;
    setStatus("verifying…");
    appendLog("verifyMessage clicked");
    try {
      const ok = await wallet.verify("Hello from WDK BTC test", signature);
      appendLog(`verify result: ${ok}`);
    } catch (e) {
      appendLog(`verify error: ${e?.message || e}`, "error");
    } finally {
      setStatus("idle");
    }
  };

  const handleSignTx = async () => {
    if (!wallet) return;
    setStatus("signing transaction…");
    const to =
      address && address !== "—"
        ? address
        : "bcrt1q0000000000000000000000000000000000000x"; // placeholder address if none
    const valueSats = 1000n; // 1000 sats
    appendLog(`sendTransaction: to=${to} value=${valueSats.toString()} sats`);
    try {
      const { hash, fee } = await wallet.sendTransaction({
        to,
        value: valueSats,
      });
      appendLog(`tx hash: ${hash}`);
      if (fee !== undefined) {
        const feeDisplay =
          typeof fee === "bigint" ? fee.toString() : String(fee);
        appendLog(`estimated fee: ${feeDisplay} sats`);
      }
    } catch (e) {
      appendLog(`sendTransaction error: ${e?.message || e}`, "error");
    } finally {
      setStatus("idle");
    }
  };

  const handleDispose = () => {
    setStatus("disposing…");
    appendLog("dispose clicked");
    try {
      wallet?.dispose?.();
    } catch (e) {
      appendLog(`dispose error: ${e?.message || e}`, "error");
    }
    setWallet(null);
    setAddress("—");
    setBalance("—");
    setSignature("");
    appendLog("disposed");
    setStatus("idle");
  };

  return (
    <div>
      <div className="card">
        <div style={fieldRowStyle}>
          <label>
            Signer type:{" "}
            <select
              value={signerType}
              onChange={(e) => setSignerType(e.target.value)}
            >
              <option value="seed">Seed</option>
              <option value="ledger">Ledger</option>
            </select>
          </label>
          <label>
            Derivation path:{" "}
            <input value={path} onChange={(e) => setPath(e.target.value)} />
          </label>
          <label>
            Network:{" "}
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            >
              <option value="regtest">regtest</option>
              <option value="testnet">testnet</option>
              <option value="bitcoin">mainnet</option>
            </select>
          </label>
          <label style={{ flex: 1, minWidth: 280 }}>
            Electrum WS URL:{" "}
            <input
              value={electrumUrl}
              onChange={(e) => setElectrumUrl(e.target.value)}
              style={{ width: "100%" }}
            />
          </label>
        </div>

        {signerType === "seed" && (
          <div style={fieldRowStyle}>
            <label style={{ flex: 1, minWidth: 320 }}>
              Seed phrase:{" "}
              <input
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                style={{ width: "100%" }}
              />
            </label>
          </div>
        )}

        <div style={fieldRowStyle}>
          <button onClick={handleCreateSigner}>Create Signer</button>
          <button onClick={handleGetAddress} disabled={!wallet}>
            Get Address
          </button>
          <button onClick={handleGetBalance} disabled={!wallet}>
            Get Balance
          </button>
          <button onClick={handleSignMessage} disabled={!wallet}>
            Sign Message
          </button>
          <button
            onClick={handleVerifyMessage}
            disabled={!wallet || !signature}
          >
            Verify Message
          </button>
          <button onClick={handleSignTx} disabled={!wallet}>
            Send Transaction
          </button>
          <button onClick={handleDispose}>Dispose</button>
        </div>

        <div>
          <div>
            <b>Status:</b> {status}
          </div>
          <div>
            <b>Address:</b> {address}
          </div>
          <div>
            <b>Balance (sats):</b> {balance}
          </div>
        </div>
      </div>

      <div className="card">
        <b>Console</b>
        <pre
          style={{
            whiteSpace: "pre-wrap",
            marginTop: 8,
            maxHeight: 240,
            overflow: "auto",
          }}
        >
          {logs.map((l) => `[${l.level}] ${l.msg}`).join("\n")}
        </pre>
      </div>
    </div>
  );
}
