import { useMemo, useState } from "react";

import { WalletAccountEvm } from "@tetherto/wdk-wallet-evm";

export default function EvmTester() {
  const [path, setPath] = useState(`0'/0/12345`);
  const [providerUrl, setProviderUrl] = useState(
    "https://ethereum-sepolia.publicnode.com"
  );
  const [signerType, setSignerType] = useState("seed"); // 'seed' | 'ledger'
  const [seed, setSeed] = useState(
    "test test test test test test test test test test test junk"
  );

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

  const handleCreateSigner = async () => {
    setStatus("creating signer…");
    appendLog(
      `createSigner: type=${signerType} path=${path} provider=${providerUrl}`
    );
    try {
      if (signerType === "seed") {
        const w = WalletAccountEvm.fromSeed(seed, path, {
          provider: providerUrl,
        });
        setWallet(w);
        appendLog("seed signer created");
      } else {
        appendLog(
          "ledger selected: please ensure 'Ethereum' app is open on your Ledger device."
        );
        const { LedgerSignerEvm } = await import(
          "@tetherto/wdk-wallet-evm/signers"
        );
        const signer = new LedgerSignerEvm(path);
        const w = new WalletAccountEvm(signer, { provider: providerUrl });
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
            }. Ensure WebHID is allowed, device is unlocked, and Ethereum app is open.`,
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
      appendLog(`balance: ${display} wei`);
    } catch (e) {
      appendLog(`getBalance error: ${e?.message || e}`, "error");
    } finally {
      setStatus("idle");
    }
  };

  const handleSignMessage = async () => {
    if (!wallet) return;
    const msg = "Hello from WDK EVM test";
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
      const ok = await wallet.verify("Hello from WDK EVM test", signature);
      appendLog(`verify result: ${ok}`);
    } catch (e) {
      appendLog(`verify error: ${e?.message || e}`, "error");
    } finally {
      setStatus("idle");
    }
  };

  const handleSignTx = async () => {
    setStatus("signing transaction…");
    appendLog("signTransaction clicked");
    // For parity with BtcTester, keep this as a placeholder for now.
    setTimeout(() => {
      appendLog("tx signed: <placeholder>");
      setStatus("idle");
    }, 250);
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
          <label style={{ flex: 1, minWidth: 280 }}>
            Provider URL:{" "}
            <input
              value={providerUrl}
              onChange={(e) => setProviderUrl(e.target.value)}
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
          <button onClick={handleSignTx}>Sign Transaction</button>
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
            <b>Balance (wei):</b> {balance}
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
