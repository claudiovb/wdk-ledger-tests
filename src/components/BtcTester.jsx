import { useMemo, useState } from "react";

// import { LedgerSignerBtc } from "@tetherto/wdk-wallet-btc/signers";
import { ElectrumWs, WalletAccountBtc } from "@tetherto/wdk-wallet-btc";
export default function BtcTester() {
  const [path, setPath] = useState(`19999'/0/0`);
  const [accountIndex, setAccountIndex] = useState(0);
  const [network, setNetwork] = useState("regtest");
  const [status, setStatus] = useState("idle");
  const [address, setAddress] = useState("—");
  const [balance, setBalance] = useState("—");
  const [wallet, setWallet] = useState(null);
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
      `createSigner: path=${path} accountIndex=${accountIndex} network=${network}`
    );
    console.log("Creating signer");
    // const signer = new LedgerSignerBtc(path, { bip: 84, network: network });
    const wallet = new WalletAccountBtc(
      "cook voyage document eight skate token alien guide drink uncle term abuse",
      "0'/0/0",
      {
        client: new ElectrumWs("ws://127.0.0.1:50044"),
        network: "regtest",
      }
    );
    console.log("Wallet created");
    setWallet(wallet);
    // setWallet(signer);
    setTimeout(() => {
      console.log("signer created", wallet);
      // console.log("wallet created", wallet);
      setStatus("ready");
      appendLog("signer created");
    }, 200);
  };

  const handleGetAddress = async () => {
    setStatus("getting address…");
    appendLog("getAddress clicked");
    const addr = await wallet.getAddress();
    setAddress(addr);
    appendLog(`address: ${addr}`);
    setTimeout(() => {
      setStatus("idle");
    }, 150);
  };

  const handleGetBalance = async () => {
    setStatus("getting balance…");
    appendLog("getBalance clicked");
    const value = await wallet.getBalance();
    const display =
      typeof value === "bigint" ? value.toString() : String(value);
    setBalance(display);
    appendLog(`balance: ${display} sats`);
    setTimeout(() => {
      setStatus("idle");
    }, 150);
  };

  const handleSignMessage = async () => {
    const msg = "Hello from WDK test";
    setStatus("signing message…");
    appendLog(`signMessage: "${msg}"`);
    // TODO (wire later): const sig = await wallet.sign(msg)
    setTimeout(() => {
      appendLog("signature: <placeholder-hex>");
      setStatus("idle");
    }, 200);
  };

  const handleVerifyMessage = async () => {
    setStatus("verifying…");
    appendLog("verifyMessage clicked");
    // TODO (wire later): const ok = await wallet.verify(msg, sig)
    setTimeout(() => {
      appendLog("verify result: true (placeholder)");
      setStatus("idle");
    }, 150);
  };

  const handleSignTx = async () => {
    setStatus("signing transaction…");
    appendLog("signTransaction clicked");
    // TODO (wire later): build regtest PSBT and call signer.signPsbt(psbt)
    setTimeout(() => {
      appendLog("psbt signed: <placeholder>");
      setStatus("idle");
    }, 250);
  };

  const handleDispose = () => {
    setStatus("disposing…");
    appendLog("dispose clicked");
    // TODO (wire later): wallet?.dispose(); signer?.dispose();
    setAddress("—");
    setStatus("idle");
  };

  return (
    <div>
      <div className="card">
        <div style={fieldRowStyle}>
          <label>
            Derivation path:{" "}
            <input value={path} onChange={(e) => setPath(e.target.value)} />
          </label>
          <label>
            Account index:{" "}
            <input
              type="number"
              min={0}
              value={accountIndex}
              onChange={(e) =>
                setAccountIndex(parseInt(e.target.value || "0", 10))
              }
              style={{ width: 100 }}
            />
          </label>
          <label>
            Network:{" "}
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
            >
              <option value="testnet">testnet</option>
              <option value="bitcoin">mainnet</option>
            </select>
          </label>
        </div>

        <div style={fieldRowStyle}>
          <button onClick={handleCreateSigner}>Create Signer</button>
          <button onClick={handleGetAddress}>Get Address</button>
          <button onClick={handleGetBalance}>Get Balance</button>
          <button onClick={handleSignMessage}>Sign Message</button>
          <button onClick={handleVerifyMessage}>Verify Message</button>
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
