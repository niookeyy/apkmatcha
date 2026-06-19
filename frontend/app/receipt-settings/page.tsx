'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Toast from '../components/ui/Toast';

// ─── Re-use same BT helpers (copy from cashier or extract to lib) ─────────────
const PRINT_BRIDGE_URL = 'http://localhost:9100';

let _btDevice: BluetoothDevice | null = null;
let _btChar: BluetoothRemoteGATTCharacteristic | null = null;

type PrintMethod = 'bluetooth' | 'bridge' | 'none';

async function detectPrintMethod(): Promise<PrintMethod> {
  try {
    const res = await fetch(`${PRINT_BRIDGE_URL}/ping`, { signal: AbortSignal.timeout(800) });
    if (res.ok) return 'bridge';
  } catch { /* not running */ }
  if (typeof navigator !== 'undefined' && 'bluetooth' in navigator) return 'bluetooth';
  return 'none';
}

async function connectBluetooth(): Promise<{ name: string; mac: string }> {
  const nav = navigator as any;
  const device: BluetoothDevice = await nav.bluetooth.requestDevice({
    filters: [
      { namePrefix: 'RPP' },
      { namePrefix: 'Printer' },
      { namePrefix: 'POS' },
      { namePrefix: 'BT' },
      { namePrefix: 'MP' },
    ],
    optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
  });
  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
  const char = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
  _btDevice = device;
  _btChar = char;
  device.addEventListener('gattserverdisconnected', () => { _btDevice = null; _btChar = null; });
  const id = (device as any).id || '';
  const mac = id.length > 12 ? id.slice(-17).toUpperCase() : id;
  return { name: device.name || 'Printer', mac };
}

async function testPrint(method: PrintMethod, lineWidth: number): Promise<void> {
  const ESC = 0x1b; const GS = 0x1d;
  const line = '-'.repeat(lineWidth);
  const center = (t: string) => ' '.repeat(Math.max(0, Math.floor((lineWidth - t.length) / 2))) + t;
  const lines = [
    center('TEST PRINT'),
    center('Matchaboy POS'),
    line,
    center('Printer terhubung!'),
    `Metode : ${method === 'bluetooth' ? 'Bluetooth' : 'Print Bridge'}`,
    `Lebar  : ${lineWidth} karakter`,
    line,
    center('Struk akan dicetak di sini'),
    '',
  ];
  const encoded = lines.map((l) => new TextEncoder().encode(l + '\n'));
  const init = new Uint8Array([ESC, 0x40]);
  const cut = new Uint8Array([GS, 0x56, 0x42, 0x00]);
  const total = [init, ...encoded, cut].reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of [init, ...encoded, cut]) { out.set(p, off); off += p.length; }

  if (method === 'bluetooth') {
    if (!_btChar) throw new Error('Printer Bluetooth belum terhubung');
    const CHUNK = 512;
    for (let i = 0; i < out.length; i += CHUNK) await _btChar.writeValue(out.slice(i, i + CHUNK));
  } else {
    const res = await fetch(`${PRINT_BRIDGE_URL}/print`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: out });
    if (!res.ok) throw new Error('Print Bridge gagal');
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
type ActiveTab = 'struk' | 'printer';

