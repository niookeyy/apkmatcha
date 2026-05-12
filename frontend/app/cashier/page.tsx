'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import Sidebar from '../components/Sidebar';
import Toast from '../components/ui/Toast';

export default function CashierPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'QRIS'>('CASH');
  const [paid, setPaid] = useState('');
  const [loadingPay, setLoadingPay] = useState(false);
  const [lastTransaction, setLastTransaction] = useState<any>(null);

  const [toast, setToast] = useState({
    show: false,
    type: 'success' as 'success' | 'error' | 'warning',
    title: '',
    message: '',
  });

  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const change = Number(paid || 0) - total;

  const filteredProducts = products.filter((product) => {
    const keyword = search.toLowerCase();

    return (
      product.name?.toLowerCase().includes(keyword) ||
      product.code?.toLowerCase().includes(keyword)
    );
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000');

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('payment-update', async (data) => {
      if (!lastTransaction?.id) return;

      if (data.transactionId === lastTransaction.id) {
        setLastTransaction((prev: any) => ({
          ...prev,
          paymentStatus: data.status,
        }));

        if (data.status === 'PAID') {
          showToast(
            'success',
            'Pembayaran berhasil',
            'QRIS sudah dibayar customer.',
          );

          await fetchProducts();
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [lastTransaction?.id]);

  function showToast(
    type: 'success' | 'error' | 'warning',
    title: string,
    message: string,
  ) {
    setToast({
      show: true,
      type,
      title,
      message,
    });

    setTimeout(() => {
      setToast((prev) => ({
        ...prev,
        show: false,
      }));
    }, 3000);
  }

  async function fetchProducts() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`);
      const data = await res.json();

      if (Array.isArray(data)) setProducts(data);
      else if (Array.isArray(data.data)) setProducts(data.data);
      else setProducts([]);
    } catch {
      showToast('error', 'Gagal memuat produk', 'Pastikan backend menyala.');
    }
  }

  function addToCart(product: any) {
    if (product.stock <= 0) {
      showToast('warning', 'Stok habis', `${product.name} tidak tersedia.`);
      return;
    }

    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      if (existing.qty + 1 > product.stock) {
        showToast(
          'warning',
          'Stok tidak cukup',
          `Stok ${product.name} tersisa ${product.stock}.`,
        );
        return;
      }

      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, qty: item.qty + 1 }
            : item,
        ),
      );
    } else {
      setCart([...cart, { ...product, qty: 1 }]);
    }
  }

  function decreaseQty(id: string) {
    setCart(
      cart
        .map((item) =>
          item.id === id ? { ...item, qty: item.qty - 1 } : item,
        )
        .filter((item) => item.qty > 0),
    );
  }

  function clearCart() {
    setCart([]);
    setPaid('');
    setLastTransaction(null);
  }

  function openPayment(method: 'CASH' | 'QRIS') {
    if (cart.length === 0) {
      showToast('warning', 'Keranjang kosong', 'Pilih produk terlebih dahulu.');
      return;
    }

    setPaymentMethod(method);
    setPaid(method === 'QRIS' ? String(total) : '');
    setLastTransaction(null);
    setPaymentOpen(true);
  }

  async function processPayment() {
    try {
      setLoadingPay(true);

      if (paymentMethod === 'CASH' && Number(paid || 0) < total) {
        showToast('error', 'Uang kurang', 'Nominal bayar kurang dari total.');
        return;
      }

      const payload = {
        paymentMethod,
        paid: paymentMethod === 'CASH' ? Number(paid) : total,
        items: cart.map((item) => ({
          productId: item.id,
          qty: item.qty,
        })),
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Transaksi gagal');
      }

      setLastTransaction(data);

      if (paymentMethod === 'CASH') {
        showToast(
          'success',
          'Pembayaran berhasil',
          'Transaksi tunai berhasil disimpan.',
        );

        await fetchProducts();
      }

      if (paymentMethod === 'QRIS') {
        showToast(
          'success',
          'QRIS dibuat',
          'Customer tinggal scan QRIS. Status akan otomatis berubah realtime.',
        );
      }
    } catch (err: any) {
      showToast(
        'error',
        'Transaksi gagal',
        err.message || 'Terjadi kesalahan.',
      );
    } finally {
      setLoadingPay(false);
    }
  }

  async function printReceipt() {
    if (!lastTransaction?.id) {
      showToast('warning', 'Belum ada transaksi', 'Selesaikan pembayaran dulu.');
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/transactions/${lastTransaction.id}/receipt-text`,
    );

    const text = await res.text();

    const printWindow = window.open('', '_blank', 'width=400,height=600');

    if (!printWindow) {
      showToast('error', 'Gagal print', 'Popup browser diblokir.');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Struk</title>
          <style>
            body {
              font-family: monospace;
              white-space: pre-wrap;
              padding: 16px;
              font-size: 13px;
            }
          </style>
        </head>
        <body>${text}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <main className="min-h-screen bg-[#eef5e8] flex text-[#21351f]">
      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() =>
          setToast((prev) => ({
            ...prev,
            show: false,
          }))
        }
      />

      <Sidebar />

      <section className="flex-1 flex flex-col">
        <header className="h-20 bg-white border-b border-[#dfe8d2] flex items-center justify-between px-6">
          <div>
            <h1 className="text-2xl font-bold">Kasir</h1>
            <p className="text-sm text-[#6f7b62]">
              Pilih produk untuk transaksi
            </p>
          </div>

          <button
            onClick={clearCart}
            className="rounded-full border border-red-200 px-8 py-2 text-red-600 hover:bg-red-50 cursor-pointer"
          >
            Batalkan
          </button>
        </header>

        <div className="p-6">
          <div className="flex gap-3 mb-5">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="w-full rounded-xl border border-[#8ac79f] bg-white px-4 py-3 text-[#21351f] outline-none"
            />

            <button
              onClick={fetchProducts}
              className="rounded-xl border border-[#008f67] px-6 font-semibold text-[#008f67] cursor-pointer"
            >
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className="rounded-2xl bg-white p-5 text-left border border-[#dfe8d2] shadow-sm hover:shadow-md hover:bg-[#f8fff4] cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="mb-4 h-40 overflow-hidden rounded-2xl bg-white border border-[#eef2e8] flex items-center justify-center">
                  <img
                    src={
                      product.imageUrl
                        ? `${process.env.NEXT_PUBLIC_API_URL}${product.imageUrl}`
                        : '/logo.svg'
                    }
                    alt={product.name}
                    className={`max-h-[90%] max-w-[90%] ${
                      product.imageUrl
                        ? 'object-contain'
                        : 'object-contain opacity-70'
                    }`}
                    draggable={false}
                  />
                </div>

                <p className="font-bold">{product.name}</p>

                <p className="text-sm text-[#6f7b62]">
                  Kode: {product.code || '-'}
                </p>

                <p className="mt-3 text-xl font-bold text-[#008f67]">
                  Rp{Number(product.price).toLocaleString('id-ID')}
                </p>

                <p className="text-xs text-[#8a947d]">
                  Stok: {product.stock}
                </p>
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside className="w-[420px] bg-white border-l border-[#dfe8d2] flex flex-col">
        <div className="h-20 border-b border-[#dfe8d2] flex items-center justify-between px-6">
          <div>
            <p className="text-sm text-[#6f7b62]">Diskon : 0%</p>
            <p className="text-sm text-[#6f7b62]">Pajak : 0%</p>
          </div>

          <button className="font-bold text-[#008f67]">+ Biaya</button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {cart.length === 0 && (
            <p className="text-center text-[#8a947d] mt-20">
              Belum ada item
            </p>
          )}

          {cart.map((item) => (
            <div
              key={item.id}
              className="mb-4 rounded-2xl border border-[#eef2e8] p-4"
            >
              <div className="flex justify-between">
                <div>
                  <p className="font-bold">{item.name}</p>
                  <p className="text-sm text-[#6f7b62]">
                    Rp{Number(item.price).toLocaleString('id-ID')}
                  </p>
                </div>

                <p className="font-bold">
                  Rp{Number(item.price * item.qty).toLocaleString('id-ID')}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={() => decreaseQty(item.id)}
                  className="h-8 w-8 rounded-full bg-[#eef5e8] font-bold cursor-pointer"
                >
                  -
                </button>

                <span className="font-bold">{item.qty}</span>

                <button
                  onClick={() => addToCart(item)}
                  className="h-8 w-8 rounded-full bg-[#15b884] text-white font-bold cursor-pointer"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-[#dfe8d2] p-6">
          <div className="mb-4 flex justify-between text-sm text-[#6f7b62]">
            <span>Item</span>
            <span>{cart.reduce((sum, item) => sum + item.qty, 0)}</span>
          </div>

          <div className="mb-4 flex justify-between text-lg font-bold text-[#21351f]">
            <span>Total</span>
            <span>Rp{Number(total).toLocaleString('id-ID')}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={cart.length === 0}
              onClick={() => openPayment('CASH')}
              className="rounded-xl border border-[#008f67] py-3 font-bold text-[#008f67] disabled:opacity-50 cursor-pointer"
            >
              Tunai
            </button>

            <button
              disabled={cart.length === 0}
              onClick={() => openPayment('QRIS')}
              className="rounded-xl bg-[#00785a] py-3 font-bold text-white disabled:opacity-50 cursor-pointer"
            >
              QRIS
            </button>
          </div>
        </div>
      </aside>

      {paymentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#2f3a25]">
                Pembayaran {paymentMethod}
              </h2>

              <button
                onClick={() => setPaymentOpen(false)}
                className="text-2xl text-[#8a947d] hover:text-black cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="mb-5 rounded-2xl bg-[#eef5e8] p-5">
              <p className="text-sm text-[#6f7b62]">Total Pembayaran</p>
              <h3 className="mt-2 text-3xl font-bold text-[#00785a]">
                Rp{Number(total).toLocaleString('id-ID')}
              </h3>
            </div>

            {paymentMethod === 'CASH' && (
              <>
                <input
                  type="number"
                  value={paid}
                  onChange={(e) => setPaid(e.target.value)}
                  placeholder="Nominal uang diterima"
                  className="mb-4 w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#2f3a25] outline-none focus:ring-2 focus:ring-[#86a96f]"
                />

                <div className="mb-5 flex justify-between rounded-xl border border-[#dfe8d2] p-4">
                  <span className="text-[#6f7b62]">Kembalian</span>
                  <span className="font-bold text-[#2f3a25]">
                    Rp{Number(Math.max(change, 0)).toLocaleString('id-ID')}
                  </span>
                </div>
              </>
            )}

            {paymentMethod === 'QRIS' && (
              <div className="mb-5 text-center">
                {!lastTransaction?.qrString ? (
                  <p className="rounded-xl bg-[#eef5e8] p-4 text-[#6f7b62]">
                    Klik “Buat QRIS” untuk membuat QR dinamis sesuai total belanja.
                  </p>
                ) : (
                  <div className="rounded-2xl border border-[#dfe8d2] p-5">
                    <QRCodeSVG value={lastTransaction.qrString} size={220} />

                    <p className="mt-4 text-sm text-[#6f7b62]">
                      Customer scan QRIS ini. Status akan otomatis berubah setelah pembayaran sukses.
                    </p>

                    <p
                      className={`mt-3 rounded-full px-4 py-2 text-sm font-bold ${
                        lastTransaction.paymentStatus === 'PAID'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      Status: {lastTransaction.paymentStatus}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              {!lastTransaction && (
                <button
                  onClick={processPayment}
                  disabled={loadingPay}
                  className="flex-1 rounded-xl bg-[#00785a] py-3 font-bold text-white disabled:opacity-50 cursor-pointer"
                >
                  {loadingPay
                    ? 'Memproses...'
                    : paymentMethod === 'QRIS'
                      ? 'Buat QRIS'
                      : 'Bayar Tunai'}
                </button>
              )}

              {lastTransaction && (
                <button
                  onClick={printReceipt}
                  className="flex-1 rounded-xl border border-[#008f67] py-3 font-bold text-[#008f67] cursor-pointer"
                >
                  Cetak Struk
                </button>
              )}
            </div>

            {lastTransaction?.paymentStatus === 'PAID' && (
              <button
                onClick={() => {
                  clearCart();
                  setPaymentOpen(false);
                }}
                className="mt-3 w-full rounded-xl bg-[#2f4f32] py-3 font-bold text-white cursor-pointer"
              >
                Transaksi Selesai
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}