import { useState, useEffect, useRef, useCallback } from "react"
import { io } from "socket.io-client"
import "./App.css"

const TESTER_URL = import.meta.env.VITE_TESTER_URL || "http://localhost:3099"
const PATUIH_URL = import.meta.env.VITE_PATUIH_URL || "http://localhost:8000"
const WS_URL = import.meta.env.VITE_WS_URL || TESTER_URL
const API_BASE = window.location.origin.startsWith("file") ? TESTER_URL : window.location.origin
const socket = io(WS_URL)

const EVENTS = ["chat.message", "chat.join", "chat.leave", "order.created", "webhook.test"]
const COLORS = ["#58a6ff", "#7ee787", "#f0883e", "#db6d28", "#bc8cff", "#ff7b72", "#79c0ff", "#56d364"]

function getColor(name) {
  let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

function timeAgo(ts) {
  const sec = Math.floor((Date.now() - new Date(ts).getTime()) / 1000)
  if (sec < 60) return "now"
  if (sec < 3600) return `${Math.floor(sec / 60)}m`
  if (sec < 86400) return `${Math.floor(sec / 3600)}h`
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" })
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
}

// ===== LOBBY =====
function Lobby({ onEnter }) {
  const [name, setName] = useState(() => localStorage.getItem("chat_name") || "User")
  const [room, setRoom] = useState(() => localStorage.getItem("chat_room") || "general")
  const [key, setKey] = useState(() => localStorage.getItem("chat_key") || "")
  const [error, setError] = useState("")

  const handle = (action) => {
    const n = name.trim() || "User"
    const r = room.trim() || "general"
    const k = key.trim()
    if (action === "create" && !k) { setError("API Key required to create a room"); setTimeout(() => setError(""), 3000); return }
    localStorage.setItem("chat_name", n)
    localStorage.setItem("chat_room", r)
    localStorage.setItem("chat_key", k)
    onEnter({ name: n, room: r, key: k, action })
  }

  return (
    <div className="lobby">
      <div className="lobby-card">
        <div className="logo">💬</div>
        <h1>Patuih Chat</h1>
        <p className="sub">Real-time messaging powered by webhook gateway</p>
        <div className="field">
          <label>Display Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div className="field">
          <label>Room</label>
          <input value={room} onChange={e => setRoom(e.target.value)} placeholder="general" />
        </div>
        <div className="field">
          <label>API Key <span className="muted">— required to send messages</span></label>
          <input value={key} onChange={e => setKey(e.target.value)} placeholder="pt_live_..." type="password" />
        </div>
        {error && <div className="error-msg">{error}</div>}
        <div className="btns">
          <button className="btn primary" onClick={() => handle("join")}>🔊 Join Room</button>
          <button className="btn success" onClick={() => handle("create")}>✨ Create Room</button>
        </div>
      </div>
    </div>
  )
}

// ===== MESSAGE =====
function Message({ msg, isOwn }) {
  const [showJson, setShowJson] = useState(false)
  if (msg.type === "system") return <div className="msg system"><span>{msg.text}</span></div>

  return (
    <div className={`msg ${isOwn ? "own" : "other"}`}>
      {!isOwn && (
        <div className="avatar" style={{ background: getColor(msg.sender) }}>
          {msg.sender.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="bubble">
        <div className="header">
          {!isOwn && <span className="name" style={{ color: getColor(msg.sender) }}>{msg.sender}</span>}
          <span className="time">{formatTime(msg.timestamp)}</span>
          {msg.status === "sending" && <span className="status sending">⏳</span>}
          {msg.status === "failed" && <span className="status failed">✕</span>}
        </div>
        <div className="text">{msg.text}</div>
        {msg.rawData && (
          <>
            <button className="json-btn" onClick={() => setShowJson(!showJson)}>
              {showJson ? "hide" : "show"} raw
            </button>
            {showJson && <pre className="json">{JSON.stringify(msg.rawData, null, 2)}</pre>}
          </>
        )}
      </div>
      {isOwn && (
        <div className="avatar own" style={{ background: getColor(msg.sender) }}>
          {msg.sender.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}

// ===== CHAT =====
function Chat({ user, room, key, onLeave }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState("")
  const [event, setEvent] = useState("chat.message")
  const [sending, setSending] = useState(false)
  const [warn, setWarn] = useState(false)
  const [users, setUsers] = useState([user])
  const endRef = useRef(null)

  useEffect(() => {
    const onMsg = (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        const text = msg.data?.text || msg.data?.message || JSON.stringify(msg.data || {})
        return [...prev, { id: msg.id, eventType: msg.event, text, sender: msg.sender || "unknown", rawData: msg, type: "received", timestamp: msg.timestamp || new Date().toISOString(), status: "delivered" }]
      })
      if (msg.sender && !msg.sender.startsWith("sys_")) setUsers(prev => prev.includes(msg.sender) ? prev : [...prev, msg.sender])
    }
    const onWebhook = (ev) => {
      const body = ev.body || {}; const data = body.data || {}
      setMessages(prev => prev.some(m => m.id === ev.id) ? prev : [...prev, { id: ev.id, eventType: body.event || "unknown", text: data.text || data.message || JSON.stringify(data), sender: data.sender || body.sender || "unknown", rawData: body, type: "received", timestamp: ev.receivedAt || new Date().toISOString(), status: "delivered" }])
    }
    socket.on("chat-message", onMsg)
    socket.on("webhook", onWebhook)
    socket.on("cleared", () => setMessages([]))
    return () => { socket.off("chat-message", onMsg); socket.off("webhook", onWebhook); socket.off("cleared", () => setMessages([])) }
  }, [])

  useEffect(() => {
    setMessages([{ id: "sys", eventType: "system", text: `${user} joined #${room}`, sender: "", rawData: null, type: "system", timestamp: new Date().toISOString() }])
    fetch(API_BASE + "/api/webhooks").then(r => r.json()).then(logs => logs.forEach(ev => {
      const body = ev.body || {}; const d = body.data || {}
      setMessages(prev => prev.some(m => m.id === ev.id) ? prev : [...prev, { id: ev.id, eventType: body.event || "unknown", text: d.text || d.message || JSON.stringify(d), sender: d.sender || body.sender || "unknown", rawData: body, type: "received", timestamp: ev.receivedAt || new Date().toISOString(), status: "delivered" }])
    })).catch(() => {})
  }, [room, user])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const send = useCallback(async () => {
    const t = text.trim(); if (!t) return
    if (!key) { setWarn(true); setTimeout(() => setWarn(false), 3000); return }
    setWarn(false)
    const id = "m_" + Date.now().toString(36)
    const ts = new Date().toISOString()
    setMessages(prev => [...prev, { id, eventType: event, text: t, sender: user, rawData: null, type: "sent", timestamp: ts, status: "sending" }])
    setText(""); setSending(true)
    try {
      const r = await fetch(API_BASE + "/api/send-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patuihUrl: PATUIH_URL, apiKey: key, channel: room, event, data: { room, text: t, sender: user, timestamp: ts }, sender: user }) })
      const j = await r.json()
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: j.sent ? "sent" : "failed" } : m))
    } catch { setMessages(prev => prev.map(m => m.id === id ? { ...m, status: "failed" } : m)) }
    finally { setSending(false) }
  }, [text, key, event, room, user])

  return (
    <div className="chat">
      <header>
        <div className="brand">💬 Patuih Chat</div>
        <div className="room-info">
          <span className="hash">#</span><span className="rname">{room}</span>
          <span className="dot" />
          <span className="ucount">{users.length} online</span>
        </div>
        <button className="leave" onClick={onLeave}>Leave</button>
      </header>

      <div className="layout">
        <aside>
          <div className="section">
            <h3>Online</h3>
            {users.map(u => (
              <div key={u} className="online-user">
                <span className="indicator" />
                <span>{u === user ? "You" : u}</span>
              </div>
            ))}
          </div>
          <div className="section">
            <h3>Webhook URL</h3>
            <div className="url-box">
              <code>{window.location.origin}/webhook</code>
              <button onClick={() => { navigator.clipboard.writeText(window.location.origin + "/webhook") }}>Copy</button>
            </div>
            <p className="note">Register in Patuih → Endpoints</p>
          </div>
          <div className="section flex">
            <h3>Events</h3>
            <div className="event-list">
              {EVENTS.map(e => <span key={e} className={`ev-chip ${event === e ? "active" : ""}`} onClick={() => setEvent(e)}>{e}</span>)}
            </div>
          </div>
        </aside>

        <main>
          <div className="msgs">
            {messages.map(m => <Message key={m.id} msg={m} isOwn={m.sender === user} />)}
            <div ref={endRef} />
          </div>
          <div className="composer">
            <input value={text} onChange={e => setText(e.target.value)} placeholder="Type a message..." onKeyDown={e => e.key === "Enter" && !sending && send()} />
            <button onClick={send} disabled={sending || !text.trim()}>{sending ? "Sending..." : "Send"}</button>
            {warn && <span className="warn">Enter API Key</span>}
          </div>
        </main>
      </div>
    </div>
  )
}

// ===== APP =====
export default function App() {
  const [session, setSession] = useState(null)
  return session ? <Chat {...session} onLeave={() => setSession(null)} /> : <Lobby onEnter={(s) => { if (s.action === "create" && s.key) fetch(API_BASE + "/api/send-event", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patuihUrl: PATUIH_URL, apiKey: s.key, channel: s.room, event: "chat.join", data: { room: s.room, sender: s.name }, sender: s.name }) }).catch(() => {}); setSession(s) }} />
}
