import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  const [error, setError] = useState(() => {
    const cached = localStorage.getItem("lobby_error")
    if (cached) {
      localStorage.removeItem("lobby_error")
      return cached
    }
    return ""
  })
  const [copied, setCopied] = useState(false)

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

    try {
      const res = await fetch(`${CHAT_SERVER}/api/rooms`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: r, apiKey: k, createdBy: n }),
      })
      if (!res.ok) { const j = await res.json(); setError(j.error || "Failed"); return }
    } catch { setError("Cannot connect to chat server"); return }

    onEnter({ name: n, room: r, apiKey: k })
  }

  if (!tab) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#05070a] w-full">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,transparent_20%,rgba(5,7,10,0.8)_80%)] pointer-events-none" />

        <Card className="w-[420px] bg-slate-900/40 border-white/10 backdrop-blur-xl shadow-[0_0_50px_-12px_rgba(99,102,241,0.15)] rounded-2xl relative overflow-hidden transition-all duration-300">
          <CardHeader className="text-center pb-4 pt-8">
            <div className="flex justify-center mb-6">
              <div className="relative group">
                <div className="absolute -inset-1 bg-linear-to-r from-indigo-500 to-emerald-500 rounded-2xl blur-md opacity-25 group-hover:opacity-40 transition duration-500"></div>
                <div className="relative p-4 bg-slate-950/80 border border-slate-800/80 rounded-2xl text-indigo-400">
                  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                  </svg>
                </div>
              </div>
            </div>

            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4 tracking-wider uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
              Live Gateway Active
            </div>

            <CardTitle className="text-3xl font-extrabold tracking-tight bg-linear-to-r from-white via-slate-100 to-indigo-200 bg-clip-text text-transparent">Patuih Chat</CardTitle>
            <CardDescription className="text-slate-400 text-sm mt-2 max-w-[280px] mx-auto leading-relaxed">
              Real-time messaging powered by a low-latency webhook gateway.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4 pt-4 px-6 pb-6">
            <div className="grid grid-cols-2 gap-2 text-center p-3 rounded-xl bg-slate-950/40 border border-white/5 mb-2">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Latency</span>
                <span className="text-xs font-semibold text-emerald-400 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> ~12ms
                </span>
              </div>
              <div className="flex flex-col gap-0.5 border-l border-white/5">
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Network</span>
                <span className="text-xs font-semibold text-indigo-400 flex items-center justify-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span> WebSocket
                </span>
              </div>
            </div>

            <Button size="lg" className="w-full bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold flex items-center justify-center gap-2.5 py-6 rounded-xl border border-indigo-400/20 shadow-lg shadow-indigo-600/15 hover:shadow-indigo-500/25 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer" onClick={() => { setTab("join"); setName(localStorage.getItem("chat_name") || ""); setApiKey(localStorage.getItem("chat_key") || "") }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              Join Existing Room
            </Button>
            <Button size="lg" variant="outline" className="w-full bg-slate-950/40 border border-emerald-500/35 hover:border-emerald-400/50 hover:bg-emerald-500/5 text-emerald-400 hover:text-emerald-300 font-semibold flex items-center justify-center gap-2.5 py-6 rounded-xl transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer" onClick={() => { setTab("create"); setName(localStorage.getItem("chat_name") || ""); setApiKey(localStorage.getItem("chat_key") || ""); setGeneratedRoom(genId()) }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Create New Room
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#05070a] w-full">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

      <Card className="w-[440px] bg-slate-900/40 border-white/10 backdrop-blur-xl shadow-[0_0_50px_-12px_rgba(99,102,241,0.15)] rounded-2xl relative overflow-hidden transition-all duration-300">
        <CardHeader className="pb-4 pt-8 border-b border-white/5 relative">
          <Button variant="ghost" size="sm" className="absolute top-4 left-4 h-8 px-3 text-xs text-slate-400 hover:text-white bg-slate-800/30 hover:bg-slate-800/80 rounded-lg border border-slate-700/35 flex items-center gap-1.5 transition-all duration-200 cursor-pointer" onClick={() => setTab(null)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            Back
          </Button>
          <div className="pt-6 flex justify-center">
            <CardTitle className="text-xl font-extrabold flex items-center gap-2">
              {tab === "join" ? (
                <>
                  <span className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
                  </span>
                  <span className="bg-linear-to-r from-white to-slate-200 bg-clip-text text-transparent">Join Chat Room</span>
                </>
              ) : (
                <>
                  <span className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                  </span>
                  <span className="bg-linear-to-r from-white to-slate-200 bg-clip-text text-transparent">Create Chat Room</span>
                </>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-6 px-6">
          <div className="space-y-2">
            <Label htmlFor="lobby-name" className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Your Name</Label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
              </div>
              <Input id="lobby-name" className="bg-slate-950/45 border-slate-800/80 pl-10 text-white placeholder-slate-500 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 rounded-xl h-11" value={name} onChange={e => setName(e.target.value)} placeholder="Display name" autoFocus />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="lobby-room" className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">Room ID</Label>
            {tab === "create" ? (
              <div className="flex gap-2 w-full">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>
                  </div>
                  <Input id="lobby-room" className="bg-slate-950/45 border-slate-800/80 pl-10 text-white font-mono placeholder-slate-500 read-only:opacity-85 rounded-xl h-11" value={generatedRoom} readOnly />
                </div>
                <Button variant="secondary" className="border border-slate-800/80 bg-slate-900/60 hover:bg-slate-850 text-slate-200 font-semibold text-xs rounded-xl px-4 h-11 cursor-pointer" onClick={() => { navigator.clipboard.writeText(generatedRoom); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></svg>
                </div>
                <Input id="lobby-room" className="bg-slate-950/45 border-slate-800/80 pl-10 text-white placeholder-slate-500 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 rounded-xl h-11" value={room} onChange={e => setRoom(e.target.value)} placeholder="Paste room ID here" />
              </div>
            )}
            <span className="text-[11px] text-slate-500 block leading-relaxed">{tab === "create" ? "Share this room ID with your friends." : "Enter the room ID shared with you."}</span>
          </div>

          {tab === "create" && (
            <div className="space-y-2">
              <Label htmlFor="lobby-key" className="text-slate-400 font-bold text-[10px] uppercase tracking-wider flex justify-between">
                <span>API Key</span>
              </Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </div>
                <Input id="lobby-key" className="bg-slate-950/45 border-slate-800/80 pl-10 text-white placeholder-slate-500 focus-visible:ring-indigo-500/50 focus-visible:border-indigo-500 rounded-xl h-11" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="pt_live_..." type="password" />
              </div>
              <span className="text-[11px] text-slate-500 block leading-relaxed">Generate this key in Patuih → API Keys.</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="bg-rose-500/10 border-rose-500/20 text-rose-400 rounded-xl mt-2 animate-pulse-glow">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4 shrink-0"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              <AlertDescription className="text-xs font-semibold">{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="pt-4 px-6 pb-8">
          {tab === "join" ? (
            <Button className="w-full bg-linear-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-6 rounded-xl shadow-lg shadow-indigo-600/15 hover:shadow-indigo-500/25 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer" onClick={handleJoin}>
              Join Room
            </Button>
          ) : (
            <Button className="w-full bg-linear-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-6 rounded-xl shadow-lg shadow-emerald-600/15 hover:shadow-emerald-500/25 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer" onClick={handleCreate}>
              Create Room
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
