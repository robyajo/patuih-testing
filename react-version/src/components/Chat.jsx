import { useState, useEffect, useRef, useCallback } from "react"
import { io } from "socket.io-client"
import Message from "./Message"

const CHAT_SERVER = import.meta.env.VITE_CHAT_SERVER || "http://localhost:3099"
const COLORS = ["#58a6ff", "#7ee787", "#f0883e", "#db6d28", "#bc8cff", "#ff7b72", "#79c0ff", "#56d364"]

function getColor(name) {
  const n = name || "?"
  let hash = 0; for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function Chat({ user, room, apiKey, onLeave }) {
  const [messages, setMessages] = useState([])
  const [text, setText] = useState("")
  const [sending, setSending] = useState(false)
  const [error, setError] = useState("")
  const [users, setUsers] = useState([user])
  const endRef = useRef(null)

  // Socket.IO — terima pesan realtime
  useEffect(() => {
    const socket = io(CHAT_SERVER)
    socket.emit("join-room", room)

    socket.on("chat-message", (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, { id: msg.id, text: msg.text, sender: msg.sender, type: "received", timestamp: msg.timestamp, status: "delivered" }]
      })
      setUsers(prev => prev.includes(msg.sender) ? prev : [...prev, msg.sender])
    })

    return () => { socket.emit("leave-room", room); socket.disconnect() }
  }, [room])

  useEffect(() => {
    setMessages([{ id: "sys", text: `${user} joined #${room}`, type: "system", timestamp: new Date().toISOString() }])
  }, [room, user])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const send = useCallback(async () => {
    const t = text.trim(); if (!t) return
    setError("")
    const id = "msg_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
    setMessages(prev => [...prev, { id, text: t, sender: user, type: "sent", timestamp: new Date().toISOString(), status: "sending" }])
    setText(""); setSending(true)
    try {
      const r = await fetch(`${CHAT_SERVER}/api/rooms/${room}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: user, text: t, id }),
      })
      const j = await r.json()
      if (j.sent) {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, status: "sent" } : m))
      } else {
        setMessages(prev => prev.map(m => m.id === id ? { ...m, status: "failed" } : m))
        if (j.error) setError(j.error)
      }
    } catch {
      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: "failed" } : m))
      setError("Network error")
    } finally { setSending(false) }
  }, [text, room, user])

  return (
    <div className="chat">
      <header>
        <div className="brand">💬 Patuih Chat</div>
        <div className="room-info">
          <span className="hash">#</span><span className="rname">{room}</span>
          <span className="user-label">{user}</span>
          <span className="dot" />
          <span className="ucount">{users.length} online</span>
        </div>
        <div className="header-actions">
          {apiKey && <span className="key-badge" title="Room API Key tersimpan">🔑</span>}
          <span className="room-id" onClick={() => { navigator.clipboard.writeText(room) }}>📋 {room.slice(0, 12)}...</span>
          <button className="leave" onClick={onLeave}>Leave</button>
        </div>
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
            <h3>Room</h3>
            <p className="note">ID: {room}</p>
            <p className="note">User: {user}</p>
          </div>
        </aside>

        <main>
          {error && (
            <div className="error-bar">
              <span>⚠️ {error}</span>
              <button onClick={() => setError("")}>✕</button>
            </div>
          )}
          <div className="msgs">
            {messages.map(m => <Message key={m.id} msg={m} isOwn={m.sender === user} getColor={getColor} />)}
            <div ref={endRef} />
          </div>
          <div className="composer">
            <input value={text} onChange={e => setText(e.target.value)}
              placeholder="Type a message..." onKeyDown={e => e.key === "Enter" && !sending && send()} />
            <button onClick={send} disabled={sending || !text.trim()}>{sending ? "..." : "Send"}</button>
          </div>
        </main>
      </div>
    </div>
  )
}
