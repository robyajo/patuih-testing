# Patuih Chat — React Demo

**Patuih Chat** adalah aplikasi demo real-time chat yang menggunakan **Patuih Webhook Gateway** sebagai backend. Setiap pesan dikirim sebagai event via Patuih API, dan webhook delivery digunakan untuk validasi.

---

## Cara Kerja

```
User A ──► Chat App ──► Chat Server ──► Patuih API ──► Delivery Log
              │              │
              │    Socket.IO │
              │◄─────────────│
              │              │
User B ──► Chat App ──► Chat Server ──► Patuih API ──► Delivery Log
              │              │
              │    Socket.IO │
              │◄─────────────│
```

1. **User A** kirim pesan → Chat App → Chat Server
2. **Chat Server** forward ke Patuih API (`POST /events/publish`) dengan API Key pembuat room
3. **Chat Server** broadcast via **Socket.IO** ke semua user di room yang sama
4. **User B** terima pesan real-time (tanpa polling)
5. **Credit** otomatis terpotong 1 per pesan (kelola di dashboard Patuih)

---

## Persyaratan

- Node.js 20+
- npm
- **Patuih BE** berjalan di `http://localhost:8000`
- **Akun Patuih** dengan API Key yang valid

---

## Instalasi & Jalankan

### 1. Install dependencies

```bash
cd patuih-testing/react-version
npm install
```

### 2. Environment (opsional)

Buat file `.env`:

```env
# Patuih API URL (default: http://localhost:8000)
VITE_PATUIH_URL=http://localhost:8000

# Chat Server URL (default: http://localhost:3099)
VITE_CHAT_SERVER=http://localhost:3099
```

### 3. Jalankan Chat Server (Terminal 1)

```bash
npm run server
```

Chat Server berjalan di `http://localhost:3099`.

**Fungsi Chat Server:**
- Menyimpan API Key pembuat room (in-memory)
- Meneruskan pesan ke Patuih API
- Broadcast real-time via Socket.IO ke semua client

### 4. Jalankan Chat App (Terminal 2)

```bash
npm run dev
```

Chat App berjalan di `http://localhost:5173`.

### 5. Build Produksi

```bash
npm run build
```

Output di folder `dist/`.

---

## Cara Pakai

### 1. Dapatkan API Key

1. Buka dashboard Patuih → **API Keys**
2. Klik **Generate New Key**
3. Pilih project (domain harus sesuai)
4. **Copy key asli** yang muncul (hanya sekali — tapi bisa lihat lagi via tombol **Show**)

### 2. Create Room (Pembuat)

1. Buka `http://localhost:5173`
2. Klik **✨ Create Room**
3. Masukkan **Nama** dan **API Key**
4. Room ID otomatis digenerate
5. **Copy Room ID** — bagikan ke teman
6. Klik **Create Room** → masuk chat

### 3. Join Room (Peserta)

1. Buka `http://localhost:5173` (bisa browser lain)
2. Klik **🔊 Join Room**
3. Masukkan **Nama** dan **Room ID** (dari pembuat)
4. API Key **tidak wajib** untuk join
5. Klik **Join Room** → masuk chat

### 4. Chat

- Ketik pesan → Enter → terkirim
- Semua peserta room lihat pesan **real-time**
- 🟢 Dot hijau = online
- Sidebar menampilkan **Online Users**
- Credit otomatis terpotong (1 per pesan)

---

## API Chat Server

Chat Server berjalan di port 3099.

| Method | Endpoint | Body | Deskripsi |
|--------|----------|------|-----------|
| `POST` | `/api/rooms` | `{ roomId, apiKey, createdBy }` | Buat room (validasi API Key) |
| `POST` | `/api/rooms/:id/messages` | `{ sender, text, id }` | Kirim pesan |
| `GET` | `/api/rooms/:id` | - | Info room |
| `GET` | `/health` | - | Health check |

### WebSocket Events (Socket.IO)

| Event | Arah | Data |
|-------|------|------|
| `join-room` | Client → Server | `roomId` |
| `leave-room` | Client → Server | `roomId` |
| `chat-message` | Server → Client | `{ id, sender, text, timestamp }` |

---

## Struktur File

```
react-version/
├── server/
│   └── index.cjs          # Chat Server (Express + Socket.IO)
├── src/
│   ├── App.jsx            # Root app
│   ├── App.css            # Semua styles
│   └── components/
│       ├── Lobby.jsx      # Join / Create room
│       ├── Chat.jsx       # Chat UI + Socket.IO
│       └── Message.jsx    # Single message bubble
├── .env                   # Environment variables
├── package.json
├── vite.config.js
└── README.md
```

---

## Troubleshooting

### "Invalid API key" saat Create Room
- API Key sudah di-revoke? Cek di dashboard.
- Key yang dimasukkan bukan key asli? Generate baru.
- Patuih BE tidak jalan? Cek `http://localhost:8000`.

### Chat double (pesan muncul 2x)
Sudah diperbaiki — client kirim `id` ke server, server pake `id` yang sama untuk broadcast.

### Socket.IO 404 / tidak konek
Chat Server tidak jalan? Jalankan `npm run server` di terminal terpisah.

### "Insufficient credit balance"
Credit habis. Top-up di dashboard Patuih → Billing → Credits.

### Tidak bisa kirim pesan (Join Room)
Kamu cuma join sebagai pembaca. Untuk kirim, kamu perlu Create Room dengan API Key sendiri, atau minta pembuat room untuk kirim.
