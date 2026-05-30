/*global chrome*/

import { useState, useEffect } from "react";
import "./App.css";

function sendMsg(msg) {
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.sendMessage) {
    return new Promise((resolve) => chrome.runtime.sendMessage("fpcmcnfaennhkaicnddiphaehgfcnkai", msg, resolve));
  }
}

function StreakDisplay({ days, broken }) {
  const flames = Math.min(Math.floor(days / 7) + 1, 5);
  return (
    <div className={`streak-card ${broken ? "broken" : ""}`}>
      <div className="streak-flames">
        {Array.from({ length: flames }).map((_, i) => (
          <span key={i} className="flame" style={{ animationDelay: `${i * 0.15}s` }}>🔥</span>
        ))}
      </div>
      <div className="streak-number">{days}</div>
      <div className="streak-label">{days === 1 ? "day clean" : "days clean"}</div>
      {broken && (
        <div className="broken-badge">streak reset</div>
      )}
    </div>
  );
}

function DomainManager({ domains, defaultDomains, onAdd, onRemove }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function normalizeDomain(raw) {
    try {
      const s = raw.trim().toLowerCase();
      const withProto = s.startsWith("http") ? s : `https://${s}`;
      return new URL(withProto).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }

  function handleAdd() {
    const domain = normalizeDomain(input);
    if (!domain) {
      setError("Enter a valid domain like example.com");
      return;
    }
    if (domains.includes(domain)) {
      setError("Already in the list");
      return;
    }
    setError("");
    setInput("");
    onAdd(domain);
  }

  return (
    <div className="domain-manager">
      <div className="section-title">Blocked Sites</div>
      <div className="add-row">
        <input
          className="domain-input"
          placeholder="e.g. example.com"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button className="add-btn" onClick={handleAdd}>+</button>
      </div>
      {error && <div className="error-msg">{error}</div>}
      <div className="domain-list">
        {domains.map((d) => (
          <div key={d} className="domain-row">
            <span className="domain-name">
              {defaultDomains.includes(d) && <span className="default-tag">default</span>}
              {d}
            </span>
            <button className="remove-btn" onClick={() => onRemove(d)} title="Remove">×</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [state, setState] = useState(null);
  const [tab, setTab] = useState("streak");
  const [loading, setLoading] = useState(true);

  async function loadState() {
    const s = await sendMsg({ type: "GET_STATE" });
    setState(s);
    setLoading(false);
  }

  useEffect(() => { loadState(); }, []);

  async function handleAdd(domain) {
    await sendMsg({ type: "ADD_DOMAIN", domain });
    loadState();
  }

  async function handleRemove(domain) {
    await sendMsg({ type: "REMOVE_DOMAIN", domain });
    loadState();
  }

  async function handleRestart() {
    await sendMsg({ type: "RESTART_STREAK" });
    loadState();
  }

  if (loading) return <div className="loading">Loading…</div>;

  return (
    <div className="app">
      <header className="header">
        <div className="logo">PornSite<span>Blocker</span></div>
        <nav className="nav">
          <button className={tab === "streak" ? "nav-btn active" : "nav-btn"} onClick={() => setTab("streak")}>Streak</button>
          <button className={tab === "block" ? "nav-btn active" : "nav-btn"} onClick={() => setTab("block")}>Blocklist</button>
        </nav>
      </header>

      <main className="main">
        {tab === "streak" && (
          <div className="streak-tab">
            <StreakDisplay days={state.days} broken={state.broken} />
            <div className="streak-meta">
              {state.streakStart && (
                <span>Started {new Date(state.streakStart).toLocaleDateString()}</span>
              )}
            </div>
            <div className="motivation">
              {state.days === 0 && "Every journey begins with a single day. You've got this."}
              {state.days >= 1 && state.days < 7 && "First week is the hardest. Keep going!"}
              {state.days >= 7 && state.days < 30 && "One week down. You're building real momentum."}
              {state.days >= 30 && state.days < 90 && "30+ days. Incredible discipline. Keep it up."}
              {state.days >= 90 && "90+ days. You're an inspiration. Absolutely crushing it."}
            </div>
            {state.broken && (
              <button className="restart-btn" onClick={handleRestart}>
                Start Fresh →
              </button>
            )}
            {!state.broken && state.days > 0 && (
              <button className="reset-btn" onClick={async () => {
                if (confirm("Reset your streak?")) {
                  await sendMsg({ type: "RESET_STREAK" });
                  loadState();
                }
              }}>
                Reset streak
              </button>
            )}
          </div>
        )}

        {tab === "block" && (
          <DomainManager
            domains={state.domains}
            defaultDomains={state.defaultDomains}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        )}
      </main>
    </div>
  );
}
