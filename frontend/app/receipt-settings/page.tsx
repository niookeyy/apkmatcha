'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Toast from '../components/ui/Toast';

export default function ReceiptSettingsPage() {
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
    const saved = localStorage.getItem('receiptSettings');

    if (saved) {
      setForm(JSON.parse(saved));
    }
  }, []);

  function showToast(
    type: 'success' | 'error' | 'warning',
    title: string,
    message: string,
  ) {
    setToast({ show: true, type, title, message });

    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }));
    }, 3000);
  }

  function saveSettings() {
    localStorage.setItem('receiptSettings', JSON.stringify(form));

    showToast(
      'success',
      'Setting struk disimpan',
      'Format struk berhasil diperbarui.',
    );
  }

  function resetSettings() {
    const defaultData = {
      storeName: 'Matchaboy',
      address: '',
      phone: '',
      cashierName: '',
      footer: 'Terima kasih sudah membeli 🍵',
      printerWidth: '32',
      showLogo: true,
      showAddress: true,
      showPhone: true,
    };

    setForm(defaultData);
    localStorage.setItem('receiptSettings', JSON.stringify(defaultData));

    showToast('success', 'Setting direset', 'Format struk kembali default.');
  }

  return (
    <main className="min-h-screen bg-[#f4f7ef] flex">
      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />

      <Sidebar />

      <section className="flex-1 p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#2f3a25]">Edit Struk</h1>
            <p className="mt-1 text-[#6f7b62]">
              Atur tampilan struk kasir untuk dicetak ke printer thermal.
            </p>
          </div>

          <button
            onClick={resetSettings}
            className="rounded-xl border border-red-200 bg-white px-5 py-3 font-semibold text-red-600 hover:bg-red-50 cursor-pointer"
          >
            Reset
          </button>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2]">
            <h2 className="mb-5 text-xl font-bold text-[#2f3a25]">
              Pengaturan Struk
            </h2>

            <div className="space-y-4">
              <Input
                label="Nama Toko"
                value={form.storeName}
                onChange={(value) => setForm({ ...form, storeName: value })}
                placeholder="Matchaboy"
              />

              <Input
                label="Alamat Outlet"
                value={form.address}
                onChange={(value) => setForm({ ...form, address: value })}
                placeholder="Jl. Contoh No. 10, Sidoarjo"
                disabled={!form.showAddress}
              />

              <Input
                label="Nomor Telepon"
                value={form.phone}
                onChange={(value) => setForm({ ...form, phone: value })}
                placeholder="0812xxxxxxx"
                disabled={!form.showPhone}
              />

              <Input
                label="Nama Kasir Default"
                value={form.cashierName}
                onChange={(value) => setForm({ ...form, cashierName: value })}
                placeholder="Admin"
              />

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#3f4b35]">
                  Footer Struk
                </label>

                <textarea
                  rows={3}
                  value={form.footer}
                  onChange={(e) =>
                    setForm({ ...form, footer: e.target.value })
                  }
                  placeholder="Terima kasih sudah membeli"
                  className="w-full rounded-2xl border border-[#dfe8d2] bg-[#fdfefd] px-5 py-4 text-[#2f3a25] outline-none transition focus:border-[#86a96f] focus:ring-4 focus:ring-[#dfe8d2]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#3f4b35]">
                  Lebar Struk
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, printerWidth: '32' })}
                    className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
                      form.printerWidth === '32'
                        ? 'border-[#6f8f5f] bg-[#eef5e8] shadow'
                        : 'border-[#dfe8d2] bg-white hover:bg-[#f8fff4]'
                    }`}
                  >
                    <p className="font-bold text-[#2f3a25]">58mm</p>
                    <p className="mt-1 text-xs text-[#6f7b62]">
                      32 karakter
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setForm({ ...form, printerWidth: '42' })}
                    className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
                      form.printerWidth === '42'
                        ? 'border-[#6f8f5f] bg-[#eef5e8] shadow'
                        : 'border-[#dfe8d2] bg-white hover:bg-[#f8fff4]'
                    }`}
                  >
                    <p className="font-bold text-[#2f3a25]">80mm</p>
                    <p className="mt-1 text-xs text-[#6f7b62]">
                      42 karakter
                    </p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ToggleCard
                  label="Tampilkan Logo"
                  active={form.showLogo}
                  onClick={() => setForm({ ...form, showLogo: !form.showLogo })}
                />

                <ToggleCard
                  label="Tampilkan Alamat"
                  active={form.showAddress}
                  onClick={() =>
                    setForm({ ...form, showAddress: !form.showAddress })
                  }
                />

                <ToggleCard
                  label="Tampilkan Telepon"
                  active={form.showPhone}
                  onClick={() =>
                    setForm({ ...form, showPhone: !form.showPhone })
                  }
                />
              </div>

              <button
                onClick={saveSettings}
                className="w-full rounded-2xl bg-[#6f8f5f] py-4 font-bold text-white hover:bg-[#5f7f4f] cursor-pointer"
              >
                Simpan Setting Struk
              </button>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2]">
            <h2 className="mb-5 text-xl font-bold text-[#2f3a25]">
              Preview Struk
            </h2>

            <div className="rounded-2xl bg-[#f8faf5] p-4 sm:p-6 border border-[#dfe8d2] overflow-x-auto">
              <div
                className={`mx-auto rounded-xl bg-white p-5 font-mono text-sm leading-relaxed text-[#2f3a25] shadow ${
                  form.printerWidth === '32' ? 'max-w-[280px]' : 'max-w-[360px]'
                }`}
              >
                {form.showLogo && (
                  <div className="mb-3 flex justify-center">
                    <img
                      src="/logo.svg"
                      alt="Logo"
                      className="h-14 w-14 object-contain"
                      draggable={false}
                    />
                  </div>
                )}

                <pre className="whitespace-pre-wrap">
                  {buildReceiptPreview(form)}
                </pre>
              </div>
            </div>

            <p className="mt-4 text-sm text-[#8a947d]">
              Preview ini akan berubah otomatis sesuai toggle dan input di kiri.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-[#3f4b35]">
        {label}
      </label>

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={disabled ? 'Dinonaktifkan' : placeholder}
        disabled={disabled}
        className={`w-full rounded-2xl border px-5 py-4 text-[#2f3a25] outline-none transition ${
          disabled
            ? 'cursor-not-allowed border-[#dfe8d2] bg-gray-100 text-gray-400'
            : 'border-[#dfe8d2] bg-[#fdfefd] focus:border-[#86a96f] focus:ring-4 focus:ring-[#dfe8d2]'
        }`}
      />
    </div>
  );
}

