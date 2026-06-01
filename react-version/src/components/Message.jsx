import { useState } from "react"

export default function Message({ msg, isOwn, getColor }) {
  const [showJson, setShowJson] = useState(false)
  if (msg.type === "system") return <div className="msg system"><span>{msg.text}</span></div>

  const avatarBg = `radial-gradient(circle at 30% 30%, ${getColor(msg.sender)} 0%, ${getColor(msg.sender)}bb 100%)`

  const renderStatus = () => {
    if (msg.status === "sending") {
      return (
        <span className="status sending" title="Sending..." style={{ opacity: 0.6, display: "inline-flex", alignItems: "center" }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: "currentColor" }}>
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
        </span>
      )
    }
    if (msg.status === "failed") {
      return (
        <span className="status failed" title="Failed to send" style={{ color: "var(--danger)", display: "inline-flex", alignItems: "center" }}>
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
        <span className="status sent" title="Sent" style={{ color: "rgba(255, 255, 255, 0.75)", display: "inline-flex", alignItems: "center", marginLeft: 4 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
      )
    }
    if (msg.status === "delivered") {
      return (
        <span className="status delivered" title="Delivered" style={{ color: "var(--text-subtitle)", display: "inline-flex", alignItems: "center", opacity: 0.7 }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </span>
      )
    }
    return null
  }

  return (
    <div className={`msg ${isOwn ? "own" : "other"}`}>
      {!isOwn && (
        <div className="avatar" style={{ background: avatarBg }}>
          {msg.sender.charAt(0).toUpperCase()}
        </div>
      )}
      <div className="bubble">
        <div className="header">
          {!isOwn && <span className="name" style={{ color: getColor(msg.sender) }}>{msg.sender}</span>}
          <span className="time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {renderStatus()}
        </div>
        <div className="text">{msg.text}</div>
        {msg.rawData && (
          <>
            <button className="json-btn" onClick={() => setShowJson(!showJson)}>{showJson ? "hide" : "show"} raw</button>
            {showJson && <pre className="json">{JSON.stringify(msg.rawData, null, 2)}</pre>}
          </>
        )}
      </div>
      {isOwn && (
        <div className="avatar own" style={{ background: avatarBg }}>
          {msg.sender.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}