export default function ReceiptSettingsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('struk');
  const [loading, setLoading] = useState(true);

  // Printer state
  const [printerMethod, setPrinterMethod] = useState<PrintMethod>('none');
  const [printerName, setPrinterName] = useState('');
  const [printerMac, setPrinterMac] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [testPrinting, setTestPrinting] = useState(false);
  const [savedPrinters, setSavedPrinters] = useState<{ name: string; mac: string; method: string }[]>([]);

  const [toast, setToast] = useState({
    show: false,
    type: 'success' as 'success' | 'error' | 'warning',
    title: '',
    message: '',
  });

  const [form, setForm] = useState({
    storeName: 'Matchaboy',
    address: '',
    phone: '',
    cashierName: '',
    footer: 'Terima kasih sudah membeli 🍵',
    printerWidth: '32',
    showLogo: true,
    showAddress: true,
    showPhone: true,
  });

  useEffect(() => {
    fetchSettings();
    // Load saved printers from localStorage
    try {
      const saved = localStorage.getItem('matchaboy_printers');
      if (saved) setSavedPrinters(JSON.parse(saved));
    } catch { /* ignore */ }
    // Auto-detect bridge
    detectPrintMethod().then((m) => {
      if (m === 'bridge') { setPrinterMethod('bridge'); setPrinterName('Print Bridge'); }
    });
  }, []);

  function showToast(type: 'success' | 'error' | 'warning', title: string, message: string) {
    setToast({ show: true, type, title, message });
    setTimeout(() => setToast((p) => ({ ...p, show: false })), 3000);
  }

  async function fetchSettings() {
    try {
      setLoading(true);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/receipt-settings`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal mengambil setting struk');
      setForm({
        storeName: data.storeName || 'Matchaboy',
        address: data.address || '',
        phone: data.phone || '',
        cashierName: data.cashierName || '',
        footer: data.footer || 'Terima kasih sudah membeli 🍵',
        printerWidth: String(data.printerWidth || 32),
        showLogo: data.showLogo ?? true,
        showAddress: data.showAddress ?? true,
        showPhone: data.showPhone ?? true,
      });
    } catch (err: any) {
      showToast('error', 'Gagal memuat setting', err.message || 'Pastikan backend menyala.');
    } finally {
      setLoading(false);
    }
  }

  async function saveSettings() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/receipt-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, printerWidth: Number(form.printerWidth || 32) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyimpan setting struk');
      showToast('success', 'Setting struk disimpan', 'Format struk berhasil diperbarui.');
    } catch (err: any) {
      showToast('error', 'Gagal menyimpan', err.message || 'Terjadi kesalahan.');
    }
  }

  function resetSettings() {
    setForm({ storeName: 'Matchaboy', address: '', phone: '', cashierName: '', footer: 'Terima kasih sudah membeli 🍵', printerWidth: '32', showLogo: true, showAddress: true, showPhone: true });
    showToast('warning', 'Setting direset sementara', 'Klik Simpan Setting Struk agar tersimpan ke backend.');
  }

  // ─── Printer handlers ───────────────────────────────────────────────────────
  async function handleConnectBluetooth() {
    setConnecting(true);
    try {
      const { name, mac } = await connectBluetooth();
      setPrinterMethod('bluetooth');
      setPrinterName(name);
      setPrinterMac(mac);
      // Save to localStorage
      const newEntry = { name, mac, method: 'bluetooth' };
      const updated = [...savedPrinters.filter((p) => p.mac !== mac), newEntry];
      setSavedPrinters(updated);
      localStorage.setItem('matchaboy_printers', JSON.stringify(updated));
      showToast('success', 'Printer terhubung', `${name} (${mac}) siap digunakan.`);
    } catch (err: any) {
      if (err?.name === 'NotFoundError' || err?.message?.includes('cancelled')) {
        showToast('warning', 'Dibatalkan', 'Pemilihan printer dibatalkan.');
      } else {
        showToast('error', 'Gagal hubungkan', err.message || 'Terjadi kesalahan Bluetooth.');
      }
    } finally {
      setConnecting(false);
    }
  }

  async function handleCheckBridge() {
    setConnecting(true);
    try {
      const res = await fetch(`${PRINT_BRIDGE_URL}/ping`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const info = await res.json().catch(() => ({ version: '1.0' }));
        setPrinterMethod('bridge');
        setPrinterName(`Print Bridge v${info.version || '1.0'}`);
        setPrinterMac('localhost:9100');
        showToast('success', 'Print Bridge terdeteksi', 'Service lokal aktif dan siap digunakan.');
      } else throw new Error('Bridge tidak merespons');
    } catch {
      showToast('error', 'Print Bridge tidak ditemukan', 'Jalankan service Print Bridge di perangkat ini terlebih dahulu.');
    } finally {
      setConnecting(false);
    }
  }

  function handleDisconnect() {
    if (_btDevice?.gatt?.connected) _btDevice.gatt.disconnect();
    _btDevice = null; _btChar = null;
    setPrinterMethod('none'); setPrinterName(''); setPrinterMac('');
    showToast('warning', 'Printer diputus', 'Koneksi printer dilepas.');
  }

  function removeSavedPrinter(mac: string) {
    const updated = savedPrinters.filter((p) => p.mac !== mac);
    setSavedPrinters(updated);
    localStorage.setItem('matchaboy_printers', JSON.stringify(updated));
  }

  async function handleTestPrint() {
    if (printerMethod === 'none') {
      showToast('warning', 'Printer belum terhubung', 'Hubungkan printer terlebih dahulu.');
      return;
    }
    setTestPrinting(true);
    try {
      await testPrint(printerMethod, Number(form.printerWidth || 32));
      showToast('success', 'Test print berhasil', 'Struk test berhasil dicetak.');
    } catch (err: any) {
      showToast('error', 'Test print gagal', err.message || 'Terjadi kesalahan.');
    } finally {
      setTestPrinting(false);
    }
  }

  const isConnected = printerMethod !== 'none';

  return (
    <main className="min-h-screen bg-[#f4f7ef] flex">
      <Toast show={toast.show} type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast((p) => ({ ...p, show: false }))} />
      <Sidebar />

      <section className="flex-1 p-8 max-md:p-4 max-md:pt-20">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between max-md:flex-col max-md:items-start max-md:gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#2f3a25] max-md:text-2xl">Struk & Printer</h1>
            <p className="mt-1 text-[#6f7b62]">Atur tampilan struk dan koneksi printer thermal.</p>
          </div>
          {activeTab === 'struk' && (
            <button onClick={resetSettings} className="rounded-xl border border-red-200 bg-white px-5 py-3 font-semibold text-red-600 hover:bg-red-50 cursor-pointer max-md:w-full">
              Reset
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setActiveTab('struk')}
            className={`rounded-xl px-5 py-2.5 font-semibold text-sm transition cursor-pointer ${activeTab === 'struk' ? 'bg-[#2f4f32] text-white shadow' : 'bg-white border border-[#dfe8d2] text-[#6f7b62] hover:bg-[#eef5e8]'}`}
          >
            Edit Struk
          </button>
          <button
            onClick={() => setActiveTab('printer')}
            className={`rounded-xl px-5 py-2.5 font-semibold text-sm transition cursor-pointer flex items-center gap-2 ${activeTab === 'printer' ? 'bg-[#2f4f32] text-white shadow' : 'bg-white border border-[#dfe8d2] text-[#6f7b62] hover:bg-[#eef5e8]'}`}
          >
            Pengaturan Printer
            {isConnected && <span className="h-2 w-2 rounded-full bg-emerald-400" />}
          </button>
        </div>

        {/* ── TAB: STRUK ── */}
        {activeTab === 'struk' && (
          loading ? (
            <div className="rounded-3xl bg-white p-8 shadow border border-[#dfe8d2] text-[#6f7b62]">Memuat setting struk...</div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2] max-md:p-5">
                <h2 className="mb-5 text-xl font-bold text-[#2f3a25]">Pengaturan Struk</h2>
                <div className="space-y-4">
                  <ReceiptInput label="Nama Toko" value={form.storeName} onChange={(v) => setForm({ ...form, storeName: v })} placeholder="Matchaboy" />
                  <ReceiptInput label="Alamat Outlet" value={form.address} onChange={(v) => setForm({ ...form, address: v })} placeholder="Jl. Contoh No. 10, Sidoarjo" disabled={!form.showAddress} />
                  <ReceiptInput label="Nomor Telepon" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="0812xxxxxxx" disabled={!form.showPhone} />
                  <ReceiptInput label="Nama Kasir Default" value={form.cashierName} onChange={(v) => setForm({ ...form, cashierName: v })} placeholder="Admin" />
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#3f4b35]">Footer Struk</label>
                    <textarea rows={3} value={form.footer} onChange={(e) => setForm({ ...form, footer: e.target.value })} placeholder="Terima kasih sudah membeli"
                      className="w-full rounded-2xl border border-[#dfe8d2] bg-[#fdfefd] px-5 py-4 text-[#2f3a25] outline-none transition focus:border-[#86a96f] focus:ring-4 focus:ring-[#dfe8d2]" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-[#3f4b35]">Lebar Struk</label>
                    <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                      {[{ label: '58mm', val: '32', sub: '32 karakter' }, { label: '80mm', val: '42', sub: '42 karakter' }].map((opt) => (
                        <button key={opt.val} type="button" onClick={() => setForm({ ...form, printerWidth: opt.val })}
                          className={`rounded-2xl border p-4 text-left transition cursor-pointer ${form.printerWidth === opt.val ? 'border-[#6f8f5f] bg-[#eef5e8] shadow' : 'border-[#dfe8d2] bg-white hover:bg-[#f8fff4]'}`}>
                          <p className="font-bold text-[#2f3a25]">{opt.label}</p>
                          <p className="mt-1 text-xs text-[#6f7b62]">{opt.sub}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {[
                      { label: 'Tampilkan Logo', key: 'showLogo' },
                      { label: 'Tampilkan Alamat', key: 'showAddress' },
                      { label: 'Tampilkan Telepon', key: 'showPhone' },
                    ].map((t) => (
                      <ToggleCard key={t.key} label={t.label} active={(form as any)[t.key]} onClick={() => setForm({ ...form, [t.key]: !(form as any)[t.key] })} />
                    ))}
                  </div>
                  <button onClick={saveSettings} className="w-full rounded-2xl bg-[#6f8f5f] py-4 font-bold text-white hover:bg-[#5f7f4f] cursor-pointer">
                    Simpan Setting Struk
                  </button>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2] max-md:p-5">
                <h2 className="mb-5 text-xl font-bold text-[#2f3a25]">Preview Struk</h2>
                <div className="rounded-2xl bg-[#f8faf5] p-4 sm:p-6 border border-[#dfe8d2] overflow-x-auto">
                  <div className={`mx-auto rounded-xl bg-white p-5 font-mono text-sm leading-relaxed text-[#2f3a25] shadow ${form.printerWidth === '32' ? 'max-w-[280px]' : 'max-w-[360px]'}`}>
                    {form.showLogo && (
                      <div className="mb-3 flex justify-center">
                        <img src="/logo.svg" alt="Logo" className="h-14 w-14 object-contain" draggable={false} />
                      </div>
                    )}
                    <pre className="whitespace-pre-wrap">{buildReceiptPreview(form)}</pre>
                  </div>
                </div>
                <p className="mt-4 text-sm text-[#8a947d]">Preview berubah otomatis sesuai toggle dan input di kiri.</p>
              </div>
            </div>
          )
        )}

        {/* ── TAB: PRINTER ── */}
        {activeTab === 'printer' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Left: connection */}
            <div className="space-y-5">
              {/* Status card */}
              <div className={`rounded-3xl p-6 shadow border ${isConnected ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-[#dfe8d2]'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[#6f7b62] mb-1">Status Printer</p>
                    <div className="flex items-center gap-2">
                      <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      <p className={`text-xl font-bold ${isConnected ? 'text-emerald-700' : 'text-[#8a947d]'}`}>
                        {isConnected ? printerName : 'Tidak Ada Printer'}
                      </p>
                    </div>
                    {printerMac && <p className="mt-1 text-xs text-[#6f7b62] font-mono">{printerMac}</p>}
                    {isConnected && (
                      <p className="mt-1 text-xs text-emerald-600">
                        via {printerMethod === 'bluetooth' ? 'Bluetooth' : 'Print Bridge (Local Service)'}
                      </p>
                    )}
                  </div>
                  {isConnected && (
                    <button onClick={handleDisconnect} className="rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 cursor-pointer">
                      Putuskan
                    </button>
                  )}
                </div>
              </div>

              {/* Connect options */}
              <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2]">
                <h2 className="text-lg font-bold text-[#2f3a25] mb-1">Hubungkan Printer</h2>
                <p className="text-sm text-[#6f7b62] mb-5">Pilih metode koneksi sesuai perangkat yang digunakan.</p>

                <div className="space-y-3">
                  {/* Bluetooth option */}
                  <div className="rounded-2xl border border-[#dfe8d2] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-[#2f3a25]">Bluetooth</p>
                          <span className="rounded-full bg-[#eef5e8] px-2 py-0.5 text-xs font-semibold text-[#5f7f4f]">Android · Windows</span>
                        </div>
                        <p className="text-xs text-[#6f7b62]">Gunakan Chrome. Printer RPP02N, MP Series, dan printer ESC/POS lainnya.</p>
                      </div>
                      <button
                        onClick={handleConnectBluetooth}
                        disabled={connecting}
                        className="shrink-0 rounded-xl bg-[#2f4f32] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3f5f42] disabled:opacity-50 cursor-pointer"
                      >
                        {connecting ? 'Mencari...' : 'Scan & Hubungkan'}
                      </button>
                    </div>
                  </div>

                  {/* Print Bridge option */}
                  <div className="rounded-2xl border border-[#dfe8d2] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold text-[#2f3a25]">Print Bridge</p>
                          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">iOS · Android · Windows</span>
                        </div>
                        <p className="text-xs text-[#6f7b62]">Install service lokal di perangkat kasir. Mendukung semua OS termasuk iOS Safari.</p>
                      </div>
                      <button
                        onClick={handleCheckBridge}
                        disabled={connecting}
                        className="shrink-0 rounded-xl border border-[#2f4f32] px-4 py-2.5 text-sm font-semibold text-[#2f4f32] hover:bg-[#eef5e8] disabled:opacity-50 cursor-pointer"
                      >
                        {connecting ? 'Mengecek...' : 'Cek Koneksi'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Test print */}
              <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2]">
                <h2 className="text-lg font-bold text-[#2f3a25] mb-2">Test Print</h2>
                <p className="text-sm text-[#6f7b62] mb-4">Cetak struk uji coba untuk memastikan printer bekerja dengan benar.</p>
                <button
                  onClick={handleTestPrint}
                  disabled={!isConnected || testPrinting}
                  className="w-full rounded-xl bg-[#6f8f5f] py-3 font-bold text-white hover:bg-[#5f7f4f] disabled:opacity-40 cursor-pointer transition"
                >
                  {testPrinting ? 'Mencetak...' : isConnected ? '🖨 Cetak Struk Test' : 'Hubungkan printer dulu'}
                </button>
              </div>
            </div>

            {/* Right: saved printers + guide */}
            <div className="space-y-5">
              {/* Saved printers */}
              <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2]">
                <h2 className="text-lg font-bold text-[#2f3a25] mb-4">Printer Tersimpan</h2>
                {savedPrinters.length === 0 ? (
                  <div className="rounded-2xl bg-[#f4f7ef] p-5 text-center text-sm text-[#8a947d]">
                    Belum ada printer tersimpan. Hubungkan printer untuk menyimpan ke daftar.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {savedPrinters.map((p) => (
                      <div key={p.mac} className="flex items-center justify-between rounded-2xl border border-[#dfe8d2] p-4">
                        <div>
                          <p className="font-semibold text-[#2f3a25]">{p.name}</p>
                          <p className="text-xs font-mono text-[#6f7b62]">{p.mac}</p>
                          <p className="text-xs text-[#8a947d]">{p.method}</p>
                        </div>
                        <button onClick={() => removeSavedPrinter(p.mac)} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 cursor-pointer">
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* iOS guide: Print Bridge install */}
              <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2]">
                <h2 className="text-lg font-bold text-[#2f3a25] mb-2">Cara Install Print Bridge</h2>
                <p className="text-sm text-[#6f7b62] mb-4">Diperlukan untuk iOS Safari dan sebagai fallback di semua OS.</p>
                <div className="space-y-3">
                  {[
                    { step: '1', title: 'Install Node.js', desc: 'Download dari nodejs.org dan install di perangkat kasir.' },
                    { step: '2', title: 'Download Print Bridge', desc: 'Download file print-bridge.zip dari dashboard lalu extract.' },
                    { step: '3', title: 'Jalankan service', desc: 'Buka terminal di folder tersebut, jalankan: node server.js' },
                    { step: '4', title: 'Cek koneksi', desc: 'Kembali ke tab ini dan tekan "Cek Koneksi" di atas.' },
                  ].map((s) => (
                    <div key={s.step} className="flex gap-3">
                      <div className="h-7 w-7 shrink-0 rounded-full bg-[#eef5e8] flex items-center justify-center text-sm font-bold text-[#5f7f4f]">{s.step}</div>
                      <div>
                        <p className="font-semibold text-[#2f3a25] text-sm">{s.title}</p>
                        <p className="text-xs text-[#6f7b62]">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-100 p-4 text-xs text-blue-700">
                  <strong>Catatan iOS:</strong> Web Bluetooth tidak didukung Safari. Print Bridge adalah satu-satunya cara print dari iPad/iPhone tanpa install app native.
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function ReceiptInput({ label, value, onChange, placeholder, disabled = false }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; disabled?: boolean }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#3f4b35]">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={disabled ? 'Dinonaktifkan' : placeholder} disabled={disabled}
        className={`w-full rounded-2xl border px-5 py-4 text-[#2f3a25] outline-none transition ${disabled ? 'cursor-not-allowed border-[#dfe8d2] bg-gray-100 text-gray-400' : 'border-[#dfe8d2] bg-[#fdfefd] focus:border-[#86a96f] focus:ring-4 focus:ring-[#dfe8d2]'}`} />
    </div>
  );
}

