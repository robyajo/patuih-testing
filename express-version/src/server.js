require("dotenv").config()
const express = require("express")
const http = require("http")
const { Server: SocketIOServer } = require("socket.io")
const axios = require("axios")
const cors = require("cors")
const path = require("path")

const app = express()
const server = http.createServer(app)
const io = new SocketIOServer(server, { cors: { origin: "*" } })

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, "..", "public")))

// --- In-memory storage ---
const webhookLogs = []
const MAX_LOGS = 200

// --- Webhook receiver (endpoint yang didaftarkan ke Patuih) ---
app.post("/webhook", (req, res) => {
  const event = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    receivedAt: new Date().toISOString(),
    headers: req.headers,
    body: req.body,
    source: req.ip,
  }

  webhookLogs.unshift(event)
  if (webhookLogs.length > MAX_LOGS) webhookLogs.length = MAX_LOGS

  // Broadcast realtime ke semua client
  io.emit("webhook", event)

  console.log(`[WEBHOOK] ${event.body?.event ?? "unknown"} from ${event.source}`)
  res.status(200).json({ received: true, id: event.id })
})

// --- Event publisher (kirim event ke Patuih untuk test) ---
app.post("/api/send-event", async (req, res) => {
  const { patuihUrl, apiKey, channel, event, data, sender } = req.body

  if (!patuihUrl || !apiKey || !channel || !event) {
    return res.status(400).json({ error: "Missing required fields: patuihUrl, apiKey, channel, event", hint: "Isi semua field di panel Settings dan Send Test Event" })
  }

  if (!apiKey.startsWith("pt_")) {
    return res.status(400).json({ error: "API Key harus dimulai dengan 'pt_'", hint: "Generate API Key dari dashboard Patuih: Customer > API Keys" })
  }

  const baseUrl = patuihUrl.replace(/\/+$/, "")
  const url = `${baseUrl}/api/v1/events/publish`

  try {
    const response = await axios.post(
      url,
      { channel, event, data: data ?? {} },
      {
        headers: {
          "X-API-Key": apiKey,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      },
    )

    console.log(`[SEND] ${event} → ${response.data?.data?.webhooksQueued ?? 0} webhooks queued`)

    // Broadcast ke semua client Socket.IO biar realtime (tanpa nunggu webhook)
    io.emit("chat-message", {
      id: Date.now().toString(36),
      event,
      channel,
      data,
      sender: sender || "anonymous",
      timestamp: new Date().toISOString(),
      status: "sent",
    })

    res.json({
      sent: true,
      response: response.data,
      timestamp: new Date().toISOString(),
    })
  } catch (err) {
    let errorMsg = err.message
    let statusCode = 500
    let hint = ""

    if (err.code === "ECONNREFUSED") {
      errorMsg = `Cannot connect to ${baseUrl}`
      hint = "Pastikan server Patuih sudah running. Jalankan: cd patuih-be && npm run start:dev"
      statusCode = 502
    } else if (err.code === "ECONNABORTED") {
      errorMsg = "Connection timed out"
      hint = "Server Patuih tidak merespon dalam 10 detik. Cek apakah server berjalan."
    } else if (err.response) {
      errorMsg = err.response.data?.message ?? err.response.statusText ?? "Unknown error"
      hint = err.response.data?.hint ?? `HTTP ${err.response.status} dari server`
      statusCode = err.response.status
    }

    console.error(`[SEND ERROR] ${errorMsg}`)
    res.status(statusCode).json({
      sent: false,
      error: errorMsg,
      hint: hint,
      detail: err.response?.data ?? {},
    })
  }
})

// --- Test connection ke Patuih ---
app.post("/api/test-connection", async (req, res) => {
  const { patuihUrl } = req.body
  if (!patuihUrl) return res.status(400).json({ error: "patuihUrl required" })

  const baseUrl = patuihUrl.replace(/\/+$/, "")
  try {
    // Test koneksi dasar (tidak perlu auth) — cukup check apakah server reachable
    await axios.get(baseUrl, {
      timeout: 5000,
      validateStatus: () => true, // Accept any status
    })
    res.json({ reachable: true, url: baseUrl })
  } catch (err) {
    res.json({
      reachable: false,
      url: baseUrl,
      error: err.code === "ECONNREFUSED" ? "Connection refused" : err.message,
      hint: err.code === "ECONNREFUSED"
        ? "Jalankan Patuih BE: cd patuih-be && npm run start:dev"
        : "Periksa URL",
    })
  }
})

// --- Get webhook history ---
app.get("/api/webhooks", (req, res) => {
  res.json(webhookLogs)
})

// --- Return stored endpoints (from Patuih) ---
let registeredEndpoints = []
app.post("/api/endpoints/sync", (req, res) => {
  registeredEndpoints = req.body.endpoints || []
  res.json({ synced: registeredEndpoints.length })
})
app.get("/api/endpoints", (req, res) => {
  res.json(registeredEndpoints)
})

// --- Clear logs ---
app.post("/api/clear", (req, res) => {
  webhookLogs.length = 0
  io.emit("cleared")
  res.json({ cleared: true })
})

// --- Socket.IO ---
io.on("connection", (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`)
  socket.on("disconnect", () => console.log(`[WS] Client disconnected: ${socket.id}`))
})

// --- Error handler global (cegah crash) ---
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message)
  res.status(500).json({ error: err.message })
})

process.on("uncaughtException", (err) => {
  console.error("[UNCAUGHT]", err)
})

process.on("unhandledRejection", (err) => {
  console.error("[UNHANDLED]", err)
})

// --- Start ---
const PORT = process.env.PORT ?? 3099
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║        PATUIH Webhook Tester                     ║
║──────────────────────────────────────────────────║
║  Dashboard : http://localhost:${PORT}              ║
║  Webhook   : http://localhost:${PORT}/webhook      ║
║  WebSocket : http://localhost:${PORT}              ║
║                                                  ║
║  Register this webhook URL in your Patuih        ║
║  endpoint configuration to receive events.       ║
╚══════════════════════════════════════════════════╝
  `)
})
