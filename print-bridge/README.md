# Matchaboy Print Bridge

Service lokal (Node.js) yang menjembatani **Matchaboy POS** → **printer thermal ESC/POS**.

## Mendukung
| OS | Cara koneksi printer |
|----|---------------------|
| Windows | USB / Bluetooth (via Windows printer queue) |
| macOS | USB / Bluetooth (via CUPS `lp`) |
| Linux | USB / Bluetooth (via CUPS `lp`) |
| Android (Termux) | USB OTG (`/dev/usb/lp0`) |
| **iOS (iPad/iPhone)** | ✅ Via Print Bridge ini (satu-satunya cara dari web) |

## Cara Pakai

1. **Install Node.js** dari https://nodejs.org (minimal v16)

2. **Jalankan service:**
   ```bash
   node server.js
   ```

3. **Buka Matchaboy POS** → Struk & Printer → Pengaturan Printer → **Cek Koneksi**

4. Jika terdeteksi, printer siap digunakan dari semua browser dan OS.

## Konfigurasi Printer

Jika ada beberapa printer, set nama printer secara manual:

```bash
# Windows
set PRINTER_NAME=RPP02N
node server.js

# macOS/Linux
PRINTER_NAME=RPP02N node server.js
```

Jika tidak diset, Print Bridge akan otomatis memilih printer thermal yang tersedia.

## Endpoints

| Method | Path | Keterangan |
|--------|------|------------|
| GET | `/ping` | Health check + info versi |
| GET | `/printers` | Daftar printer yang tersedia |
| POST | `/print` | Kirim raw ESC/POS bytes untuk dicetak |

## Jalankan otomatis saat startup

### Windows (Task Scheduler)
1. Buka Task Scheduler → Create Basic Task
2. Trigger: At startup
3. Action: `node C:\path\to\print-bridge\server.js`

### macOS (launchd)
Buat file `~/Library/LaunchAgents/com.matchaboy.printbridge.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
  <key>Label</key><string>com.matchaboy.printbridge</string>
  <key>ProgramArguments</key>
  <array><string>/usr/local/bin/node</string><string>/path/to/server.js</string></array>
  <key>RunAtLoad</key><true/>
</dict>
</plist>
```
Lalu: `launchctl load ~/Library/LaunchAgents/com.matchaboy.printbridge.plist`

### Linux (systemd)
```ini
[Unit]
Description=Matchaboy Print Bridge

[Service]
ExecStart=/usr/bin/node /path/to/server.js
Restart=always

[Install]
WantedBy=multi-user.target
```
