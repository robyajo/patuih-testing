import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

export default function Message({ msg, isOwn, getColor }) {
  const [showJson, setShowJson] = useState(false)
  
  if (msg.type === "system") {
    return (
      <div className="flex justify-center my-1 animate-slide-in">
        <span className="px-4 py-1 bg-slate-900/40 border border-slate-800/60 text-[10px] md:text-xs text-slate-500 font-bold uppercase tracking-wider rounded-full">
          {msg.text}
        </span>
      </div>
    )
  }

  const avatarBg = `radial-gradient(circle at 30% 30%, ${getColor(msg.sender)} 0%, ${getColor(msg.sender)}bb 100%)`

  const renderStatus = () => {
    if (msg.status === "sending") {
      return (
        <span className="text-slate-400 opacity-60 inline-flex items-center" title="Sending...">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
        </span>
      )
    }
    if (msg.status === "failed") {
      return (
        <span className="text-rose-500 inline-flex items-center" title="Failed to send">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        </span>
      )
    }
    if (isOwn && msg.status === "sent") {
      return (
        <span className="text-slate-300/80 inline-flex items-center ml-1" title="Sent">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
      )
    }
    if (msg.status === "delivered") {
      return (
        <span className="text-slate-400 inline-flex items-center opacity-70" title="Delivered">
          <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
      )
    }
    return null
  }

  return (
    <div className={`flex gap-3 max-w-[85%] items-end group ${isOwn ? "flex-row-reverse self-end" : "self-start"}`}>
      {!isOwn && (
        <Avatar className="w-8 h-8 rounded-xl border border-slate-800 shrink-0 shadow-md">
          <AvatarFallback style={{ background: avatarBg }} className="text-white text-xs font-bold rounded-xl">
            {msg.sender.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`flex flex-col gap-1 max-w-full`}>
        <div className={`px-4 py-2.5 rounded-2xl shadow-lg text-sm border ${
          isOwn 
            ? "bg-indigo-600 border-indigo-500/30 text-white rounded-br-sm animate-slide-in" 
            : "bg-slate-900 border-slate-800 text-slate-100 rounded-bl-sm animate-slide-in"
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {!isOwn && <span className="text-xs font-bold tracking-wide" style={{ color: getColor(msg.sender) }}>{msg.sender}</span>}
            <span className={`text-[10px] ml-auto ${isOwn ? "text-indigo-200" : "text-slate-500"}`}>
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
            {renderStatus()}
          </div>
          <div className="wrap-break-word leading-relaxed">{msg.text}</div>
          
          {msg.rawData && (
            <div className="mt-2 pt-2 border-t border-slate-800/40">
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-6 px-2 text-[9px] font-bold tracking-wider text-slate-400 hover:text-white hover:bg-slate-800/40 uppercase rounded-md" 
                onClick={() => setShowJson(!showJson)}
              >
                {showJson ? "Hide" : "Show"} Raw Data
              </Button>
              {showJson && (
                <pre className="mt-2 p-2.5 bg-slate-950/80 border border-slate-850 rounded-lg text-[10px] font-mono text-indigo-300 max-h-40 overflow-y-auto whitespace-pre-wrap select-all">
                  {JSON.stringify(msg.rawData, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>

      {isOwn && (
        <Avatar className="w-8 h-8 rounded-xl border border-slate-800 shrink-0 shadow-md md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <AvatarFallback style={{ background: avatarBg }} className="text-white text-xs font-bold rounded-xl">
            {msg.sender.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
