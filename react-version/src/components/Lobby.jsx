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

  if (!tab) {
    return (
      <div className="lobby">
        <div className="lobby-card">
          <div className="logo">💬</div>
          <h1>Patuih Chat</h1>
          <p className="sub">Real-time messaging powered by webhook gateway</p>
          <div className="btns" style={{ flexDirection: "column", gap: 10 }}>
            <button className="btn primary" onClick={() => { setTab("join"); setName(localStorage.getItem("chat_name") || ""); setApiKey(localStorage.getItem("chat_key") || "") }} style={{ padding: 14, fontSize: 15 }}>
              🔊 Join Room
            </button>
            <button className="btn success" onClick={() => { setTab("create"); setName(localStorage.getItem("chat_name") || ""); setApiKey(localStorage.getItem("chat_key") || ""); setGeneratedRoom(genId()) }} style={{ padding: 14, fontSize: 15 }}>
              ✨ Create Room
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
        <button className="back-btn" onClick={() => setTab(null)}>← Back</button>
        <h1 style={{ marginTop: 8 }}>{tab === "join" ? "🔊 Join Room" : "✨ Create Room"}</h1>

        <div className="field">
          <label>Your Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Display name" autoFocus />
        </div>

        <div className="field">
          <label>Room ID</label>
          {tab === "create" ? (
            <div className="copy-box">
              <input value={generatedRoom} readOnly className="mono" />
              <button onClick={() => { navigator.clipboard.writeText(generatedRoom); alert("Copied!") }}>Copy</button>
            </div>
          ) : (
            <input value={room} onChange={e => setRoom(e.target.value)} placeholder="Paste room ID here" />
          )}
          <span className="hint">{tab === "create" ? "Bagikan ID ini ke teman" : "Masukkan ID room yang dibagikan"}</span>
        </div>

        <div className="field">
          <label>API Key {tab === "join" ? <span className="muted">— opsional, untuk kirim pesan</span> : <span className="muted">— untuk kirim pesan</span>}</label>
          <input value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="pt_live_..." type="password" />
          <span className="hint">{tab === "join" ? "Kosongkan jika hanya ingin membaca pesan" : "Generate dari Patuih → API Keys"}</span>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <div className="btns" style={{ marginTop: 16 }}>
          {tab === "join" ? (
            <button className="btn primary" onClick={handleJoin}>Join Room</button>
          ) : (
            <button className="btn success" onClick={handleCreate}>Create Room</button>
          )}
        </div>
      </div>
    </div>
  )
}
