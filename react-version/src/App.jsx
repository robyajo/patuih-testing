import { useState } from "react"
import Lobby from "./components/Lobby"
import Chat from "./components/Chat"
import "./App.css"

export default function App() {
  const [session, setSession] = useState(null)

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