function ToggleCard({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
        active
          ? 'border-[#6f8f5f] bg-[#eef5e8] shadow'
          : 'border-gray-200 bg-gray-50 hover:bg-white'
      }`}
    >
      <p className={active ? 'font-bold text-[#2f3a25]' : 'font-bold text-gray-400'}>
        {label}
      </p>

      <p className={active ? 'mt-1 text-xs text-[#6f7b62]' : 'mt-1 text-xs text-gray-400'}>
        {active ? 'Aktif' : 'Nonaktif'}
      </p>
    </button>
  );
}

function buildReceiptPreview(form: any) {
  const lineWidth = Number(form.printerWidth || 32);

  const center = (text: string) => {
    const cleanText = text || '';
    const space = Math.max(0, Math.floor((lineWidth - cleanText.length) / 2));
    return ' '.repeat(space) + cleanText;
  };

  const formatLine = (left: string, right: string) => {
    const space = lineWidth - left.length - right.length;
    return left + ' '.repeat(Math.max(1, space)) + right;
  };

  const lines = [center(form.storeName.toUpperCase() || 'MATCHABOY')];

  if (form.showAddress && form.address) {
    lines.push(center(form.address));
  }

  if (form.showPhone && form.phone) {
    lines.push(center(form.phone));
  }

  lines.push('-'.repeat(lineWidth));
  lines.push('TRX: 12345678');
  lines.push('11/05/2026 18.30');

  if (form.cashierName) {
    lines.push(`Kasir: ${form.cashierName}`);
  }

  lines.push('-'.repeat(lineWidth));
  lines.push('Matcha Latte');
  lines.push(formatLine('1 x Rp20.000', 'Rp20.000'));
  lines.push('Matcha Cream');
  lines.push(formatLine('2 x Rp18.000', 'Rp36.000'));
  lines.push('-'.repeat(lineWidth));
  lines.push(formatLine('TOTAL', 'Rp56.000'));
  lines.push(formatLine('BAYAR', 'Rp60.000'));
  lines.push(formatLine('KEMBALI', 'Rp4.000'));
  lines.push('CASH - PAID');
  lines.push('-'.repeat(lineWidth));
  lines.push(center(form.footer || 'Terima kasih'));

  return lines.join('\n');
}