import { useState } from "react"

const CHAT_SERVER = import.meta.env.VITE_CHAT_SERVER || "http://localhost:3099"

function genId() {
  return "room_" + Date.now().toString(36).slice(-6) + Math.random().toString(36).slice(2, 6)
}

export default function Lobby({ onEnter }) {
  const [tab, setTab] = useState(null)
  const [name, setName] = useState(() => localStorage.getItem("chat_name") || "")
  const [room, setRoom] = useState("")
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("chat_key") || "")
  const [generatedRoom, setGeneratedRoom] = useState("")
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)

  if (!tab) {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <div className="logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary)" }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
          </div>
          <h1>Patuih Chat</h1>
          <p className="sub">Real-time messaging powered by webhook gateway</p>
          <div className="btns" style={{ flexDirection: "column", gap: 12 }}>
            <button className="btn primary" onClick={() => { setTab("join"); setName(localStorage.getItem("chat_name") || ""); setApiKey(localStorage.getItem("chat_key") || "") }} style={{ padding: 14, fontSize: 15 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 2 }}>
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              Join Room
            </button>
            <button className="btn success" onClick={() => { setTab("create"); setName(localStorage.getItem("chat_name") || ""); setApiKey(localStorage.getItem("chat_key") || ""); setGeneratedRoom(genId()) }} style={{ padding: 14, fontSize: 15 }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 2 }}>
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create Room
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleJoin = () => {
    const n = name.trim() || "User"
    const r = room.trim()
    if (!r) { setError("Enter room ID"); setTimeout(() => setError(""), 3000); return }
    localStorage.setItem("chat_name", n)
    localStorage.setItem("chat_key", apiKey)
    onEnter({ name: n, room: r, apiKey: apiKey })
  }

  const handleCreate = async () => {
    const n = name.trim() || "User"
    const k = apiKey.trim()
    const r = generatedRoom
    if (!k) { setError("API Key required to send messages"); setTimeout(() => setError(""), 3000); return }
    localStorage.setItem("chat_name", n)
    localStorage.setItem("chat_key", k)

    // Simpan API key ke chat server
    try {
      const res = await fetch(`${CHAT_SERVER}/api/rooms`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: r, apiKey: k, createdBy: n }),
      })
      if (!res.ok) { const j = await res.json(); setError(j.error || "Failed"); return }
    } catch { setError("Cannot connect to chat server"); return }

    onEnter({ name: n, room: r, apiKey: k })
  }

  return (
    <div className="lobby">
      <div className="lobby-card">
        <button className="back-btn" onClick={() => setTab(null)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle", marginRight: 6 }}>
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back
        </button>
        <h1 style={{ marginTop: 8, textAlign: "left", display: "flex", alignItems: "center", gap: "8px" }}>
          {tab === "join" ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary)" }}>
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              Join Room
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--success)" }}>
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create Room
            </>
          )}
        </h1>

        <div className="field" style={{ marginTop: 24 }}>
          <label>Your Name</label>
          <input className="input-field" value={name} onChange={e => setName(e.target.value)} placeholder="Display name" autoFocus />
        </div>

        <div className="field">
          <label>Room ID</label>
          {tab === "create" ? (
            <div className="copy-box">
              <input className="input-field mono" value={generatedRoom} readOnly />
              <button onClick={() => { navigator.clipboard.writeText(generatedRoom); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          ) : (
            <input className="input-field" value={room} onChange={e => setRoom(e.target.value)} placeholder="Paste room ID here" />
          )}
          <span className="hint">{tab === "create" ? "Bagikan ID ini ke teman" : "Masukkan ID room yang dibagikan"}</span>
        </div>

        <div className="field">
          <label>
            API Key 
            {tab === "join" ? (
              <span className="muted">— opsional, untuk kirim pesan</span>
            ) : (
              <span className="muted">— untuk kirim pesan</span>
            )}
          </label>
          <input className="input-field" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="pt_live_..." type="password" />
          <span className="hint">
            {tab === "join" ? (
              "Kosongkan jika hanya ingin membaca pesan"
            ) : (
              "Generate dari Patuih → API Keys"
            )}
          </span>
        </div>

        {error && (
          <div className="error-msg">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div className="btns" style={{ marginTop: 24 }}>
          {tab === "join" ? (
            <button className="btn primary" style={{ width: "100%" }} onClick={handleJoin}>Join Room</button>
          ) : (
            <button className="btn success" style={{ width: "100%" }} onClick={handleCreate}>Create Room</button>
          )}
        </div>
      </div>
    </div>
  )
}
