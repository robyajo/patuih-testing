import { useState } from "react"

export default function Message({ msg, isOwn, getColor }) {
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
          <span className="time">{new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
          {msg.status === "sending" && <span className="status sending">⏳</span>}
          {msg.status === "failed" && <span className="status failed">✕</span>}
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
        <div className="avatar own" style={{ background: getColor(msg.sender) }}>
          {msg.sender.charAt(0).toUpperCase()}
        </div>
      )}
    </div>
  )
}
