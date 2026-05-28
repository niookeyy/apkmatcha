'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { io } from 'socket.io-client';
import Swal from 'sweetalert2';
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

  const [discount, setDiscount] = useState('');
  const [queueNumber, setQueueNumber] = useState('');
  const [orderNote, setOrderNote] = useState('');

  const [toast, setToast] = useState({
    show: false,
    type: 'success' as 'success' | 'error' | 'warning',
    title: '',
    message: '',
  });

  const subtotal = cart.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
    0,
  );

  const discountValue = Number(discount || 0);
  const total = Math.max(subtotal - discountValue, 0);
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
          await Swal.fire({
            icon: 'success',
            title: 'Pembayaran berhasil',
            text: 'QRIS sudah dibayar customer.',
            confirmButtonText: 'Oke',
            confirmButtonColor: '#2f4f32',
          });

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

  async function showSwal(
    icon: 'success' | 'error' | 'warning' | 'info',
    title: string,
    text: string,
  ) {
    await Swal.fire({
      icon,
      title,
      text,
      confirmButtonText: 'Oke',
      confirmButtonColor: '#2f4f32',
    });
  }

  async function fetchProducts() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`);
      const data = await res.json();

      if (Array.isArray(data)) setProducts(data);
      else if (Array.isArray(data.data)) setProducts(data.data);
      else setProducts([]);
    } catch {
      await showSwal(
        'error',
        'Gagal memuat produk',
        'Pastikan backend menyala.',
      );
    }
  }

  async function addToCart(product: any) {
    if (product.stock <= 0) {
      await showSwal(
        'warning',
        'Stok habis',
        `${product.name} tidak tersedia.`,
      );
      return;
    }

    const existing = cart.find((item) => item.id === product.id);

    if (existing) {
      if (existing.qty + 1 > product.stock) {
        await showSwal(
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
      setCart([
        ...cart,
        {
          ...product,
          qty: 1,
          basePrice: Number(product.price || 0),
          addOns: [],
          note: '',
        },
      ]);
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

  function updateItemNote(id: string, note: string) {
    setCart(
      cart.map((item) =>
        item.id === id ? { ...item, note } : item,
      ),
    );
  }

  function addOnToItem(id: string, addOn: any) {
    setCart(
      cart.map((item) => {
        if (item.id !== id) return item;

        const currentAddOns = item.addOns || [];
        const newAddOns = [...currentAddOns, addOn];

        const addOnTotal = newAddOns.reduce(
          (sum: number, current: any) => sum + Number(current.price || 0),
          0,
        );

        const basePrice = Number(item.basePrice || item.price || 0);

        return {
          ...item,
          addOns: newAddOns,
          price: basePrice + addOnTotal,
          basePrice,
        };
      }),
    );
  }

  function removeAddOn(id: string, index: number) {
    setCart(
      cart.map((item) => {
        if (item.id !== id) return item;

        const newAddOns = (item.addOns || []).filter(
          (_: any, i: number) => i !== index,
        );

        const addOnTotal = newAddOns.reduce(
          (sum: number, current: any) => sum + Number(current.price || 0),
          0,
        );

        const basePrice = Number(item.basePrice || item.price || 0);

        return {
          ...item,
          addOns: newAddOns,
          price: basePrice + addOnTotal,
          basePrice,
        };
      }),
    );
  }

  async function clearCart() {
    if (cart.length === 0 && !lastTransaction) {
      await showSwal(
        'info',
        'Keranjang kosong',
        'Belum ada item yang perlu dibatalkan.',
      );
      return;
    }

    const result = await Swal.fire({
      icon: 'warning',
      title: 'Kosongkan keranjang?',
      text: 'Item, diskon, catatan, dan transaksi terakhir akan dibersihkan.',
      showCancelButton: true,
      confirmButtonText: 'Ya, kosongkan',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#2f4f32',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    setCart([]);
    setPaid('');
    setDiscount('');
    setQueueNumber('');
    setOrderNote('');
    setLastTransaction(null);

    await showSwal(
      'success',
      'Keranjang dibersihkan',
      'Keranjang berhasil dikosongkan.',
    );
  }

  async function openPayment(method: 'CASH' | 'QRIS') {
    if (cart.length === 0) {
      await showSwal(
        'warning',
        'Keranjang kosong',
        'Pilih produk terlebih dahulu.',
      );
      return;
    }

    if (discountValue > subtotal) {
      await showSwal(
        'warning',
        'Diskon tidak valid',
        'Diskon tidak boleh lebih besar dari subtotal.',
      );
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
        await showSwal(
          'error',
          'Uang kurang',
          'Nominal bayar kurang dari total pembayaran.',
        );
        return;
      }

      const payload = {
        paymentMethod,
        paid: paymentMethod === 'CASH' ? Number(paid) : total,
        discount: discountValue,
        queueNumber: queueNumber ? Number(queueNumber) : undefined,
        note: orderNote,
        items: cart.map((item) => ({
          productId: item.id,
          qty: item.qty,
          note: item.note || '',
          addOns: item.addOns || [],
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

      await Swal.fire({
        icon: 'success',
        title: paymentMethod === 'CASH' ? 'Pembayaran berhasil' : 'QRIS berhasil',
        text:
          paymentMethod === 'CASH'
            ? 'Transaksi tunai berhasil disimpan.'
            : 'Transaksi QRIS berhasil disimpan.',
        confirmButtonText: 'Oke',
        confirmButtonColor: '#2f4f32',
      });

      await fetchProducts();
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Transaksi gagal',
        text: err.message || 'Terjadi kesalahan.',
        confirmButtonText: 'Oke',
        confirmButtonColor: '#2f4f32',
      });
    } finally {
      setLoadingPay(false);
    }
  }

  async function cancelTransaction() {
    if (!lastTransaction?.id) {
      await Swal.fire({
        icon: 'warning',
        title: 'Belum ada transaksi',
        text: 'Selesaikan pembayaran dulu sebelum membatalkan transaksi.',
        confirmButtonText: 'Oke',
        confirmButtonColor: '#2f4f32',
      });

      return;
    }

    if (lastTransaction.status === 'CANCELLED') {
      await Swal.fire({
        icon: 'info',
        title: 'Transaksi sudah dibatalkan',
        text: 'Transaksi ini sebelumnya sudah dibatalkan.',
        confirmButtonText: 'Oke',
        confirmButtonColor: '#2f4f32',
      });

      return;
    }

    const result = await Swal.fire({
      icon: 'warning',
      title: 'Batalkan transaksi?',
      text: 'Stok produk dan bahan baku akan dikembalikan.',
      input: 'textarea',
      inputLabel: 'Alasan pembatalan transaksi',
      inputPlaceholder: 'Contoh: customer batal, salah input pesanan...',
      inputAttributes: {
        'aria-label': 'Alasan pembatalan transaksi',
      },
      showCancelButton: true,
      confirmButtonText: 'Ya, batalkan',
      cancelButtonText: 'Tidak',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#2f4f32',
      reverseButtons: true,
      inputValidator: (value) => {
        if (!value || !value.trim()) {
          return 'Alasan pembatalan wajib diisi.';
        }

        return null;
      },
    });

    if (!result.isConfirmed) {
      return;
    }

    const reason = result.value || 'Dibatalkan kasir';

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/transactions/${lastTransaction.id}/cancel`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ reason }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Transaksi gagal dibatalkan');
      }

      setLastTransaction(data);

      await Swal.fire({
        icon: 'success',
        title: 'Transaksi dibatalkan',
        text: 'Stok dan cashflow sudah dikoreksi.',
        confirmButtonText: 'Oke',
        confirmButtonColor: '#2f4f32',
      });

      await fetchProducts();
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal batal transaksi',
        text: err.message || 'Terjadi kesalahan.',
        confirmButtonText: 'Oke',
        confirmButtonColor: '#2f4f32',
      });
    }
  }

  async function printReceipt() {
    if (!lastTransaction?.id) {
      await Swal.fire({
        icon: 'warning',
        title: 'Belum ada transaksi',
        text: 'Selesaikan pembayaran dulu sebelum mencetak struk.',
        confirmButtonText: 'Oke',
        confirmButtonColor: '#2f4f32',
      });

      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/transactions/${lastTransaction.id}/receipt-text`,
      );

      const text = await res.text();

      if (!res.ok) {
        throw new Error(text || 'Gagal mengambil struk.');
      }

      const printWindow = window.open('', '_blank', 'width=400,height=600');

      if (!printWindow) {
        await Swal.fire({
          icon: 'error',
          title: 'Gagal print',
          text: 'Popup browser diblokir. Izinkan popup untuk mencetak struk.',
          confirmButtonText: 'Oke',
          confirmButtonColor: '#2f4f32',
        });

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
    } catch (err: any) {
      await Swal.fire({
        icon: 'error',
        title: 'Gagal cetak struk',
        text: err.message || 'Terjadi kesalahan.',
        confirmButtonText: 'Oke',
        confirmButtonColor: '#2f4f32',
      });
    }
  }

  async function finishTransaction() {
    if (!lastTransaction) {
      await showSwal(
        'warning',
        'Belum ada transaksi',
        'Tidak ada transaksi yang bisa diselesaikan.',
      );
      return;
    }

    setCart([]);
    setPaid('');
    setDiscount('');
    setQueueNumber('');
    setOrderNote('');
    setLastTransaction(null);
    setPaymentOpen(false);

    await Swal.fire({
      icon: 'success',
      title: 'Transaksi selesai',
      text: 'Kasir siap menerima transaksi berikutnya.',
      confirmButtonText: 'Oke',
      confirmButtonColor: '#2f4f32',
    });
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

      <section className="flex-1 flex flex-col min-w-0">
        <header className="h-20 bg-white border-b border-[#dfe8d2] flex items-center justify-between px-6 max-md:h-auto max-md:flex-col max-md:items-start max-md:gap-3 max-md:pt-20 max-md:pb-5">
          <div>
            <h1 className="text-2xl font-bold">Kasir</h1>
            <p className="text-sm text-[#6f7b62]">
              Pilih produk untuk transaksi
            </p>
          </div>

          <button
            onClick={clearCart}
            className="rounded-full border border-red-200 px-8 py-2 text-red-600 hover:bg-red-50 cursor-pointer max-md:w-full"
          >
            Batalkan
          </button>
        </header>

        <div className="p-6 max-md:p-4 max-md:pb-[62vh]">
          <div className="flex gap-3 mb-5 max-sm:flex-col">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari produk..."
              className="w-full rounded-xl border border-[#8ac79f] bg-white px-4 py-3 text-[#21351f] outline-none"
            />

            <button
              onClick={fetchProducts}
              className="rounded-xl border border-[#008f67] px-6 py-3 font-semibold text-[#008f67] cursor-pointer"
            >
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 max-md:block max-md:space-y-0 max-md:rounded-3xl max-md:bg-white max-md:border max-md:border-[#dfe8d2] max-md:overflow-hidden">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className="rounded-2xl bg-white p-5 text-left border border-[#dfe8d2] shadow-sm hover:shadow-md hover:bg-[#f8fff4] cursor-pointer transition disabled:opacity-50 disabled:cursor-not-allowed max-md:flex max-md:w-full max-md:items-center max-md:gap-4 max-md:rounded-none max-md:border-0 max-md:border-b max-md:border-[#eef2e8] max-md:bg-white max-md:p-4 max-md:shadow-none max-md:hover:bg-[#f8fff4]"
              >
                <div className="mb-4 h-40 overflow-hidden rounded-2xl bg-white border border-[#eef2e8] flex items-center justify-center max-md:mb-0 max-md:h-16 max-md:w-16 max-md:shrink-0 max-md:rounded-2xl max-md:border max-md:border-[#eef2e8]">
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

                <div className="min-w-0 flex-1">
                  <p className="font-bold text-[#21351f] max-md:text-base max-md:leading-snug">
                    {product.name}
                  </p>

                  <p className="text-sm text-[#6f7b62] max-md:text-xs">
                    Kode: {product.code || '-'}
                  </p>

                  <p className="mt-3 text-xl font-bold text-[#008f67] max-md:mt-1 max-md:text-sm max-md:font-normal max-md:text-[#6f7b62]">
                    <span className="hidden max-md:inline">
                      Sisa {product.stock} •{' '}
                    </span>
                    Rp{Number(product.price).toLocaleString('id-ID')}
                  </p>

                  <p className="text-xs text-[#8a947d] max-md:hidden">
                    Stok: {product.stock}
                  </p>
                </div>

                <div className="hidden max-md:block text-[#008f67] text-2xl">
                  +
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <aside className="w-[420px] bg-white border-l border-[#dfe8d2] flex flex-col max-lg:w-[380px] max-md:fixed max-md:left-0 max-md:right-0 max-md:bottom-0 max-md:z-40 max-md:w-full max-md:h-[58vh] max-md:rounded-t-3xl max-md:shadow-[0_-10px_30px_rgba(0,0,0,0.12)] max-md:border-l-0 max-md:overflow-hidden">
        <div className="h-20 border-b border-[#dfe8d2] flex items-center justify-between px-6 max-md:h-auto max-md:px-5 max-md:py-4">
          <div>
            <p className="text-sm text-[#6f7b62]">
              Diskon : Rp{discountValue.toLocaleString('id-ID')}
            </p>
            <p className="text-sm text-[#6f7b62]">Pajak : 0%</p>
          </div>

          <button className="font-bold text-[#008f67]">+ Biaya</button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto max-lg:max-h-[520px] max-md:max-h-[90px] max-md:p-4">
          {cart.length === 0 && (
            <p className="text-center text-[#8a947d] mt-10 max-md:mt-4">
              Belum ada item
            </p>
          )}

          {cart.map((item) => (
            <div
              key={item.id}
              className="mb-4 rounded-2xl border border-[#eef2e8] p-4"
            >
              <div className="flex justify-between gap-3">
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

              <input
                value={item.note || ''}
                onChange={(e) => updateItemNote(item.id, e.target.value)}
                placeholder="Catatan item, contoh: less ice"
                className="mt-3 w-full rounded-xl border border-[#dfe8d2] px-3 py-2 text-sm text-[#21351f] outline-none"
              />

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() =>
                    addOnToItem(item.id, {
                      name: 'Extra Matcha',
                      price: 5000,
                    })
                  }
                  className="rounded-lg bg-[#eef5e8] px-3 py-2 text-xs font-bold text-[#2f4f32]"
                >
                  + Extra Matcha
                </button>

                <button
                  onClick={() =>
                    addOnToItem(item.id, {
                      name: 'Extra Cream',
                      price: 4000,
                    })
                  }
                  className="rounded-lg bg-[#eef5e8] px-3 py-2 text-xs font-bold text-[#2f4f32]"
                >
                  + Extra Cream
                </button>
              </div>

              {item.addOns?.length > 0 && (
                <div className="mt-3 space-y-2">
                  {item.addOns.map((addOn: any, index: number) => (
                    <div
                      key={`${addOn.name}-${index}`}
                      className="flex items-center justify-between rounded-lg bg-[#f8fff4] px-3 py-2 text-xs text-[#2f3a25]"
                    >
                      <span>
                        {addOn.name} + Rp
                        {Number(addOn.price).toLocaleString('id-ID')}
                      </span>

                      <button
                        onClick={() => removeAddOn(item.id, index)}
                        className="text-red-500"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-[#dfe8d2] p-6 max-md:p-4 max-md:overflow-y-auto max-md:max-h-[310px]">
          <input
            type="number"
            value={queueNumber}
            onChange={(e) => setQueueNumber(e.target.value)}
            placeholder="No antrian otomatis / manual"
            className="mb-2 w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#21351f] outline-none max-md:py-2.5"
          />

          <input
            type="number"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="Diskon nominal, contoh: 5000"
            className="mb-2 w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#21351f] outline-none max-md:py-2.5"
          />

          <textarea
            value={orderNote}
            onChange={(e) => setOrderNote(e.target.value)}
            placeholder="Catatan pesanan, contoh: dibawa pulang"
            rows={1}
            className="mb-2 w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#21351f] outline-none max-md:py-2.5"
          />

          <div className="mb-1 flex justify-between text-sm text-[#6f7b62]">
            <span>Item</span>
            <span>{cart.reduce((sum, item) => sum + item.qty, 0)}</span>
          </div>

          <div className="mb-1 flex justify-between text-sm text-[#6f7b62]">
            <span>Subtotal</span>
            <span>Rp{Number(subtotal).toLocaleString('id-ID')}</span>
          </div>

          <div className="mb-1 flex justify-between text-sm text-red-500">
            <span>Diskon</span>
            <span>- Rp{Number(discountValue).toLocaleString('id-ID')}</span>
          </div>

          <div className="mb-3 flex justify-between text-lg font-bold text-[#21351f]">
            <span>Total</span>
            <span>Rp{Number(total).toLocaleString('id-ID')}</span>
          </div>

          <div className="sticky bottom-0 grid grid-cols-2 gap-3 bg-white pt-2">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto max-md:p-5">
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
                    QRIS saat ini tersimpan sebagai pembayaran manual. Klik tombol bayar untuk menyimpan transaksi.
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

            <div className="flex gap-3 max-sm:flex-col">
              {!lastTransaction && (
                <button
                  onClick={processPayment}
                  disabled={loadingPay}
                  className="flex-1 rounded-xl bg-[#00785a] py-3 font-bold text-white disabled:opacity-50 cursor-pointer"
                >
                  {loadingPay
                    ? 'Memproses...'
                    : paymentMethod === 'QRIS'
                      ? 'Bayar QRIS'
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

            {lastTransaction && lastTransaction.status !== 'CANCELLED' && (
              <button
                onClick={cancelTransaction}
                className="mt-3 w-full rounded-xl border border-red-200 py-3 font-bold text-red-600 hover:bg-red-50 cursor-pointer"
              >
                Batalkan Transaksi
              </button>
            )}

            {lastTransaction?.status === 'CANCELLED' && (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-center font-bold text-red-600">
                Transaksi sudah dibatalkan
              </p>
            )}

            {lastTransaction?.paymentStatus === 'PAID' && (
              <button
                onClick={finishTransaction}
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