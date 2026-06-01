import { useState, useEffect, useRef, useCallback } from "react"
import { io } from "socket.io-client"
import Message from "./Message"

const CHAT_SERVER = import.meta.env.VITE_CHAT_SERVER || "http://localhost:3099"
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#3b82f6", "#14b8a6"]

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
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState("")
  const [typingUsers, setTypingUsers] = useState([])
  
  const endRef = useRef(null)
  const sendingRef = useRef(false)
  const isTypingRef = useRef(false)
  const typingTimeoutRef = useRef(null)

  // Socket.IO — terima pesan realtime (pake ref biar gak double di StrictMode)
  const socketRef = useRef(null)

  useEffect(() => {
    if (socketRef.current) { socketRef.current.disconnect() }

    const socket = io(CHAT_SERVER)
    socketRef.current = socket
    socket.emit("join-room", { roomId: room, username: user })

    socket.on("chat-message", (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev
        return [...prev, { id: msg.id, text: msg.text, sender: msg.sender, type: "received", timestamp: msg.timestamp, status: "delivered", rawData: msg.rawData }]
      })
    })

    socket.on("room-users", ({ users }) => {
      setUsers(users)
    })

    socket.on("user-join", ({ username, timestamp }) => {
      setMessages(prev => {
        // Prevent double system messages in React StrictMode
        const sysId = `sys_join_${username}_${timestamp}`
        if (prev.some(m => m.id === sysId)) return prev
        return [...prev, { id: sysId, text: `${username} joined the room`, type: "system", timestamp }]
      })
    })

    socket.on("user-leave", ({ username, timestamp }) => {
      setMessages(prev => {
        const sysId = `sys_leave_${username}_${timestamp}`
        if (prev.some(m => m.id === sysId)) return prev
        return [...prev, { id: sysId, text: `${username} left the room`, type: "system", timestamp }]
      })
    })

    socket.on("user-typing", ({ username, isTyping }) => {
      setTypingUsers(prev => {
        if (isTyping) {
          return prev.includes(username) ? prev : [...prev, username]
        } else {
          return prev.filter(u => u !== username)
        }
      })
    })

    return () => {
      socket.emit("leave-room")
      socket.disconnect()
      socketRef.current = null
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    }
  }, [room, user])

  useEffect(() => {
    setMessages([{ id: "sys_init", text: `${user} joined #${room}`, type: "system", timestamp: new Date().toISOString() }])
  }, [room, user])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const send = useCallback(async () => {
    if (sendingRef.current) return
    sendingRef.current = true
    const t = text.trim(); if (!t) { sendingRef.current = false; return }
    setError("")
    
    // Stop typing indicator immediately
    if (isTypingRef.current) {
      isTypingRef.current = false
      socketRef.current?.emit("typing", { roomId: room, username: user, isTyping: false })
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

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
    } finally { setSending(false); sendingRef.current = false }
  }, [text, room, user])

  const handleInputChange = (e) => {
    const val = e.target.value
    setText(val)

    if (socketRef.current) {
      if (!isTypingRef.current && val.trim().length > 0) {
        isTypingRef.current = true
        socketRef.current.emit("typing", { roomId: room, username: user, isTyping: true })
      } else if (isTypingRef.current && val.trim().length === 0) {
        isTypingRef.current = false
        socketRef.current.emit("typing", { roomId: room, username: user, isTyping: false })
      }

      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
      
      typingTimeoutRef.current = setTimeout(() => {
        if (isTypingRef.current) {
          isTypingRef.current = false
          socketRef.current.emit("typing", { roomId: room, username: user, isTyping: false })
        }
      }, 1500)
    }
  }

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(room)
    setToastMsg("Room ID copied to clipboard!")
    setTimeout(() => setToastMsg(""), 2500)
  }

  return (
    <div className="chat">
      <header>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>
          <div className="brand">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--primary)" }}>
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>Patuih Chat</span>
          </div>
        </div>
        
        <div className="room-info">
          <span className="hash">#</span>
          <span className="rname">{room.slice(0, 10)}{room.length > 10 ? "..." : ""}</span>
          <span className="user-label">{user}</span>
          <span className="dot" />
          <div className="ucount">
            <span className="online-dot" />
            <span>{users.length} online</span>
          </div>
        </div>

        <div className="header-actions">
          {apiKey && (
            <span className="key-badge" title="Room API Key tersimpan">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
              </svg>
            </span>
          )}
          <span className="room-id" onClick={handleCopyRoomId} title="Salin ID Room">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span>{room.slice(0, 8)}...</span>
          </span>
          <button className="leave" onClick={onLeave}>Leave</button>
        </div>
      </header>

      <div className={`layout ${sidebarOpen ? "sidebar-open" : ""}`}>
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        
        <aside>
          <div className="section flex">
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              Online Users
            </h3>
            <div style={{ marginTop: 12 }}>
              {users.map(u => (
                <div key={u} className="online-user">
                  <span className="indicator" />
                  <span>{u === user ? `${u} (You)` : u}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="section">
            <h3>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 6 }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              Room Info
            </h3>
            <div className="note">
              <strong>ID:</strong> {room}
            </div>
            <div className="note">
              <strong>User:</strong> {user}
            </div>
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
            {messages.map(m => (
              <Message key={m.id} msg={m} isOwn={m.sender === user} getColor={getColor} />
            ))}
            <div ref={endRef} />
          </div>

          {typingUsers.length > 0 && (
            <div className="typing-indicator-bar">
              <div className="typing-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
              <span>
                <strong>{typingUsers.join(", ")}</strong> {typingUsers.length === 1 ? "is" : "are"} typing...
              </span>
            </div>
          )}
          
          <div className="composer">
            <input 
              value={text} 
              onChange={handleInputChange}
              placeholder="Type a message..." 
              onKeyDown={e => e.key === "Enter" && !sending && send()} 
              disabled={sending}
            />
            <button onClick={send} disabled={sending || !text.trim()}>
              {sending ? (
                "..."
              ) : (
                <>
                  <span>Send</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </>
              )}
            </button>
          </div>
        </main>
      </div>

      {toastMsg && (
        <div className="toast-notif">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  )
}
