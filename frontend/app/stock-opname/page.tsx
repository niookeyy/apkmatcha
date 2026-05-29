'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Toast from '../components/ui/Toast';

export default function StockOpnamePage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [opnames, setOpnames] = useState<any[]>([]);
  const [rawMaterialId, setRawMaterialId] = useState('');
  const [realStock, setRealStock] = useState('');
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');

  const [materialDropdownOpen, setMaterialDropdownOpen] = useState(false);
  const [materialSearch, setMaterialSearch] = useState('');

  const [toast, setToast] = useState({
    show: false,
    type: 'success' as 'success' | 'error' | 'warning',
    title: '',
    message: '',
  });

  const selectedMaterial = materials.find((item) => item.id === rawMaterialId);
  const systemStock = Number(selectedMaterial?.stock || 0);
  const difference = Number(realStock || 0) - systemStock;

  const filteredMaterialsDropdown = materials.filter((item) =>
    item.name?.toLowerCase().includes(materialSearch.toLowerCase()),
  );

  const filteredOpnames = opnames.filter((item) =>
    item.rawMaterial?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  useEffect(() => {
    fetchMaterials();
    fetchOpnames();
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

  async function fetchMaterials() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/raw-materials`);
      const data = await res.json();

      if (Array.isArray(data)) setMaterials(data);
      else if (Array.isArray(data.data)) setMaterials(data.data);
      else setMaterials([]);
    } catch {
      showToast('error', 'Gagal memuat bahan baku', 'Pastikan backend menyala.');
    }
  }

  async function fetchOpnames() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stock-opname`);
      const data = await res.json();

      if (Array.isArray(data)) setOpnames(data);
      else if (Array.isArray(data.data)) setOpnames(data.data);
      else setOpnames([]);
    } catch {
      showToast('error', 'Gagal memuat riwayat opname', 'Pastikan backend menyala.');
    }
  }

  async function saveOpname() {
    if (!rawMaterialId || realStock === '') {
      showToast(
        'warning',
        'Data belum lengkap',
        'Pilih bahan baku dan isi stok real.',
      );
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/stock-opname`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawMaterialId,
          realStock: Number(realStock),
          note,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || 'Stok opname gagal disimpan.');
      }

      showToast(
        'success',
        'Stock opname berhasil',
        'Stok sistem sudah disesuaikan dengan stok real.',
      );

      setRawMaterialId('');
      setRealStock('');
      setNote('');
      setMaterialSearch('');
      setMaterialDropdownOpen(false);

      fetchMaterials();
      fetchOpnames();
    } catch (err: any) {
      showToast(
        'error',
        'Gagal opname',
        err.message || 'Stok opname gagal disimpan.',
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7ef] flex overflow-x-hidden">
      <Toast
        show={toast.show}
        type={toast.type}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, show: false }))}
      />

      <Sidebar />

      <section className="flex-1 min-w-0 p-8 max-md:w-full max-md:p-4 max-md:pt-20 max-md:overflow-x-hidden">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2f3a25] max-md:text-2xl">
            Stock Opname
          </h1>

          <p className="mt-1 text-[#6f7b62] max-md:text-sm">
            Sesuaikan stok bahan baku berdasarkan stok fisik di outlet.
          </p>
        </div>

        <div className="mb-8 grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* FORM OPNAME */}
          <div className="xl:col-span-1 rounded-3xl bg-white p-6 shadow border border-[#dfe8d2] max-md:p-5">
            <h2 className="text-xl font-bold text-[#2f3a25] mb-5">
              Form Opname
            </h2>

            <div className="space-y-4">
              <div className="relative">
                <label className="mb-2 block text-sm font-semibold text-[#3f4b35]">
                  Pilih Bahan Baku
                </label>

                <button
                  type="button"
                  onClick={() => setMaterialDropdownOpen(!materialDropdownOpen)}
                  className="w-full rounded-2xl border border-[#dfe8d2] bg-white px-4 py-4 text-left shadow-sm transition hover:bg-[#f8fff4] focus:border-[#86a96f] focus:ring-4 focus:ring-[#dfe8d2]"
                >
                  {selectedMaterial ? (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-[#2f3a25]">
                          {selectedMaterial.name}
                        </p>

                        <p className="mt-1 text-xs text-[#6f7b62]">
                          Stok sistem:{' '}
                          {Number(selectedMaterial.stock).toLocaleString(
                            'id-ID',
                          )}{' '}
                          {selectedMaterial.unit}
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-[#eef5e8] px-3 py-1 text-xs font-bold text-[#5f7f4f]">
                        Dipilih
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-[#8a947d]">
                        Cari dan pilih bahan baku
                      </span>
                      <span className="text-[#6f7b62]">⌄</span>
                    </div>
                  )}
                </button>

                {materialDropdownOpen && (
                  <div className="absolute left-0 right-0 top-[92px] z-50 rounded-2xl border border-[#dfe8d2] bg-white p-3 shadow-2xl">
                    <input
                      value={materialSearch}
                      onChange={(e) => setMaterialSearch(e.target.value)}
                      placeholder="Ketik nama bahan baku..."
                      autoFocus
                      className="mb-3 w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#2f3a25] placeholder:text-[#b8c4ad] outline-none focus:ring-2 focus:ring-[#86a96f]"
                    />

                    <div className="max-h-64 overflow-y-auto space-y-2">
                      {filteredMaterialsDropdown.length === 0 && (
                        <p className="px-3 py-4 text-center text-sm text-[#8a947d]">
                          Bahan baku tidak ditemukan.
                        </p>
                      )}

                      {filteredMaterialsDropdown.map((material) => {
                        const active = rawMaterialId === material.id;

                        return (
                          <button
                            key={material.id}
                            type="button"
                            onClick={() => {
                              setRawMaterialId(material.id);
                              setRealStock('');
                              setMaterialSearch('');
                              setMaterialDropdownOpen(false);
                            }}
                            className={`w-full rounded-xl border px-4 py-3 text-left transition cursor-pointer ${
                              active
                                ? 'border-[#6f8f5f] bg-[#eef5e8]'
                                : 'border-transparent hover:bg-[#f4f7ef]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-bold text-[#2f3a25]">
                                  {material.name}
                                </p>

                                <p className="mt-1 text-xs text-[#6f7b62]">
                                  Stok sistem:{' '}
                                  {Number(material.stock).toLocaleString(
                                    'id-ID',
                                  )}{' '}
                                  {material.unit}
                                </p>
                              </div>

                              <span
                                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                                  Number(material.stock) <= 0
                                    ? 'bg-red-100 text-red-600'
                                    : 'bg-emerald-100 text-emerald-700'
                                }`}
                              >
                                {Number(material.stock) <= 0
                                  ? 'Kosong'
                                  : 'Tersedia'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-xl bg-[#eef5e8] p-4">
                <p className="text-sm text-[#6f7b62]">Stok Sistem</p>

                <p className="mt-1 text-xl font-bold text-[#2f3a25]">
                  {systemStock.toLocaleString('id-ID')}{' '}
                  {selectedMaterial?.unit || ''}
                </p>
              </div>

              <input
                type="number"
                value={realStock}
                onChange={(e) => setRealStock(e.target.value)}
                placeholder="Stok real / stok fisik"
                className="w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#2f3a25] placeholder:text-[#b8c4ad] outline-none focus:ring-2 focus:ring-[#86a96f]"
              />

              <div
                className={`rounded-xl p-4 ${
                  difference < 0
                    ? 'bg-red-50'
                    : difference > 0
                      ? 'bg-emerald-50'
                      : 'bg-[#eef5e8]'
                }`}
              >
                <p className="text-sm text-[#6f7b62]">Selisih</p>

                <p
                  className={`mt-1 text-xl font-bold ${
                    difference < 0
                      ? 'text-red-600'
                      : difference > 0
                        ? 'text-emerald-600'
                        : 'text-[#2f3a25]'
                  }`}
                >
                  {realStock === ''
                    ? '0'
                    : `${difference > 0 ? '+' : ''}${difference.toLocaleString(
                        'id-ID',
                      )}`}{' '}
                  {selectedMaterial?.unit || ''}
                </p>
              </div>

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Catatan, contoh: tumpah, rusak, salah input stok..."
                rows={4}
                className="w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#2f3a25] placeholder:text-[#b8c4ad] outline-none focus:ring-2 focus:ring-[#86a96f]"
              />

              <button
                onClick={saveOpname}
                className="w-full rounded-xl bg-[#6f8f5f] py-3 font-semibold text-white hover:bg-[#5f7f4f] cursor-pointer"
              >
                Simpan Stock Opname
              </button>
            </div>
          </div>

          {/* SUMMARY */}
          <div className="xl:col-span-2 rounded-3xl bg-white p-6 shadow border border-[#dfe8d2] max-md:p-5">
            <h2 className="text-xl font-bold text-[#2f3a25] mb-5">
              Ringkasan Bahan Baku
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-md:grid-cols-2">
              <SummaryCard label="Total Bahan" value={materials.length} />
              <SummaryCard
                label="Stok Kosong"
                value={materials.filter((item) => item.stock <= 0).length}
              />
              <SummaryCard label="Riwayat Opname" value={opnames.length} />
            </div>

            <div className="mt-6 rounded-2xl bg-[#eef5e8] p-5">
              <p className="font-bold text-[#2f3a25]">Catatan</p>

              <p className="mt-2 text-sm text-[#6f7b62]">
                Setelah stock opname disimpan, stok bahan baku di sistem akan
                langsung mengikuti stok real. Selisih akan tersimpan sebagai
                histori audit.
              </p>
            </div>
          </div>
        </div>

        <div className="mb-5 flex gap-3 max-md:flex-col">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari riwayat berdasarkan bahan baku..."
            className="w-full rounded-xl border border-[#d6dfc8] bg-white px-4 py-3 text-[#2f3a25] placeholder:text-[#b8c4ad] outline-none focus:ring-2 focus:ring-[#86a96f]"
          />

          <button
            onClick={() => {
              fetchMaterials();
              fetchOpnames();
            }}
            className="rounded-xl border border-[#6f8f5f] px-6 py-3 font-semibold text-[#6f8f5f] hover:bg-[#eef5e8] cursor-pointer max-md:w-full"
          >
            Refresh
          </button>
        </div>

        {/* MOBILE HISTORY CARD */}
        <div className="hidden max-md:block space-y-4">
          {filteredOpnames.length === 0 && (
            <div className="rounded-3xl bg-white p-6 text-center text-[#8a947d] shadow border border-[#dfe8d2]">
              Belum ada riwayat stock opname.
            </div>
          )}

          {filteredOpnames.map((opname) => (
            <div
              key={opname.id}
              className="rounded-3xl bg-white p-5 shadow border border-[#dfe8d2]"
            >
              <div className="mb-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-lg font-bold text-[#2f3a25]">
                    {opname.rawMaterial?.name || '-'}
                  </p>

                  <p className="mt-1 text-xs text-[#6f7b62]">
                    {new Date(opname.createdAt).toLocaleString('id-ID')}
                  </p>
                </div>

                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                    opname.difference < 0
                      ? 'bg-red-100 text-red-700'
                      : opname.difference > 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-[#eef5e8] text-[#5f7f4f]'
                  }`}
                >
                  {opname.difference > 0 ? '+' : ''}
                  {opname.difference}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InfoBox label="Stok Sistem" value={String(opname.systemStock)} />
                <InfoBox label="Stok Real" value={String(opname.realStock)} />
                <InfoBox
                  label="Selisih"
                  value={`${opname.difference > 0 ? '+' : ''}${opname.difference}`}
                  green={opname.difference > 0}
                  danger={opname.difference < 0}
                />
                <InfoBox label="Catatan" value={opname.note || '-'} />
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP TABLE */}
        <div className="rounded-3xl bg-white shadow border border-[#dfe8d2] overflow-hidden max-md:hidden">
          <table className="w-full text-left">
            <thead className="bg-[#eef5e8] text-[#2f3a25]">
              <tr>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4">Bahan Baku</th>
                <th className="px-6 py-4">Stok Sistem</th>
                <th className="px-6 py-4">Stok Real</th>
                <th className="px-6 py-4">Selisih</th>
                <th className="px-6 py-4">Catatan</th>
              </tr>
            </thead>

            <tbody>
              {filteredOpnames.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-[#8a947d]"
                  >
                    Belum ada riwayat stock opname.
                  </td>
                </tr>
              )}

              {filteredOpnames.map((opname) => (
                <tr key={opname.id} className="border-t border-[#eef2e8]">
                  <td className="px-6 py-4 text-[#6f7b62]">
                    {new Date(opname.createdAt).toLocaleString('id-ID')}
                  </td>

                  <td className="px-6 py-4 font-semibold text-[#2f3a25]">
                    {opname.rawMaterial?.name || '-'}
                  </td>

                  <td className="px-6 py-4 text-[#2f3a25]">
                    {opname.systemStock}
                  </td>

                  <td className="px-6 py-4 text-[#2f3a25]">
                    {opname.realStock}
                  </td>

                  <td
                    className={`px-6 py-4 font-bold ${
                      opname.difference < 0
                        ? 'text-red-600'
                        : opname.difference > 0
                          ? 'text-emerald-600'
                          : 'text-[#2f3a25]'
                    }`}
                  >
                    {opname.difference > 0 ? '+' : ''}
                    {opname.difference}
                  </td>

                  <td className="px-6 py-4 text-[#6f7b62]">
                    {opname.note || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#f4f7ef] p-5 border border-[#dfe8d2]">
      <p className="text-sm text-[#6f7b62]">{label}</p>

      <p className="mt-2 text-3xl font-bold text-[#2f3a25] max-md:text-2xl">
        {value}
      </p>
    </div>
  );
}

function InfoBox({
  label,
  value,
  green = false,
  danger = false,
}: {
  label: string;
  value: string;
  green?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-[#f8fff4] p-3 border border-[#eef2e8]">
      <p className="text-xs text-[#8a947d]">{label}</p>

      <p
        className={`mt-1 break-words text-sm font-bold ${
          danger
            ? 'text-red-600'
            : green
              ? 'text-[#008f67]'
              : 'text-[#2f3a25]'
        }`}
      >
        {value}
      </p>
    </div>
  );
}