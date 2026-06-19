/**
 * Matchaboy Print Bridge — server.js v2
 * Kirim ESC/POS ke printer thermal via COM port (Bluetooth) atau printer driver Windows
 *
 * Setup RPP02N di Windows:
 *   1. Pair RPP02N via Bluetooth Settings
 *   2. Buka Device Manager → Ports (COM & LPT) → catat COM port RPP02N (misal COM3)
 *   3. Jalankan: set PRINTER_PORT=COM3 && node server.js
 *      ATAU biarkan auto-detect (coba semua COM port)
 */

const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { execSync, exec, spawnSync } = require('child_process');

const PORT    = 9100;
const VERSION = '2.0.0';

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

// ─── Windows: list semua COM port ────────────────────────────────────────────
function listComPorts() {
  try {
    const out = execSync(
      'wmic path Win32_PnPEntity where "Name like \'%(COM%)\'" get Name /format:list',
      { encoding: 'utf8', timeout: 5000 }
    );
    return out.split('\n')
      .filter(l => l.startsWith('Name='))
      .map(l => {
        const m = l.match(/COM(\d+)/);
        return m ? { label: l.replace('Name=', '').trim(), port: `COM${m[1]}`, num: parseInt(m[1]) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.num - a.num); // COM port nomor besar = Bluetooth
  } catch {
    return [];
  }
}

// ─── Windows: auto-detect COM port printer ────────────────────────────────────
function detectComPort() {
  // 1. Env var PRINTER_PORT paling prioritas
  if (process.env.PRINTER_PORT) return process.env.PRINTER_PORT;

  const ports = listComPorts();
  if (!ports.length) return null;

  // 2. Cari yang namanya mengandung RPP, Bluetooth, POS
  const thermal = ports.find(p => /RPP|POS|BT|Bluetooth|Serial/i.test(p.label));
  if (thermal) return thermal.port;

  // 3. Ambil COM port nomor terbesar (biasanya Bluetooth)
  return ports[0].port;
}

// ─── Windows: kirim data ke COM port ─────────────────────────────────────────
function sendToComPort(data, port, callback) {
  const tmp = path.join(os.tmpdir(), `mb_${Date.now()}.bin`);
  fs.writeFileSync(tmp, data);

  // Cara 1: copy /b file ke COM port (paling simpel dan reliable)
  exec(`copy /b "${tmp}" "${port}" >nul 2>&1`, { shell: true }, (err) => {
    try { fs.unlinkSync(tmp); } catch {}
    if (!err) return callback(null);

    // Cara 2: echo via PowerShell ke SerialPort
    console.log(`[Bridge] copy gagal (${err.message}), coba SerialPort...`);
    const tmp2 = path.join(os.tmpdir(), `mb2_${Date.now()}.bin`);
    fs.writeFileSync(tmp2, data);
    const ps = `
$port = New-Object System.IO.Ports.SerialPort('${port}', 9600, 'None', 8, 1);
$port.Open();
$bytes = [System.IO.File]::ReadAllBytes('${tmp2.replace(/\\/g, '\\\\')}');
$port.Write($bytes, 0, $bytes.Length);
$port.Close();
`.trim().replace(/\n/g, ' ');
    exec(`powershell -NoProfile -Command "${ps}"`, { timeout: 10000 }, (err2) => {
      try { fs.unlinkSync(tmp2); } catch {}
      callback(err2);
    });
  });
}

// ─── Windows: kirim via printer driver (USB/named printer) ───────────────────
function detectWindowsPrinterName() {
  if (process.env.PRINTER_NAME) return process.env.PRINTER_NAME;
  try {
    const out = execSync('wmic printer get name', { encoding: 'utf8' });
    const lines = out.split('\n').map(l => l.trim()).filter(Boolean).slice(1);
    return lines.find(l => /RPP|POS|Thermal|receipt/i.test(l)) || lines[0] || null;
  } catch { return null; }
}

function sendViaWindowsDriver(data, callback) {
  const printerName = detectWindowsPrinterName();
  if (!printerName) return callback(new Error('Tidak ada printer Windows ditemukan'));

  const tmp = path.join(os.tmpdir(), `mb_${Date.now()}.bin`);
  fs.writeFileSync(tmp, data);

  const ps = `
$n='${printerName.replace(/'/g, "''")}';
$d=[System.IO.File]::ReadAllBytes('${tmp.replace(/\\/g, '\\\\')}');
Add-Type -AssemblyName System.Drawing;
$pd=New-Object System.Drawing.Printing.PrintDocument;
$pd.PrinterSettings.PrinterName=$n;
$pd.add_PrintPage({param($s,$e)});
$h=[System.Runtime.InteropServices.GCHandle]::Alloc($d,[System.Runtime.InteropServices.GCHandleType]::Pinned);
$ptr=$h.AddrOfPinnedObject();
$winspool=[System.Reflection.Assembly]::LoadWithPartialName('System.Drawing');
Add-Type -TypeDefinition 'using System;using System.Runtime.InteropServices;public class WP{[DllImport("winspool.drv",CharSet=CharSet.Auto)]public static extern bool OpenPrinter(string n,out IntPtr h,IntPtr d);[DllImport("winspool.drv")]public static extern bool ClosePrinter(IntPtr h);[DllImport("winspool.drv",CharSet=CharSet.Auto)]public static extern int StartDocPrinter(IntPtr h,int l,int[] di);[DllImport("winspool.drv")]public static extern bool EndDocPrinter(IntPtr h);[DllImport("winspool.drv")]public static extern bool StartPagePrinter(IntPtr h);[DllImport("winspool.drv")]public static extern bool EndPagePrinter(IntPtr h);[DllImport("winspool.drv")]public static extern bool WritePrinter(IntPtr h,IntPtr b,int sz,out int w);}';
$ph=[IntPtr]::Zero;[WP]::OpenPrinter($n,[ref]$ph,[IntPtr]::Zero)|Out-Null;
$di=New-Object int[] 5;$di[0]=20;
[WP]::StartDocPrinter($ph,1,$di)|Out-Null;[WP]::StartPagePrinter($ph)|Out-Null;
$w=0;[WP]::WritePrinter($ph,$ptr,$d.Length,[ref]$w)|Out-Null;
[WP]::EndPagePrinter($ph)|Out-Null;[WP]::EndDocPrinter($ph)|Out-Null;[WP]::ClosePrinter($ph)|Out-Null;
$h.Free();
`.trim().replace(/\n/g, ' ');

  exec(`powershell -NoProfile -Command "${ps}"`, { timeout: 15000 }, (err) => {
    try { fs.unlinkSync(tmp); } catch {}
    callback(err);
  });
}

// ─── Main send function ───────────────────────────────────────────────────────
function sendToPrinter(data, callback) {
  const platform = os.platform();

  if (platform === 'win32') {
    const comPort = detectComPort();
    console.log(`[Bridge] Windows - COM port: ${comPort || 'tidak ditemukan'}`);
    console.log(`[Bridge] COM ports tersedia:`, listComPorts().map(p => p.label));

    if (comPort) {
      sendToComPort(data, comPort, (err) => {
        if (!err) return callback(null);
        console.log(`[Bridge] COM gagal: ${err.message} — coba printer driver...`);
        sendViaWindowsDriver(data, callback);
      });
    } else {
      console.log('[Bridge] Tidak ada COM port — coba printer driver Windows...');
      sendViaWindowsDriver(data, callback);
    }
    return;
  }

  if (platform === 'darwin' || platform === 'linux') {
    const name = process.env.PRINTER_NAME || null;
    const cmd  = name ? `lp -d "${name}" -o raw` : 'lp -o raw';
    const child = exec(cmd, { encoding: 'buffer' }, callback);
    child.stdin.write(data);
    child.stdin.end();
    return;
  }

  callback(new Error('Platform tidak didukung: ' + platform));
}

// ─── HTTP Server ──────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  setCors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  if (req.method === 'GET' && req.url === '/ping') {
    const comPort = os.platform() === 'win32' ? detectComPort() : null;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, version: VERSION, platform: os.platform(), port: comPort || 'N/A' }));
    return;
  }

  // GET /debug — info lengkap untuk troubleshoot
  if (req.method === 'GET' && req.url === '/debug') {
    const info = {
      platform: os.platform(),
      detectedPort: os.platform() === 'win32' ? detectComPort() : null,
      allComPorts: os.platform() === 'win32' ? listComPorts() : [],
      PRINTER_PORT: process.env.PRINTER_PORT || null,
      PRINTER_NAME: process.env.PRINTER_NAME || null,
      windowsPrinters: [],
    };
    if (os.platform() === 'win32') {
      try {
        const out = execSync('wmic printer get name', { encoding: 'utf8' });
        info.windowsPrinters = out.split('\n').map(l => l.trim()).filter(Boolean).slice(1);
      } catch {}
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(info, null, 2));
    return;
  }

  if (req.method === 'POST' && req.url === '/print') {
    const chunks = [];
    req.on('data', c => chunks.push(c));
    req.on('end', () => {
      const data = Buffer.concat(chunks);
      if (!data.length) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'Data kosong' }));
        return;
      }
      console.log(`[Bridge] Menerima ${data.length} bytes, mengirim ke printer...`);
      sendToPrinter(data, (err) => {
        if (err) {
          console.error('[Bridge] GAGAL:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: err.message }));
        } else {
          console.log(`[Bridge] SUKSES`);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true }));
        }
      });
    });
    return;
  }

  res.writeHead(404); res.end('Not found');
});

server.listen(PORT, '127.0.0.1', () => {
  const comPort = os.platform() === 'win32' ? detectComPort() : null;
  const ports   = os.platform() === 'win32' ? listComPorts() : [];
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   Matchaboy Print Bridge v${VERSION}       ║
  ║   http://localhost:${PORT}                  ║
  ╚══════════════════════════════════════════╝

  Platform  : ${os.platform()}
  COM Port  : ${comPort || 'tidak terdeteksi'}
  Semua COM : ${ports.map(p => p.port).join(', ') || '-'}

  Kalau printer tidak terdeteksi otomatis:
  1. Buka Device Manager → Ports (COM & LPT)
  2. Catat nomor COM RPP02N (contoh: COM3)
  3. Stop server ini (Ctrl+C)
  4. Jalankan: set PRINTER_PORT=COM3 && node server.js

  Debug: http://localhost:${PORT}/debug
  `);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\nPort ${PORT} sudah dipakai.\nJalankan: taskkill /f /im node.exe\nlalu coba lagi.\n`);
  } else {
    console.error('[Error]', err.message);
  }
  process.exit(1);
});