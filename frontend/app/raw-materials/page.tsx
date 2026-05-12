'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Toast from '../components/ui/Toast';

export default function RawMaterialsPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [toast, setToast] = useState({
    show: false,
    type: 'success' as 'success' | 'error' | 'warning',
    title: '',
    message: '',
  });

  const [form, setForm] = useState({
    name: '',
    unit: '',
    stock: '',
    cost: '',
  });

  useEffect(() => {
    fetchMaterials();
  }, []);

  const filteredMaterials = materials.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase()),
  );

  function formatRupiah(value: number) {
    return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
  }

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

  function openCreateModal() {
    setEditId(null);
    setForm({
      name: '',
      unit: '',
      stock: '',
      cost: '',
    });
    setOpen(true);
  }

  function openEditModal(material: any) {
    setEditId(material.id);
    setForm({
      name: material.name || '',
      unit: material.unit || '',
      stock: String(material.stock || ''),
      cost: String(material.cost || ''),
    });
    setOpen(true);
  }

  async function saveMaterial() {
    if (!form.name || !form.unit || !form.stock || !form.cost) {
      showToast(
        'warning',
        'Data belum lengkap',
        'Nama, satuan, stok, dan total modal wajib diisi.',
      );
      return;
    }

    const payload = {
      name: form.name,
      unit: form.unit,
      stock: Number(form.stock),
      cost: Number(form.cost),
    };

    try {
      const url = editId
        ? `${process.env.NEXT_PUBLIC_API_URL}/raw-materials/${editId}`
        : `${process.env.NEXT_PUBLIC_API_URL}/raw-materials`;

      const res = await fetch(url, {
        method: editId ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan bahan baku');
      }

      showToast(
        'success',
        editId ? 'Bahan baku diperbarui' : 'Bahan baku ditambahkan',
        editId
          ? 'Data bahan baku berhasil diperbarui.'
          : 'Bahan baku baru berhasil disimpan.',
      );

      setOpen(false);
      setEditId(null);
      setForm({
        name: '',
        unit: '',
        stock: '',
        cost: '',
      });
      fetchMaterials();
    } catch (err: any) {
      showToast(
        'error',
        'Gagal menyimpan',
        err.message || 'Terjadi kesalahan.',
      );
    }
  }

  async function deleteMaterial(id: string) {
    const confirmDelete = confirm('Yakin ingin menghapus bahan baku ini?');

    if (!confirmDelete) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/raw-materials/${id}`,
        {
          method: 'DELETE',
        },
      );

      if (!res.ok) {
        throw new Error('Bahan baku tidak bisa dihapus.');
      }

      showToast('success', 'Bahan baku dihapus', 'Data berhasil dihapus.');
      fetchMaterials();
    } catch (err: any) {
      showToast(
        'error',
        'Gagal hapus',
        err.message || 'Bahan baku mungkin masih dipakai di resep produk.',
      );
    }
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
            <h1 className="text-3xl font-bold text-[#2f3a25]">
              Bahan Baku
            </h1>
            <p className="mt-1 text-[#6f7b62]">
              Kelola stok bahan baku dan modal untuk perhitungan HPP.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="rounded-xl bg-[#6f8f5f] px-5 py-3 font-semibold text-white hover:bg-[#5f7f4f] transition cursor-pointer"
          >
            + Tambah Bahan
          </button>
        </div>

        <div className="mb-5 flex gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari bahan baku..."
            className="w-full rounded-xl border border-[#d6dfc8] bg-white px-4 py-3 text-[#2f3a25] placeholder:text-[#b8c4ad] outline-none focus:ring-2 focus:ring-[#86a96f]"
          />

          <button
            onClick={fetchMaterials}
            className="rounded-xl border border-[#6f8f5f] px-6 font-semibold text-[#6f8f5f] hover:bg-[#eef5e8] cursor-pointer"
          >
            Refresh
          </button>
        </div>

        <div className="rounded-3xl bg-white shadow border border-[#dfe8d2] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#eef5e8] text-[#2f3a25]">
              <tr>
                <th className="px-6 py-4">Nama Bahan</th>
                <th className="px-6 py-4">Satuan</th>
                <th className="px-6 py-4">Stok</th>
                <th className="px-6 py-4">Total Modal</th>
                <th className="px-6 py-4">Modal / Satuan</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {filteredMaterials.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-[#8a947d]"
                  >
                    Belum ada bahan baku.
                  </td>
                </tr>
              )}

              {filteredMaterials.map((material) => (
                <tr key={material.id} className="border-t border-[#eef2e8]">
                  <td className="px-6 py-4 font-semibold text-[#2f3a25]">
                    {material.name}
                  </td>

                  <td className="px-6 py-4 text-[#6f7b62]">
                    {material.unit}
                  </td>

                  <td className="px-6 py-4 text-[#2f3a25]">
                    {Number(material.stock).toLocaleString('id-ID')} {material.unit}
                  </td>

                  <td className="px-6 py-4 text-[#2f3a25]">
                    {formatRupiah(material.cost)}
                  </td>

                  <td className="px-6 py-4 text-[#008f67] font-semibold">
                    {formatRupiah(material.costPerUnit)}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEditModal(material)}
                      className="mr-2 rounded-lg border border-[#d6dfc8] px-3 py-2 text-sm text-[#5f7f4f] hover:bg-[#eef5e8] cursor-pointer"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteMaterial(material.id)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#2f3a25]">
                {editId ? 'Edit Bahan Baku' : 'Tambah Bahan Baku'}
              </h2>

              <button
                onClick={() => setOpen(false)}
                className="text-2xl text-[#8a947d] hover:text-black cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <input
                placeholder="Nama bahan baku, contoh: Matcha Powder"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#2f3a25] placeholder:text-[#b8c4ad] outline-none focus:ring-2 focus:ring-[#86a96f]"
              />

              <input
                placeholder="Satuan, contoh: gram / ml / pcs"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#2f3a25] placeholder:text-[#b8c4ad] outline-none focus:ring-2 focus:ring-[#86a96f]"
              />

              <input
                type="number"
                placeholder="Jumlah stok, contoh: 1000"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                className="w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#2f3a25] placeholder:text-[#b8c4ad] outline-none focus:ring-2 focus:ring-[#86a96f]"
              />

              <input
                type="number"
                placeholder="Total modal, contoh: 150000"
                value={form.cost}
                onChange={(e) => setForm({ ...form, cost: e.target.value })}
                className="w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#2f3a25] placeholder:text-[#b8c4ad] outline-none focus:ring-2 focus:ring-[#86a96f]"
              />

              <div className="rounded-xl bg-[#eef5e8] p-4 text-sm text-[#6f7b62]">
                Modal per satuan akan dihitung otomatis:
                <span className="ml-1 font-bold text-[#2f3a25]">
                  {form.stock && form.cost
                    ? formatRupiah(Number(form.cost) / Number(form.stock))
                    : 'Rp0'}
                </span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#dfe8d2] px-5 py-3 text-[#6f7b62] hover:bg-[#eef5e8] cursor-pointer"
              >
                Batal
              </button>

              <button
                onClick={saveMaterial}
                className="rounded-xl bg-[#6f8f5f] px-5 py-3 font-semibold text-white hover:bg-[#5f7f4f] cursor-pointer"
              >
                {editId ? 'Simpan Perubahan' : 'Simpan Bahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}