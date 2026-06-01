# Deployment Guide — Patuih Chat (React Version)

## Arsitektur Deployment

```
VPS (Ubuntu 22.04)
├── Nginx (reverse proxy)
│   ├── chat.patuih.com → Chat App (build static)
│   └── api.chat.patuih.com → Chat Server (Node.js)
│
├── Chat App (static files)
│   └── /var/www/chat.patuih.com/
│
├── Chat Server (Node.js + PM2)
│   └── port 3099
│
└── Patuih API (existing)
    └── api.patuih.com:8000
```

---

## Prasyarat

- VPS dengan Ubuntu 22.04+
- Nginx terinstall
- Node.js 20+ terinstall
- PM2 terinstall (`npm install -g pm2`)
- Domain sudah指向 IP VPS (chat.patuih.com, api.chat.patuih.com)
- Patuih API sudah running

---

## 1. Build Chat App

Build static files untuk production:

```bash
cd patuih-testing/react-version

# Build React app
npm run build

# Hasil di folder dist/
ls dist/
# index.html  assets/
```

---

## 2. Upload ke VPS

### Opsi A: Git Clone

```bash
# Di VPS
cd /var/www
git clone https://github.com/your-repo/patuih.git
cd patuih/patuih-testing/react-version
npm install --production
npm run build
```

### Opsi B: SCP Langsung

```bash
# Dari lokal — upload isi dist/ (bukan foldernya)
scp -r dist/* user@vps:/var/www/chat.patuih.com/

# Upload chat server
scp -r server/ package.json user@vps:/opt/chat-server/
```

---

## 3. Setup Nginx

### Chat App (Static Files)

```nginx
# /etc/nginx/sites-available/chat.patuih.com
server {
    listen 80;
    server_name chat.patuih.com;

    # Arahkan langsung ke folder dist/ hasil build
    root /opt/patuih/patuih-testing/react-version/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
```

### Chat Server (Reverse Proxy)

```nginx
# /etc/nginx/sites-available/api.chat.patuih.com
server {
    listen 80;
    server_name api.chat.patuih.com;

    location / {
        proxy_pass http://127.0.0.1:3099;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }
}
```

### Aktifkan Site

```bash
sudo ln -s /etc/nginx/sites-available/chat.patuih.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.chat.patuih.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d chat.patuih.com -d api.chat.patuih.com
```

---

## 4. Setup Chat Server (PM2)

### Environment

```bash
cd /opt/chat-server

# Copy .env
cat > .env << 'EOF'
PATUIH_URL=https://api.patuih.com
SERVER_PORT=3099
EOF
```

### PM2 Ecosystem

```bash
# ecosystem.config.cjs
module.exports = {
  apps: [{
    name: "patuih-chat-server",
    script: "server/index.cjs",
    cwd: "/opt/chat-server",
    env: {
      NODE_ENV: "production",
      PORT: 3099,
      PATUIH_URL: "https://api.patuih.com"
    },
    instances: 1,
    exec_mode: "fork",
    watch: false,
    max_memory_restart: "200M",
    error_file: "logs/err.log",
    out_file: "logs/out.log",
    merge_logs: true,
    autorestart: true
  }]
}
```

### Jalankan

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## 5. Update .env di Chat App

Update `.env` di folder `react-version` sebelum build:

```env
VITE_PATUIH_URL=https://api.patuih.com
VITE_CHAT_SERVER=https://api.chat.patuih.com
```

Lalu build ulang:

```bash
npm run build
# Upload dist/ ke VPS lagi
```

---

## 6. Verifikasi

| Component | URL | Expected |
|-----------|-----|----------|
| Chat App | `https://chat.patuih.com` | Lobby (Join/Create Room) |
| Chat Server | `https://api.chat.patuih.com/health` | `{"status":"ok"}` |
| Socket.IO | `https://api.chat.patuih.com` | WebSocket connected |

Test flow:
1. Buka `https://chat.patuih.com`
2. Create Room (masukkan API Key dari Patuih)
3. Copy Room ID
4. Buka browser lain → Join Room
5. Kirim pesan → realtime

---

## Troubleshooting

### WebSocket tidak connect
- Pastikan Nginx proxy WebSocket (header Upgrade + Connection)
- Cek firewall: `sudo ufw allow 3099`
- Cek log: `pm2 logs patuih-chat-server`

### Chat server error "Cannot reach Patuih"
- Pastikan `PATUIH_URL` benar
- Cek koneksi: `curl https://api.patuih.com/api/v1/auth/me`

### Static file 404
- Nginx root path salah
- `try_files $uri $uri/ /index.html;` harus ada untuk SPA routing

### PM2 restart setelah server reboot
```bash
pm2 startup   # generate systemd script
pm2 save      # simpan process list
```
