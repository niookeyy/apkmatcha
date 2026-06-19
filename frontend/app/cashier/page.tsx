'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
import Sidebar from '../components/Sidebar';
import Toast from '../components/ui/Toast';

// ─── ESC/POS helpers ─────────────────────────────────────────────────────────
const ESC = 0x1b;
const GS  = 0x1d;

function escposText(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function buildEscPos(lines: string[]): Uint8Array {
  const parts: Uint8Array[] = [];
  parts.push(new Uint8Array([ESC, 0x40]));
  for (const line of lines) {
    parts.push(escposText(line + '\n'));
  }
  parts.push(new Uint8Array([GS, 0x56, 0x42, 0x00]));
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return out;
}

// ─── Bluetooth helpers ────────────────────────────────────────────────────────
type BtState = { device: BluetoothDevice | null; char: BluetoothRemoteGATTCharacteristic | null };

const PRINT_BRIDGE_URL = 'http://localhost:9100';
type PrintMethod = 'bluetooth' | 'bridge' | 'none';

// Dua slot printer: kasir dan dapur
const btKasir: BtState   = { device: null, char: null };
const btDapur: BtState   = { device: null, char: null };

async function detectBridge(): Promise<boolean> {
  try {
    const res = await fetch(`${PRINT_BRIDGE_URL}/ping`, { signal: AbortSignal.timeout(800) });
    return res.ok;
  } catch { return false; }
}

async function ensureBtConnected(slot: BtState): Promise<void> {
  if (slot.char && slot.device?.gatt?.connected) return;
  const nav = navigator as any;
  if (!nav.bluetooth) throw new Error('Web Bluetooth tidak didukung');
  const devices: BluetoothDevice[] = await nav.bluetooth.getDevices();
  if (!devices.length) throw new Error('Tidak ada printer tersimpan.');
  const device = devices.find((d) => /RPP|POS|Printer|BT|MP/i.test(d.name || '')) || devices[0];
  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
  const char = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
  slot.device = device;
  slot.char = char;
  device.addEventListener('gattserverdisconnected', () => { slot.device = null; slot.char = null; });
}

async function sendViaBluetooth(slot: BtState, data: Uint8Array): Promise<void> {
  await ensureBtConnected(slot);
  const CHUNK = 512;
  for (let i = 0; i < data.length; i += CHUNK) {
    await slot.char!.writeValue(data.slice(i, i + CHUNK));
  }
}

async function sendViaBridge(data: Uint8Array): Promise<void> {
  const res = await fetch(`${PRINT_BRIDGE_URL}/print`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: data.buffer as ArrayBuffer,
  });
  if (!res.ok) throw new Error('Print Bridge gagal');
}

async function connectBluetoothDevice(): Promise<{ device: BluetoothDevice; char: BluetoothRemoteGATTCharacteristic }> {
  const nav = navigator as any;
  const device: BluetoothDevice = await nav.bluetooth.requestDevice({
    filters: [{ namePrefix: 'RPP' }, { namePrefix: 'Printer' }, { namePrefix: 'POS' }, { namePrefix: 'BT' }],
    optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb'],
  });
  const server = await device.gatt!.connect();
  const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
  const char = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');
  return { device, char };
}

// ─── Printer slot state (untuk satu printer role) ─────────────────────────────
interface PrinterSlot {
  method: PrintMethod;
  name: string;
}

const emptySlot = (): PrinterSlot => ({ method: 'none', name: '' });