function ToggleCard({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-2xl border p-4 text-left transition cursor-pointer ${active ? 'border-[#6f8f5f] bg-[#eef5e8] shadow' : 'border-gray-200 bg-gray-50 hover:bg-white'}`}>
      <p className={active ? 'font-bold text-[#2f3a25]' : 'font-bold text-gray-400'}>{label}</p>
      <p className={active ? 'mt-1 text-xs text-[#6f7b62]' : 'mt-1 text-xs text-gray-400'}>{active ? 'Aktif' : 'Nonaktif'}</p>
    </button>
  );
}

function buildReceiptPreview(form: any) {
  const lineWidth = Number(form.printerWidth || 32);
  const center = (text: string) => { const s = Math.max(0, Math.floor((lineWidth - (text || '').length) / 2)); return ' '.repeat(s) + text; };
  const formatLine = (left: string, right: string) => left + ' '.repeat(Math.max(1, lineWidth - left.length - right.length)) + right;
  const lines = [center(form.storeName.toUpperCase() || 'MATCHABOY')];
  if (form.showAddress && form.address) lines.push(center(form.address));
  if (form.showPhone && form.phone) lines.push(center(form.phone));
  lines.push('-'.repeat(lineWidth));
  lines.push(center('NO ANTRIAN: 12'));
  lines.push('-'.repeat(lineWidth));
  lines.push('TRX: 12345678');
  lines.push('21/05/2026 18.30');
  if (form.cashierName) lines.push(`Kasir: ${form.cashierName}`);
  lines.push('-'.repeat(lineWidth));
  lines.push('Matcha Latte');
  lines.push(formatLine('1 x Rp20.000', 'Rp20.000'));
  lines.push('Catatan: less ice');
  lines.push('+ Extra Matcha Rp5.000');
  lines.push('Matcha Cream');
  lines.push(formatLine('2 x Rp18.000', 'Rp36.000'));
  lines.push('-'.repeat(lineWidth));
  lines.push(formatLine('SUBTOTAL', 'Rp61.000'));
  lines.push(formatLine('DISKON', '-Rp5.000'));
  lines.push(formatLine('TOTAL', 'Rp56.000'));
  lines.push(formatLine('BAYAR', 'Rp60.000'));
  lines.push(formatLine('KEMBALI', 'Rp4.000'));
  lines.push('CASH - PAID');
  lines.push('-'.repeat(lineWidth));
  lines.push(center(form.footer || 'Terima kasih'));
  return lines.join('\n');
}