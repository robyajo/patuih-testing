const express = require("express")
const cors = require("cors")
const http = require("http")
const { Server: SocketIOServer } = require("socket.io")

try { require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") }) } catch {}

const app = express()
const server = http.createServer(app)
const io = new SocketIOServer(server, { cors: { origin: "*" } })

app.use(cors())
app.use(express.json())

const PATUIH_URL = process.env.PATUIH_URL || "http://localhost:8000"
const rooms = {}

io.on("connection", (socket) => {
  socket.on("join-room", (roomId) => {
    socket.join(roomId)
    console.log(`[WS] Client joined room: ${roomId}`)
  })
  socket.on("leave-room", (roomId) => {
    socket.leave(roomId)
  })
})

// Create room
app.post("/api/rooms", async (req, res) => {
  const { roomId, apiKey, createdBy } = req.body
  if (!roomId || !apiKey) return res.status(400).json({ error: "roomId and apiKey required" })
  if (rooms[roomId]) return res.status(409).json({ error: "Room already exists" })

  try {
    const test = await fetch(`${PATUIH_URL}/api/v1/events/publish`, {
      method: "POST",
      headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "_validate", event: "_validate", data: { _: true } }),
    })
    if (!test.ok) {
      const j = await test.json().catch(() => ({}))
      return res.status(400).json({ error: j.message || "Invalid API key" })
    }
  } catch (err) {
    return res.status(502).json({ error: `Cannot reach Patuih: ${err.message}` })
  }

  rooms[roomId] = { apiKey, createdBy: createdBy || "anonymous", createdAt: new Date().toISOString() }
  console.log(`[ROOM] Created: ${roomId} by ${createdBy}`)
  res.json({ roomId, message: "Room created" })
})

// Send message
app.post("/api/rooms/:roomId/messages", async (req, res) => {
  const { roomId } = req.params
  const { sender, text, event, id: clientId } = req.body
  const room = rooms[roomId]
  if (!room) return res.status(404).json({ error: "Room not found" })

  const msg = {
    id: clientId || ("msg_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
    roomId,
    sender: sender || "unknown",
    text: text || "",
    event: event || "chat.message",
    timestamp: new Date().toISOString(),
  }

  try {
    const r = await fetch(`${PATUIH_URL}/api/v1/events/publish`, {
      method: "POST",
      headers: { "X-API-Key": room.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: roomId,
        event: msg.event,
        data: { room: roomId, text: msg.text, sender: msg.sender, timestamp: msg.timestamp },
      }),
    })
    const json = await r.json().catch(() => ({}))
    if (r.ok) {
      // Broadcast ke semua client di room via Socket.IO
      io.to(roomId).emit("chat-message", msg)
      res.json({ sent: true, data: json.data, id: msg.id })
    } else {
      res.status(400).json({ sent: false, error: json.message || "Failed" })
    }
  } catch (err) {
    res.status(502).json({ sent: false, error: err.message })
  }
})

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", rooms: Object.keys(rooms).length, socketIO: !!io })
})

// Get room info
app.get("/api/rooms/:roomId", (req, res) => {
  const room = rooms[req.params.roomId]
  if (!room) return res.status(404).json({ error: "Room not found" })
  res.json({ roomId: req.params.roomId, createdBy: room.createdBy, createdAt: room.createdAt })
})

const PORT = process.env.SERVER_PORT || process.env.PORT || 3099
server.listen(PORT, () => {
  console.log(`Chat server on http://localhost:${PORT}`)
  console.log(`Patuih API: ${PATUIH_URL}`)
  console.log(`Socket.IO ready for connections`)
})