// ─── Component ────────────────────────────────────────────────────────────────
export default function CashierPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [mobileCheckoutOpen, setMobileCheckoutOpen] = useState(false);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS'>('CASH');
  const [paid, setPaid] = useState('');
  const [loadingPay, setLoadingPay] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  const [discount, setDiscount] = useState('');
  const [queueNumber, setQueueNumber] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [customerName, setCustomerName] = useState('');

  // ── 3 slot printer ──
  const [printerKasir, setPrinterKasir]   = useState<PrinterSlot>(emptySlot());
  const [printerDapur, setPrinterDapur]   = useState<PrinterSlot>(emptySlot());
  const [connectingSlot, setConnectingSlot] = useState<'kasir' | 'dapur' | null>(null);
  // Dropdown state
  const [printerMenuOpen, setPrinterMenuOpen] = useState(false);

  const [toast, setToast] = useState({ show: false, type: 'success' as 'success'|'error'|'warning', title: '', message: '' });

  const subtotal      = cart.reduce((sum, i) => sum + Number(i.price||0)*Number(i.qty||0), 0);
  const discountValue = Number(discount||0);
  const total         = Math.max(subtotal - discountValue, 0);
  const change        = Number(paid||0) - total;
  const totalItems    = cart.reduce((sum, i) => sum + Number(i.qty||0), 0);
  const filteredProducts = products.filter((p) => {
    const kw = search.toLowerCase();
    return p.name?.toLowerCase().includes(kw) || p.code?.toLowerCase().includes(kw);
  });

  // Label gabungan untuk header (tampilkan singkat)
  const printerLabel = (() => {
    const k = printerKasir.method !== 'none';
    const d = printerDapur.method !== 'none';
    if (k && d) return 'Kasir + Dapur';
    if (k) return `Kasir: ${printerKasir.name}`;
    if (d) return `Dapur: ${printerDapur.name}`;
    return '';
  })();
  const anyPrinterConnected = printerKasir.method !== 'none' || printerDapur.method !== 'none';

  useEffect(() => {
    fetchProducts();
    // Auto-detect bridge
    detectBridge().then((ok) => {
      if (ok) {
        setPrinterKasir({ method: 'bridge', name: 'Print Bridge' });
        setPrinterDapur({ method: 'bridge', name: 'Print Bridge' });
      }
    });
  }, []);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');
    socket.on('payment-update', async (data) => {
      if (!lastTransaction?.id) return;
      if (data.transactionId === lastTransaction.id) {
        setLastTransaction((prev: any) => ({ ...prev, paymentStatus: data.status }));
        if (data.status === 'PAID') {
          await Swal.fire({ icon: 'success', title: 'Pembayaran berhasil', text: 'QRIS sudah dibayar customer.', confirmButtonText: 'Oke', confirmButtonColor: '#2f4f32' });
          await fetchProducts();
        }
      }
    });
    return () => { socket.disconnect(); };
  }, [lastTransaction?.id]);

  // Close printer menu on outside click
  useEffect(() => {
    if (!printerMenuOpen) return;
    const handler = () => setPrinterMenuOpen(false);
    setTimeout(() => document.addEventListener('click', handler), 0);
    return () => document.removeEventListener('click', handler);
  }, [printerMenuOpen]);

  function showToast(type: 'success'|'error'|'warning', title: string, message: string) {
    setToast({ show: true, type, title, message });
    setTimeout(() => setToast((p) => ({ ...p, show: false })), 3000);
  }
  async function showSwal(icon: 'success'|'error'|'warning'|'info', title: string, text: string) {
    await Swal.fire({ icon, title, text, confirmButtonText: 'Oke', confirmButtonColor: '#2f4f32' });
  }
  function getImageSrc(imageUrl?: string) {
    if (!imageUrl) return '/logo.svg';
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${process.env.NEXT_PUBLIC_API_URL}${imageUrl}`;
  }
  async function fetchProducts() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/active`);
      const data = await res.json();
      if (Array.isArray(data)) setProducts(data);
      else if (Array.isArray(data.data)) setProducts(data.data);
      else setProducts([]);
    } catch { await showSwal('error', 'Gagal memuat produk', 'Pastikan backend menyala.'); }
  }

  // ── Connect / disconnect printer per slot ──────────────────────────────────
  async function connectSlot(role: 'kasir' | 'dapur') {
    setConnectingSlot(role);
    setPrinterMenuOpen(false);
    try {
      // Cek bridge dulu
      const bridgeOk = await detectBridge();
      if (bridgeOk) {
        const slot: PrinterSlot = { method: 'bridge', name: 'Print Bridge' };
        role === 'kasir' ? setPrinterKasir(slot) : setPrinterDapur(slot);
        showToast('success', `Printer ${role} terhubung`, 'Print Bridge aktif.');
        return;
      }
      // Bluetooth
      const nav = navigator as any;
      if (!nav.bluetooth) {
        await showSwal('warning', 'Printer tidak tersedia', 'Install Print Bridge atau gunakan Chrome untuk Bluetooth.');
        return;
      }
      const { device, char } = await connectBluetoothDevice();
      const btSlot = role === 'kasir' ? btKasir : btDapur;
      btSlot.device = device;
      btSlot.char   = char;
      device.addEventListener('gattserverdisconnected', () => { btSlot.device = null; btSlot.char = null; });
      const slot: PrinterSlot = { method: 'bluetooth', name: device.name || 'Printer' };
      role === 'kasir' ? setPrinterKasir(slot) : setPrinterDapur(slot);
      showToast('success', `Printer ${role} terhubung`, `${device.name || 'Printer'} siap.`);
    } catch (err: any) {
      if (err?.name === 'NotFoundError' || err?.message?.includes('cancelled')) {
        showToast('warning', 'Dibatalkan', 'Pemilihan printer dibatalkan.');
      } else {
        showToast('error', `Gagal hubungkan printer ${role}`, err.message || 'Terjadi kesalahan.');
      }
    } finally {
      setConnectingSlot(null);
    }
  }

  function disconnectSlot(role: 'kasir' | 'dapur') {
    const btSlot = role === 'kasir' ? btKasir : btDapur;
    if (btSlot.device?.gatt?.connected) btSlot.device.gatt.disconnect();
    btSlot.device = null; btSlot.char = null;
    role === 'kasir' ? setPrinterKasir(emptySlot()) : setPrinterDapur(emptySlot());
    showToast('warning', `Printer ${role} diputus`, 'Koneksi dilepas.');
    setPrinterMenuOpen(false);
  }

  // ── Send to specific slot ──────────────────────────────────────────────────
  async function sendToSlot(lines: string[], slot: PrinterSlot, btSlot: BtState) {
    const data = buildEscPos(lines);
    if (slot.method === 'bluetooth') {
      await sendViaBluetooth(btSlot, data);
    } else if (slot.method === 'bridge') {
      await sendViaBridge(data);
    } else {
      throw new Error('Printer belum terhubung');
    }
  }

  // ── Fetch receipt texts ────────────────────────────────────────────────────
  async function fetchReceiptText(id: string): Promise<string> {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transactions/${id}/receipt-text`);
    const text = await res.text();
    if (!res.ok) throw new Error(text || 'Gagal mengambil struk pelanggan.');
    return text;
  }
  async function fetchKitchenReceiptText(id: string): Promise<string> {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transactions/${id}/kitchen-receipt-text`);
    const text = await res.text();
    if (!res.ok) throw new Error(text || 'Gagal mengambil struk dapur.');
    return text;
  }

  // ── Cart functions ─────────────────────────────────────────────────────────
  async function addToCart(product: any) {
    if (product.stock <= 0) { await showSwal('warning', 'Stok habis', `${product.name} tidak tersedia.`); return; }
    const existing = cart.find((item) => item.id === product.id);
    if (existing) {
      if (existing.qty + 1 > product.stock) { await showSwal('warning', 'Stok tidak cukup', `Stok ${product.name} tersisa ${product.stock}.`); return; }
      setCart(cart.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      setCart([...cart, { ...product, qty: 1, basePrice: Number(product.price||0), addOns: [], note: '' }]);
    }
  }
  function decreaseQty(id: string) {
    setCart(cart.map((i) => i.id===id ? {...i, qty: i.qty-1} : i).filter((i) => i.qty > 0));
  }
  function updateItemNote(id: string, note: string) {
    setCart(cart.map((i) => i.id===id ? {...i, note} : i));
  }
  function addOnToItem(id: string, addOn: any) {
    setCart(cart.map((item) => {
      if (item.id !== id) return item;
      const newAddOns = [...(item.addOns||[]), addOn];
      const addOnTotal = newAddOns.reduce((s: number, a: any) => s + Number(a.price||0), 0);
      const basePrice = Number(item.basePrice||item.price||0);
      return { ...item, addOns: newAddOns, price: basePrice + addOnTotal, basePrice };
    }));
  }
  function removeAddOn(id: string, index: number) {
    setCart(cart.map((item) => {
      if (item.id !== id) return item;
      const newAddOns = (item.addOns||[]).filter((_: any, i: number) => i !== index);
      const addOnTotal = newAddOns.reduce((s: number, a: any) => s + Number(a.price||0), 0);
      const basePrice = Number(item.basePrice||item.price||0);
      return { ...item, addOns: newAddOns, price: basePrice + addOnTotal, basePrice };
    }));
  }
  async function clearCart() {
    if (cart.length === 0 && !lastTransaction) { await showSwal('info', 'Keranjang kosong', 'Belum ada item yang perlu dibatalkan.'); return; }
    const result = await Swal.fire({
      icon: 'warning', title: 'Kosongkan keranjang?', text: 'Item, diskon, catatan, dan transaksi terakhir akan dibersihkan.',
      showCancelButton: true, confirmButtonText: 'Ya, kosongkan', cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626', cancelButtonColor: '#2f4f32', reverseButtons: true,
    });
    if (!result.isConfirmed) return;
    setCart([]); setPaid(''); setDiscount(''); setQueueNumber(''); setOrderNote('');
    setCustomerName(''); setLastTransaction(null); setMobileCheckoutOpen(false);
    await showSwal('success', 'Keranjang dibersihkan', 'Keranjang berhasil dikosongkan.');
  }
  async function goToMobileCheckout() {
    if (cart.length === 0) { await showSwal('warning', 'Belum ada produk', 'Pilih produk terlebih dahulu.'); return; }
    setMobileCheckoutOpen(true);
  }
  async function openPayment(method: 'CASH'|'QRIS') {
    if (cart.length === 0) { await showSwal('warning', 'Keranjang kosong', 'Pilih produk terlebih dahulu.'); return; }
    if (discountValue > subtotal) { await showSwal('warning', 'Diskon tidak valid', 'Diskon tidak boleh lebih besar dari subtotal.'); return; }
    setPaymentMethod(method);
    setPaid(method === 'QRIS' ? String(total) : '');
    setLastTransaction(null);
    setPaymentOpen(true);
  }
  async function processPayment() {
    try {
      setLoadingPay(true);
      if (paymentMethod === 'CASH' && Number(paid||0) < total) { await showSwal('error', 'Uang kurang', 'Nominal bayar kurang dari total pembayaran.'); return; }
      const payload = {
        paymentMethod,
        paid: paymentMethod === 'CASH' ? Number(paid) : total,
        discount: discountValue,
        queueNumber: queueNumber ? Number(queueNumber) : undefined,
        note: orderNote,
        customerName: customerName || undefined,
        items: cart.map((item) => ({ productId: item.id, qty: item.qty, note: item.note||'', addOns: item.addOns||[] })),
      };
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transactions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Transaksi gagal');
      setLastTransaction(data);
      await Swal.fire({ icon: 'success', title: paymentMethod === 'CASH' ? 'Pembayaran berhasil' : 'QRIS berhasil', text: paymentMethod === 'CASH' ? 'Transaksi tunai berhasil disimpan.' : 'Transaksi QRIS berhasil disimpan.', confirmButtonText: 'Oke', confirmButtonColor: '#2f4f32' });
      await fetchProducts();
    } catch (err: any) {
      await Swal.fire({ icon: 'error', title: 'Transaksi gagal', text: err.message||'Terjadi kesalahan.', confirmButtonText: 'Oke', confirmButtonColor: '#2f4f32' });
    } finally { setLoadingPay(false); }
  }
  async function cancelTransaction() {
    if (!lastTransaction?.id) { await Swal.fire({ icon: 'warning', title: 'Belum ada transaksi', text: 'Selesaikan pembayaran dulu.', confirmButtonText: 'Oke', confirmButtonColor: '#2f4f32' }); return; }
    if (lastTransaction.status === 'CANCELLED') { await Swal.fire({ icon: 'info', title: 'Transaksi sudah dibatalkan', text: '', confirmButtonText: 'Oke', confirmButtonColor: '#2f4f32' }); return; }
    const result = await Swal.fire({
      icon: 'warning', title: 'Batalkan transaksi?', text: 'Stok produk dan bahan baku akan dikembalikan.',
      input: 'textarea', inputLabel: 'Alasan pembatalan transaksi', inputPlaceholder: 'Contoh: customer batal, salah input pesanan...',
      showCancelButton: true, confirmButtonText: 'Ya, batalkan', cancelButtonText: 'Tidak',
      confirmButtonColor: '#dc2626', cancelButtonColor: '#2f4f32', reverseButtons: true,
      inputValidator: (value) => (!value||!value.trim()) ? 'Alasan pembatalan wajib diisi.' : null,
    });
    if (!result.isConfirmed) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transactions/${lastTransaction.id}/cancel`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reason: result.value||'Dibatalkan kasir' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message||'Transaksi gagal dibatalkan');
      setLastTransaction(data);
      await Swal.fire({ icon: 'success', title: 'Transaksi dibatalkan', text: 'Stok dan cashflow sudah dikoreksi.', confirmButtonText: 'Oke', confirmButtonColor: '#2f4f32' });
      await fetchProducts();
    } catch (err: any) {
      await Swal.fire({ icon: 'error', title: 'Gagal batal transaksi', text: err.message||'Terjadi kesalahan.', confirmButtonText: 'Oke', confirmButtonColor: '#2f4f32' });
    }
  }

  // ── Print functions ────────────────────────────────────────────────────────
  async function printKasir() {
    if (!lastTransaction?.id) { await showSwal('warning', 'Belum ada transaksi', 'Selesaikan pembayaran dulu.'); return; }
    if (printerKasir.method === 'none') { await showSwal('warning', 'Printer kasir belum terhubung', 'Hubungkan printer kasir terlebih dahulu.'); return; }
    try {
      const text = await fetchReceiptText(lastTransaction.id);
      await sendToSlot(text.split('\n'), printerKasir, btKasir);
      showToast('success', 'Struk kasir dicetak', `Via ${printerKasir.method === 'bluetooth' ? 'Bluetooth' : 'Print Bridge'}.`);
    } catch (err: any) {
      await showSwal('error', 'Gagal cetak struk kasir', err.message||'Terjadi kesalahan.');
    }
  }

  async function printDapur() {
    if (!lastTransaction?.id) { await showSwal('warning', 'Belum ada transaksi', 'Selesaikan pembayaran dulu.'); return; }
    if (printerDapur.method === 'none') { await showSwal('warning', 'Printer dapur belum terhubung', 'Hubungkan printer dapur terlebih dahulu.'); return; }
    try {
      const text = await fetchKitchenReceiptText(lastTransaction.id);
      await sendToSlot(text.split('\n'), printerDapur, btDapur);
      showToast('success', 'Struk dapur dicetak', `Via ${printerDapur.method === 'bluetooth' ? 'Bluetooth' : 'Print Bridge'}.`);
    } catch (err: any) {
      await showSwal('error', 'Gagal cetak struk dapur', err.message||'Terjadi kesalahan.');
    }
  }

  async function printAll() {
    if (!lastTransaction?.id) { await showSwal('warning', 'Belum ada transaksi', 'Selesaikan pembayaran dulu.'); return; }
    const noKasir = printerKasir.method === 'none';
    const noDapur = printerDapur.method === 'none';
    if (noKasir && noDapur) { await showSwal('warning', 'Printer belum terhubung', 'Hubungkan minimal satu printer.'); return; }
    try {
      if (!noKasir) {
        const text = await fetchReceiptText(lastTransaction.id);
        await sendToSlot(text.split('\n'), printerKasir, btKasir);
      }
      if (!noDapur) {
        await new Promise((r) => setTimeout(r, 300));
        const text = await fetchKitchenReceiptText(lastTransaction.id);
        await sendToSlot(text.split('\n'), printerDapur, btDapur);
      }
      const printed = [!noKasir && 'kasir', !noDapur && 'dapur'].filter(Boolean).join(' + ');
      showToast('success', '2 Struk dicetak', `Struk ${printed} berhasil dicetak.`);
    } catch (err: any) {
      await showSwal('error', 'Gagal cetak struk', err.message||'Terjadi kesalahan.');
    }
  }

  async function finishTransaction() {
    if (!lastTransaction) { await showSwal('warning', 'Belum ada transaksi', 'Tidak ada transaksi yang bisa diselesaikan.'); return; }
    setCart([]); setPaid(''); setDiscount(''); setQueueNumber(''); setOrderNote('');
    setCustomerName(''); setLastTransaction(null); setPaymentOpen(false); setMobileCheckoutOpen(false);
    await Swal.fire({ icon: 'success', title: 'Transaksi selesai', text: 'Kasir siap menerima transaksi berikutnya.', confirmButtonText: 'Oke', confirmButtonColor: '#2f4f32' });
  }

  return (
    <main className="min-h-screen bg-[#eef5e8] flex text-[#21351f]">
      <Toast show={toast.show} type={toast.type} title={toast.title} message={toast.message} onClose={() => setToast((p) => ({ ...p, show: false }))} />
      <Sidebar />

      {/* PRODUCT LIST */}
      <section className={`flex-1 flex-col min-w-0 ${mobileCheckoutOpen ? 'max-md:hidden' : 'flex'}`}>
        <header className="h-20 bg-white border-b border-[#dfe8d2] flex items-center justify-between px-6 max-md:h-auto max-md:flex-col max-md:items-start max-md:gap-3 max-md:pt-20 max-md:pb-5">
          <div className="max-md:w-full">
            <h1 className="text-2xl font-bold">Kasir</h1>
            <p className="text-sm text-[#6f7b62]">Pilih produk untuk transaksi</p>
          </div>

          <div className="flex items-center gap-3 max-md:w-full">

            {/* ── PRINTER BUTTON + DROPDOWN ── */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => setPrinterMenuOpen((v) => !v)}
                disabled={connectingSlot !== null}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold cursor-pointer transition max-md:flex-1 ${
                  anyPrinterConnected
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'border-[#dfe8d2] bg-white text-[#6f7b62] hover:bg-[#f4f7ef]'
                }`}
              >
                {connectingSlot ? (
                  <><span className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />Menghubungkan...</>
                ) : anyPrinterConnected ? (
                  <><span className="h-2 w-2 rounded-full bg-emerald-500" />{printerLabel} ▾</>
                ) : (
                  <><span className="h-2 w-2 rounded-full bg-gray-300" />Hubungkan Printer ▾</>
                )}
              </button>

              {/* Dropdown */}
              {printerMenuOpen && (
                <div className="absolute right-0 top-12 z-50 w-72 rounded-2xl border border-[#dfe8d2] bg-white shadow-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-[#8a947d] uppercase tracking-wide mb-1">Printer Kasir (Struk Pelanggan)</p>
                  {printerKasir.method !== 'none' ? (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="font-semibold">{printerKasir.name}</span>
                      </div>
                      <button onClick={() => disconnectSlot('kasir')} className="text-xs text-red-500 hover:underline">Putus</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => connectSlot('kasir')}
                      disabled={connectingSlot !== null}
                      className="w-full rounded-xl border border-dashed border-[#8ac79f] py-2 text-sm text-[#008f67] hover:bg-[#f4fff8] disabled:opacity-50"
                    >
                      {connectingSlot === 'kasir' ? 'Menghubungkan...' : '+ Hubungkan Printer Kasir'}
                    </button>
                  )}

                  <div className="border-t border-[#eef2e8]" />

                  <p className="text-xs font-bold text-[#8a947d] uppercase tracking-wide mb-1">Printer Dapur (Struk Dapur)</p>
                  {printerDapur.method !== 'none' ? (
                    <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm text-emerald-700">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="font-semibold">{printerDapur.name}</span>
                      </div>
                      <button onClick={() => disconnectSlot('dapur')} className="text-xs text-red-500 hover:underline">Putus</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => connectSlot('dapur')}
                      disabled={connectingSlot !== null}
                      className="w-full rounded-xl border border-dashed border-[#8ac79f] py-2 text-sm text-[#008f67] hover:bg-[#f4fff8] disabled:opacity-50"
                    >
                      {connectingSlot === 'dapur' ? 'Menghubungkan...' : '+ Hubungkan Printer Dapur'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <button onClick={clearCart} className="rounded-full border border-red-200 px-8 py-2 text-red-600 hover:bg-red-50 cursor-pointer max-md:flex-1">Batalkan</button>
          </div>
        </header>

        <div className="p-6 max-md:p-4 max-md:pb-32">
          <div className="flex gap-3 mb-5 max-sm:flex-col">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk..."
              className="w-full rounded-xl border border-[#8ac79f] bg-white px-4 py-3 text-[#21351f] outline-none" />
            <button onClick={fetchProducts} className="rounded-xl border border-[#008f67] px-6 py-3 font-semibold text-[#008f67] cursor-pointer">Refresh</button>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 max-md:block max-md:space-y-0 max-md:rounded-3xl max-md:bg-white max-md:border max-md:border-[#dfe8d2] max-md:overflow-hidden">
            {filteredProducts.map((product) => {
              const cartItem = cart.find((item) => item.id === product.id);
              return (
                <button key={product.id} onClick={() => addToCart(product)} disabled={product.stock <= 0}
                  className="relative rounded-2xl bg-white p-5 text-left border border-[#dfe8d2] shadow-sm hover:shadow-md hover:bg-[#f8fff4] cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed max-md:flex max-md:w-full max-md:items-center max-md:gap-4 max-md:rounded-none max-md:border-0 max-md:border-b max-md:border-[#eef2e8] max-md:bg-white max-md:p-4 max-md:shadow-none"
                >
                  <div className="mb-4 h-40 overflow-hidden rounded-2xl bg-white border border-[#eef2e8] flex items-center justify-center max-md:mb-0 max-md:h-16 max-md:w-16 max-md:shrink-0 max-md:rounded-2xl">
                    <img src={getImageSrc(product.imageUrl)} alt={product.name} className={`max-h-[90%] max-w-[90%] ${product.imageUrl ? 'object-contain' : 'object-contain opacity-70'}`} draggable={false} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[#21351f] max-md:text-lg max-md:leading-snug">{product.name}</p>
                    <p className="text-sm text-[#6f7b62] max-md:hidden">Kode: {product.code||'-'}</p>
                    <p className="mt-3 text-xl font-bold text-[#008f67] max-md:mt-1 max-md:text-sm max-md:font-normal max-md:text-[#6f7b62]">
                      <span className="hidden max-md:inline">Sisa {product.stock} • </span>
                      Rp{Number(product.price).toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-[#8a947d] max-md:hidden">Stok: {product.stock}</p>
                  </div>
                  {cartItem ? (
                    <div className="hidden max-md:flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#008f67] text-xl font-bold text-[#008f67]">{cartItem.qty}</div>
                  ) : (
                    <div className="hidden max-md:block text-[#008f67] text-2xl">+</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* MOBILE STICKY CONTINUE */}
      {!mobileCheckoutOpen && (
        <div className="hidden max-md:block fixed bottom-0 left-0 right-0 z-40 bg-white/95 px-4 py-4 shadow-[0_-10px_30px_rgba(0,0,0,0.10)]">
          <div className="flex gap-3">
            <button onClick={goToMobileCheckout} disabled={cart.length === 0} className="flex-1 rounded-full bg-[#00a878] px-6 py-4 text-white disabled:bg-gray-300 disabled:text-gray-500">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{totalItems}</span>
                <span className="text-base font-semibold">Item</span>
                <span className="text-lg font-bold tracking-wide">LANJUT ›</span>
              </div>
            </button>
            <button onClick={clearCart} className="flex h-[58px] w-[74px] items-center justify-center rounded-3xl border border-[#008f67] bg-[#eaffef] text-2xl text-[#008f67]">♙</button>
          </div>
        </div>
      )}

      {/* DESKTOP CART */}
      <aside className="w-[420px] bg-white border-l border-[#dfe8d2] flex flex-col max-lg:w-[380px] max-md:hidden">
        <CartPanel
          cart={cart} totalItems={totalItems} subtotal={subtotal} discount={discount}
          discountValue={discountValue} total={total} queueNumber={queueNumber} orderNote={orderNote}
          customerName={customerName}
          setQueueNumber={setQueueNumber} setDiscount={setDiscount} setOrderNote={setOrderNote}
          setCustomerName={setCustomerName}
          decreaseQty={decreaseQty} addToCart={addToCart} updateItemNote={updateItemNote}
          addOnToItem={addOnToItem} removeAddOn={removeAddOn} openPayment={openPayment}
        />
      </aside>

      {/* MOBILE CHECKOUT */}
      {mobileCheckoutOpen && (
        <section className="hidden max-md:flex fixed inset-0 z-50 flex-col bg-[#eef5e8] text-[#21351f]">
          <header className="bg-white px-4 pt-6 pb-4 border-b border-[#dfe8d2]">
            <div className="flex items-center justify-between">
              <button onClick={() => setMobileCheckoutOpen(false)} className="h-11 w-11 rounded-full bg-[#2f4f32] text-white">‹</button>
              <div className="text-center"><h1 className="text-xl font-bold">Checkout</h1><p className="text-xs text-[#6f7b62]">Hitung pesanan otomatis</p></div>
              <button onClick={clearCart} className="h-11 w-11 rounded-full border border-red-200 text-red-500">×</button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 pb-36">
            <CartPanel
              cart={cart} totalItems={totalItems} subtotal={subtotal} discount={discount}
              discountValue={discountValue} total={total} queueNumber={queueNumber} orderNote={orderNote}
              customerName={customerName}
              setQueueNumber={setQueueNumber} setDiscount={setDiscount} setOrderNote={setOrderNote}
              setCustomerName={setCustomerName}
              decreaseQty={decreaseQty} addToCart={addToCart} updateItemNote={updateItemNote}
              addOnToItem={addOnToItem} removeAddOn={removeAddOn} openPayment={openPayment} mobile
            />
          </div>
        </section>
      )}

      {/* PAYMENT MODAL */}
      {paymentOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto max-md:p-5">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#2f3a25]">Pembayaran {paymentMethod}</h2>
              <button onClick={() => setPaymentOpen(false)} className="text-2xl text-[#8a947d] hover:text-black cursor-pointer">×</button>
            </div>

            <div className="mb-5 rounded-2xl bg-[#eef5e8] p-5">
              <p className="text-sm text-[#6f7b62]">Total Pembayaran</p>
              <h3 className="mt-2 text-3xl font-bold text-[#00785a]">Rp{Number(total).toLocaleString('id-ID')}</h3>
              {customerName && <p className="mt-1 text-sm text-[#6f7b62]">Pelanggan: <span className="font-semibold text-[#21351f]">{customerName}</span></p>}
            </div>

            {paymentMethod === 'CASH' && (
              <>
                <input type="number" value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="Nominal uang diterima"
                  className="mb-4 w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#2f3a25] outline-none focus:ring-2 focus:ring-[#86a96f]" />
                <div className="mb-5 flex justify-between rounded-xl border border-[#dfe8d2] p-4">
                  <span className="text-[#6f7b62]">Kembalian</span>
                  <span className="font-bold text-[#2f3a25]">Rp{Number(Math.max(change,0)).toLocaleString('id-ID')}</span>
                </div>
              </>
            )}

            {paymentMethod === 'QRIS' && (
              <div className="mb-5 text-center">
                {!lastTransaction?.qrString ? (
                  <p className="rounded-xl bg-[#eef5e8] p-4 text-[#6f7b62]">QRIS saat ini tersimpan sebagai pembayaran manual. Klik tombol bayar untuk menyimpan transaksi.</p>
                ) : (
                  <div className="rounded-2xl border border-[#dfe8d2] p-5">
                    <QRCodeSVG value={lastTransaction.qrString} size={220} />
                    <p className="mt-4 text-sm text-[#6f7b62]">Customer scan QRIS ini.</p>
                    <p className={`mt-3 rounded-full px-4 py-2 text-sm font-bold ${lastTransaction.paymentStatus==='PAID' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      Status: {lastTransaction.paymentStatus}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            {!lastTransaction && (
              <button onClick={processPayment} disabled={loadingPay}
                className="w-full rounded-xl bg-[#00785a] py-3 font-bold text-white disabled:opacity-50 cursor-pointer mb-3">
                {loadingPay ? 'Memproses...' : paymentMethod === 'QRIS' ? 'Bayar QRIS' : 'Bayar Tunai'}
              </button>
            )}

            {/* ── 3 tombol cetak ── */}
            {lastTransaction && (
              <div className="grid grid-cols-3 gap-2 mb-3">
                <button onClick={printKasir}
                  className={`rounded-xl py-3 text-sm font-bold cursor-pointer transition ${
                    printerKasir.method !== 'none' ? 'bg-[#008f67] text-white hover:bg-[#007a58]' : 'border border-[#008f67] text-[#008f67] hover:bg-[#eef5e8]'
                  }`}>
                  🖨 Kasir
                </button>
                <button onClick={printDapur}
                  className={`rounded-xl py-3 text-sm font-bold cursor-pointer transition ${
                    printerDapur.method !== 'none' ? 'bg-[#2f4f32] text-white hover:bg-[#243d27]' : 'border border-[#2f4f32] text-[#2f4f32] hover:bg-[#eef5e8]'
                  }`}>
                  🍳 Dapur
                </button>
                <button onClick={printAll}
                  className="rounded-xl py-3 text-sm font-bold cursor-pointer border border-[#dfe8d2] text-[#21351f] hover:bg-[#f4f7ef] transition">
                  ⊕ Semua
                </button>
              </div>
            )}

            {lastTransaction && lastTransaction.status !== 'CANCELLED' && (
              <button onClick={cancelTransaction} className="mt-1 w-full rounded-xl border border-red-200 py-3 font-bold text-red-600 hover:bg-red-50 cursor-pointer">
                Batalkan Transaksi
              </button>
            )}
            {lastTransaction?.status === 'CANCELLED' && (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-center font-bold text-red-600">Transaksi sudah dibatalkan</p>
            )}
            {lastTransaction?.paymentStatus === 'PAID' && (
              <button onClick={finishTransaction} className="mt-3 w-full rounded-xl bg-[#2f4f32] py-3 font-bold text-white cursor-pointer">
                Transaksi Selesai
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function CartPanel({
  cart, totalItems, subtotal, discount, discountValue, total, queueNumber, orderNote, customerName,
  setQueueNumber, setDiscount, setOrderNote, setCustomerName, decreaseQty, addToCart, updateItemNote,
  addOnToItem, removeAddOn, openPayment, mobile = false,
}: any) {
  return (
    <div className={`flex h-full flex-col ${mobile ? 'gap-4' : ''}`}>
      {!mobile && (
        <div className="h-20 border-b border-[#dfe8d2] flex items-center justify-between px-6">
          <div>
            <p className="text-sm text-[#6f7b62]">Diskon : Rp{discountValue.toLocaleString('id-ID')}</p>
            <p className="text-sm text-[#6f7b62]">Pajak : 0%</p>
          </div>
          <button className="font-bold text-[#008f67]">+ Biaya</button>
        </div>
      )}

      <div className={`${mobile ? 'space-y-4' : 'flex-1 p-6 overflow-y-auto max-lg:max-h-[520px]'}`}>
        {cart.length === 0 && <p className="text-center text-[#8a947d] mt-10">Belum ada item</p>}
        {cart.map((item: any) => (
          <div key={item.id} className="rounded-3xl border border-[#eef2e8] bg-white p-4 shadow-sm">
            <div className="flex justify-between gap-3">
              <div><p className="font-bold">{item.name}</p><p className="text-sm text-[#6f7b62]">Rp{Number(item.price).toLocaleString('id-ID')}</p></div>
              <p className="font-bold">Rp{Number(item.price*item.qty).toLocaleString('id-ID')}</p>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <button onClick={() => decreaseQty(item.id)} className="h-8 w-8 rounded-full bg-[#eef5e8] font-bold cursor-pointer">-</button>
              <span className="font-bold">{item.qty}</span>
              <button onClick={() => addToCart(item)} className="h-8 w-8 rounded-full bg-[#15b884] text-white font-bold cursor-pointer">+</button>
            </div>
            <input value={item.note||''} onChange={(e) => updateItemNote(item.id, e.target.value)} placeholder="Catatan item, contoh: less ice"
              className="mt-3 w-full rounded-xl border border-[#dfe8d2] px-3 py-2 text-sm text-[#21351f] outline-none" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => addOnToItem(item.id, { name: 'Extra Matcha', price: 5000 })} className="rounded-lg bg-[#eef5e8] px-3 py-2 text-xs font-bold text-[#2f4f32]">+ Extra Matcha</button>
              <button onClick={() => addOnToItem(item.id, { name: 'Extra Cream', price: 4000 })} className="rounded-lg bg-[#eef5e8] px-3 py-2 text-xs font-bold text-[#2f4f32]">+ Extra Cream</button>
            </div>
            {item.addOns?.length > 0 && (
              <div className="mt-3 space-y-2">
                {item.addOns.map((addOn: any, index: number) => (
                  <div key={`${addOn.name}-${index}`} className="flex items-center justify-between rounded-lg bg-[#f8fff4] px-3 py-2 text-xs text-[#2f3a25]">
                    <span>{addOn.name} + Rp{Number(addOn.price).toLocaleString('id-ID')}</span>
                    <button onClick={() => removeAddOn(item.id, index)} className="text-red-500">Hapus</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={`${mobile ? 'fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-[#dfe8d2] bg-white p-4 shadow-[0_-10px_30px_rgba(0,0,0,0.12)]' : 'border-t border-[#dfe8d2] p-6'}`}>
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nama pelanggan (opsional)"
          className="mb-2 w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#21351f] outline-none" />
        <input type="number" value={queueNumber} onChange={(e) => setQueueNumber(e.target.value)} placeholder="No antrian otomatis / manual"
          className="mb-2 w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#21351f] outline-none" />
        <input type="number" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="Diskon nominal, contoh: 5000"
          className="mb-2 w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#21351f] outline-none" />
        <textarea value={orderNote} onChange={(e) => setOrderNote(e.target.value)} placeholder="Catatan pesanan, contoh: dibawa pulang" rows={1}
          className="mb-2 w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#21351f] outline-none" />
        <div className="mb-1 flex justify-between text-sm text-[#6f7b62]"><span>Item</span><span>{totalItems}</span></div>
        <div className="mb-1 flex justify-between text-sm text-[#6f7b62]"><span>Subtotal</span><span>Rp{Number(subtotal).toLocaleString('id-ID')}</span></div>
        <div className="mb-1 flex justify-between text-sm text-red-500"><span>Diskon</span><span>- Rp{Number(discountValue).toLocaleString('id-ID')}</span></div>
        <div className="mb-3 flex justify-between text-lg font-bold text-[#21351f]"><span>Total</span><span>Rp{Number(total).toLocaleString('id-ID')}</span></div>
        <div className="grid grid-cols-2 gap-3 bg-white pt-2">
          <button disabled={cart.length===0} onClick={() => openPayment('CASH')} className="rounded-xl border border-[#008f67] py-3 font-bold text-[#008f67] disabled:opacity-50 cursor-pointer">Tunai</button>
          <button disabled={cart.length===0} onClick={() => openPayment('QRIS')} className="rounded-xl bg-[#00785a] py-3 font-bold text-white disabled:opacity-50 cursor-pointer">QRIS</button>
        </div>
      </div>
    </div>
  );
}