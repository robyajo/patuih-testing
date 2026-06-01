import { useState, useEffect, useRef, useCallback } from "react"
import { io } from "socket.io-client"
import Message from "./Message"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

const CHAT_SERVER = import.meta.env.VITE_CHAT_SERVER || "http://localhost:3099"
const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#3b82f6", "#14b8a6"]

function getColor(name) {
  const n = name || "?"
  let hash = 0; for (let i = 0; i < n.length; i++) hash = n.charCodeAt(i) + ((hash << 5) - hash)
  return COLORS[Math.abs(hash) % COLORS.length]
}

export default function Chat({ user, room, apiKey, onLeave }) {
  const [messages, setMessages] = useState(() => {
    const cached = localStorage.getItem(`chat_messages_room_${room}`)
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {
        return []
      }
    }
    return []
  })
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
  const scrollContainerRef = useRef(null)
  const inactivityTimerRef = useRef(null)

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

  // Sync messages to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(`chat_messages_room_${room}`, JSON.stringify(messages))
    }
  }, [messages, room])

  // Initialize first join message if room has no cache
  useEffect(() => {
    const cached = localStorage.getItem(`chat_messages_room_${room}`)
    if (!cached) {
      const initMsg = { id: "sys_init", text: `${user} joined #${room}`, type: "system", timestamp: new Date().toISOString() }
      setMessages([initMsg])
      localStorage.setItem(`chat_messages_room_${room}`, JSON.stringify([initMsg]))
    }
  }, [room, user])

  // Auto leave logic for inactivity
  const handleAutoLeave = useCallback(() => {
    localStorage.removeItem(`chat_messages_room_${room}`)
    localStorage.setItem("lobby_error", "Anda dikeluarkan karena tidak aktif selama 10 menit.")
    onLeave()
  }, [room, onLeave])

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
    }
    inactivityTimerRef.current = setTimeout(() => {
      handleAutoLeave()
    }, 10 * 60 * 1000) // 10 minutes
  }, [handleAutoLeave])

  // Listen to windows events to reset timer
  useEffect(() => {
    resetInactivityTimer()

    const events = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"]
    const handleActivity = () => resetInactivityTimer()

    events.forEach(event => {
      window.addEventListener(event, handleActivity)
    })

    return () => {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current)
      }
      events.forEach(event => {
        window.removeEventListener(event, handleActivity)
      })
    }
  }, [resetInactivityTimer])

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (endRef.current) {
      endRef.current.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

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

    // Reset inactivity on message send
    resetInactivityTimer()

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
  }, [text, room, user, resetInactivityTimer])

  const handleInputChange = (e) => {
    const val = e.target.value
    setText(val)

    // Reset inactivity timer on input
    resetInactivityTimer()

    if (socketRef.current) {
      const hasText = val.trim().length > 0
      if (hasText && !isTypingRef.current) {
        isTypingRef.current = true
        socketRef.current.emit("typing", { roomId: room, username: user, isTyping: true })
      } else if (!hasText && isTypingRef.current) {
        isTypingRef.current = false
        socketRef.current.emit("typing", { roomId: room, username: user, isTyping: false })
      }
    }
  }

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(room)
    setToastMsg("Room ID copied to clipboard!")
    setTimeout(() => setToastMsg(""), 2500)
  }

  const handleManualLeave = () => {
    localStorage.removeItem(`chat_messages_room_${room}`)
    onLeave()
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden text-slate-100 bg-slate-950 font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-slate-950/80 px-4 md:px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="md:hidden text-slate-400 hover:text-white" onClick={() => setSidebarOpen(true)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </Button>
          
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 rounded-xl text-indigo-400">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <span className="font-extrabold text-sm md:text-base bg-linear-to-r from-white via-indigo-100 to-indigo-300 bg-clip-text text-transparent">Patuih Chat</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-3">
          <span className="text-indigo-400 font-extrabold text-lg">#</span>
          <Badge variant="secondary" className="bg-slate-900 border-slate-800 text-slate-300 text-xs px-2.5 py-1 font-semibold rounded-lg">
            {room.slice(0, 10)}{room.length > 10 ? "..." : ""}
          </Badge>
          <Badge variant="secondary" className="hidden sm:inline-flex bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/20 text-indigo-300 text-xs px-2.5 py-1 font-semibold rounded-lg">
            {user}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse-glow" />
            <span className="hidden sm:inline">{users.length} online</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {apiKey && (
            <Tooltip>
              <TooltipTrigger render={(props) => (
                <div {...props} className="p-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 cursor-help">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"></path>
                  </svg>
                </div>
              )} />
              <TooltipContent className="bg-slate-900 border-slate-800 text-slate-300 text-xs">
                Room API Key Saved
              </TooltipContent>
            </Tooltip>
          )}

          <Tooltip>
            <TooltipTrigger render={(props) => (
              <Button {...props} variant="outline" size="sm" className="h-8 px-2.5 text-xs border-slate-800 bg-slate-900/35 hover:bg-slate-900 text-slate-400 hover:text-white rounded-lg flex items-center gap-1.5" onClick={handleCopyRoomId}>
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span className="hidden sm:inline">Copy ID</span>
              </Button>
            )} />
            <TooltipContent className="bg-slate-900 border-slate-800 text-slate-300 text-xs">
              Copy Room ID: {room}
            </TooltipContent>
          </Tooltip>

          <Button variant="destructive" size="sm" className="h-8 px-3 text-xs bg-rose-950/40 hover:bg-rose-600 border border-rose-500/20 text-rose-300 hover:text-white font-bold rounded-lg" onClick={handleManualLeave}>
            Leave
          </Button>
        </div>
      </header>

      {/* BODY LAYOUT */}
      <div className="flex flex-1 h-[calc(100vh-4rem)] w-full overflow-hidden relative">
        {/* SIDEBAR FOR DESKTOP */}
        <aside className="hidden md:flex w-[260px] flex-col border-r border-slate-800 bg-slate-950/20 z-10">
          <ScrollArea className="flex-1">
            <div className="p-5 border-b border-slate-900">
              <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-2 mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                Online Users
              </h3>
              <div className="flex flex-col gap-1.5">
                {users.map(u => (
                  <div key={u} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white bg-slate-900/20 hover:bg-slate-900/60 border border-transparent hover:border-slate-800/60 transition-all text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border border-slate-950 shadow-emerald-500/20 shadow-lg" />
                    <span className="truncate font-medium">{u === user ? `${u} (You)` : u}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="p-5">
              <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-2 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                Room Details
              </h3>
              <div className="space-y-2">
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-900/80 text-xs text-slate-400 break-all space-y-1">
                  <div className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider">Room ID</div>
                  <div>{room}</div>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-900/80 text-xs text-slate-400 break-all space-y-1">
                  <div className="text-slate-500 font-semibold uppercase text-[9px] tracking-wider">Logged In As</div>
                  <div className="font-semibold text-slate-300">{user}</div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </aside>

        {/* SIDEBAR FOR MOBILE (DRAWER) */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-[280px] bg-slate-950 border-r border-slate-800 p-0 text-slate-100">
            <SheetHeader className="p-6 border-b border-slate-900">
              <SheetTitle className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle></svg>
                Active Members
              </SheetTitle>
            </SheetHeader>
            <div className="p-5 border-b border-slate-900/60">
              <div className="flex flex-col gap-1.5">
                {users.map(u => (
                  <div key={u} className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 bg-slate-900/20 border border-slate-900 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="truncate font-medium">{u === user ? `${u} (You)` : u}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-5 space-y-2.5">
              <h3 className="text-xs font-bold tracking-wider text-slate-500 uppercase flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                Details
              </h3>
              <div className="p-3 bg-slate-900/30 rounded-xl text-xs text-slate-400 break-all space-y-1">
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">Room ID</span>
                <span>{room}</span>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* CHAT PANEL */}
        <main className="flex flex-1 flex-col h-full overflow-hidden bg-slate-950/20">
          {error && (
            <div className="flex items-center justify-between px-6 py-2.5 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs font-medium animate-slide-in">
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                {error}
              </span>
              <Button variant="ghost" size="icon" className="w-5 h-5 hover:bg-rose-500/20 text-rose-300 hover:text-white" onClick={() => setError("")}>
                ✕
              </Button>
            </div>
          )}

          {/* MESSAGES LIST CONTAINER */}
          <ScrollArea className="flex-1 w-full" ref={scrollContainerRef}>
            <div className="p-4 md:p-6 flex flex-col gap-4">
              {messages.map(m => (
                <Message key={m.id} msg={m} isOwn={m.sender === user} getColor={getColor} />
              ))}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          {/* TYPING STATUS */}
          {typingUsers.length > 0 && (
            <div className="flex items-center gap-2.5 px-6 py-2 text-xs text-slate-400 animate-slide-in">
              <div className="flex gap-0.5 items-center bg-slate-900 border border-slate-800/80 px-2.5 py-1.5 rounded-full typing-dots">
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full dot animate-typing-bounce" />
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full dot animate-typing-bounce" />
                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full dot animate-typing-bounce" />
              </div>
              <span className="font-medium">
                <strong className="text-slate-300 font-bold">{typingUsers.join(", ")}</strong> {typingUsers.length === 1 ? "is" : "are"} typing...
              </span>
            </div>
          )}

          {/* COMPOSER BOX */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-900/10 flex gap-3 items-center backdrop-blur-md">
            <Input 
              value={text} 
              onChange={handleInputChange}
              placeholder="Type a message..." 
              onKeyDown={e => e.key === "Enter" && !sending && send()} 
              disabled={sending}
              className="bg-slate-950/60 border-slate-800 text-white placeholder-slate-500 focus-visible:ring-indigo-500 h-11 px-4 rounded-xl"
            />
            <Button 
              onClick={send} 
              disabled={sending || !text.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white h-11 px-5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-600/10"
            >
              {sending ? (
                "..."
              ) : (
                <>
                  <span className="hidden sm:inline">Send</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                  </svg>
                </>
              )}
            </Button>
          </div>
        </main>
      </div>

      {/* COPY TOAST */}
      {toastMsg && (
        <div className="toast-notif border border-indigo-500/30">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>{toastMsg}</span>
        </div>
      )}
    </div>
  )
}
