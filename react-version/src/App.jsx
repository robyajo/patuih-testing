import { useState, useEffect } from "react"
import Lobby from "./components/Lobby"
import Chat from "./components/Chat"
import "./App.css"

export default function App() {
  const [session, setSession] = useState(() => {
    const cached = localStorage.getItem("chat_session")
    if (cached) {
      try {
        return JSON.parse(cached)
      } catch {
        return null
      }
    }
    return null
  })

  useEffect(() => {
    if (session) {
      localStorage.setItem("chat_session", JSON.stringify(session))
    } else {
      localStorage.removeItem("chat_session")
    }
  }, [session])

  return session ? (
    <Chat
      user={session.name}
      room={session.room}
      apiKey={session.apiKey}
      onLeave={() => setSession(null)}
    />
  ) : (
    <Lobby onEnter={(s) => setSession(s)} />
  )
}
