'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import Toast from '../components/ui/Toast';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [toast, setToast] = useState({
    show: false,
    type: 'success' as 'success' | 'error' | 'warning',
    title: '',
    message: '',
  });

  const [form, setForm] = useState({
    name: '',
    price: '',
    imageUrl: '',
  });

  const [ingredients, setIngredients] = useState([
    { rawMaterialName: '', qty: '' },
  ]);

  useEffect(() => {
    fetchProducts();
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

  function getImageSrc(imageUrl?: string) {
    if (!imageUrl) return '/logo.svg';

    if (imageUrl.startsWith('blob:')) return imageUrl;
    if (imageUrl.startsWith('http')) return imageUrl;

    return `${process.env.NEXT_PUBLIC_API_URL}${imageUrl}`;
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

  function openCreateModal() {
    setEditId(null);
    setImageFile(null);
    setForm({
      name: '',
      price: '',
      imageUrl: '',
    });
    setIngredients([{ rawMaterialName: '', qty: '' }]);
    setOpen(true);
  }

  function openEditModal(product: any) {
    setEditId(product.id);
    setImageFile(null);
    setForm({
      name: product.name || '',
      price: String(product.price || ''),
      imageUrl: product.imageUrl || '',
    });
    setIngredients([{ rawMaterialName: '', qty: '' }]);
    setOpen(true);
  }

  function addIngredient() {
    setIngredients([...ingredients, { rawMaterialName: '', qty: '' }]);
  }

  function removeIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function updateIngredient(index: number, key: string, value: string) {
    setIngredients(
      ingredients.map((item, i) =>
        i === index ? { ...item, [key]: value } : item,
      ),
    );
  }

  async function saveProduct() {
    if (!form.name || !form.price) {
      showToast(
        'warning',
        'Data belum lengkap',
        'Nama produk dan harga wajib diisi.',
      );
      return;
    }

    try {
      const formData = new FormData();

      formData.append('name', form.name);
      formData.append('price', form.price);

      if (imageFile) {
        formData.append('image', imageFile);
      }

      if (editId) {
        formData.append('imageUrl', form.imageUrl || '');

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/products/${editId}`,
          {
            method: 'PATCH',
            body: formData,
          },
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Gagal update produk');
        }

        showToast('success', 'Produk diperbarui', 'Data produk berhasil disimpan.');
      } else {
        const validIngredients = ingredients.filter(
          (item) => item.rawMaterialName && item.qty,
        );

        if (validIngredients.length === 0) {
          showToast(
            'warning',
            'Resep belum diisi',
            'Minimal isi 1 bahan baku untuk produk baru.',
          );
          return;
        }

        formData.append(
          'ingredients',
          JSON.stringify(
            validIngredients.map((item) => ({
              rawMaterialName: item.rawMaterialName,
              qty: Number(item.qty),
            })),
          ),
        );

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/products/with-recipe`,
          {
            method: 'POST',
            body: formData,
          },
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data.message ||
              'Gagal tambah produk. Pastikan bahan baku sudah ada dan qty benar.',
          );
        }

        showToast('success', 'Produk ditambahkan', 'Produk baru berhasil dibuat.');
      }

      setOpen(false);
      setEditId(null);
      setImageFile(null);
      setForm({ name: '', price: '', imageUrl: '' });
      setIngredients([{ rawMaterialName: '', qty: '' }]);
      fetchProducts();
    } catch (err: any) {
      showToast(
        'error',
        'Gagal menyimpan',
        err.message || 'Terjadi kesalahan.',
      );
    }
  }

  async function deleteProduct(id: string) {
    const confirmDelete = confirm('Yakin ingin menghapus produk ini?');

    if (!confirmDelete) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products/${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Produk gagal dihapus.');
      }

      showToast('success', 'Produk dihapus', 'Produk berhasil dihapus.');
      fetchProducts();
    } catch (err: any) {
      showToast(
        'error',
        'Gagal hapus',
        err.message || 'Produk mungkin sudah dipakai di transaksi.',
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
            <h1 className="text-3xl font-bold text-[#2f3a25]">Produk</h1>
            <p className="mt-1 text-[#6f7b62]">
              Produk dibuat bersama resep. Stok dan HPP otomatis dari bahan baku.
            </p>
          </div>

          <button
            onClick={openCreateModal}
            className="rounded-xl bg-[#6f8f5f] px-5 py-3 font-semibold text-white hover:bg-[#5f7f4f] transition cursor-pointer"
          >
            + Tambah Produk
          </button>
        </div>

        <div className="rounded-3xl bg-white shadow border border-[#dfe8d2] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#eef5e8] text-[#2f3a25]">
              <tr>
                <th className="px-6 py-4">Gambar</th>
                <th className="px-6 py-4">Kode</th>
                <th className="px-6 py-4">Nama Produk</th>
                <th className="px-6 py-4">Harga</th>
                <th className="px-6 py-4">HPP</th>
                <th className="px-6 py-4">Stok Otomatis</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {products.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-8 text-center text-[#8a947d]"
                  >
                    Belum ada produk.
                  </td>
                </tr>
              )}

              {products.map((product) => (
                <tr key={product.id} className="border-t border-[#eef2e8]">
                  <td className="px-6 py-4">
                    <div className="h-16 w-16 overflow-hidden rounded-2xl border border-[#dfe8d2] bg-[#eef5e8] flex items-center justify-center">
                      <img
                        src={getImageSrc(product.imageUrl)}
                        alt={product.name}
                        className={`h-full w-full ${
                          product.imageUrl ? 'object-cover' : 'object-contain p-3'
                        }`}
                        draggable={false}
                      />
                    </div>
                  </td>

                  <td className="px-6 py-4 font-semibold text-[#2f3a25]">
                    {product.code || '-'}
                  </td>

                  <td className="px-6 py-4 text-[#2f3a25]">
                    {product.name}
                  </td>

                  <td className="px-6 py-4 text-[#2f3a25]">
                    Rp{Number(product.price).toLocaleString('id-ID')}
                  </td>

                  <td className="px-6 py-4 text-[#6f7b62]">
                    Rp{Number(product.cost).toLocaleString('id-ID')}
                  </td>

                  <td className="px-6 py-4 text-[#2f3a25]">
                    {product.stock}
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => openEditModal(product)}
                      className="mr-2 rounded-lg border border-[#d6dfc8] px-3 py-2 text-sm text-[#5f7f4f] hover:bg-[#eef5e8] cursor-pointer"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => deleteProduct(product.id)}
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
          <div className="w-full max-w-2xl rounded-3xl bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-[#2f3a25]">
                {editId ? 'Edit Produk' : 'Tambah Produk + Resep'}
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
                placeholder="Nama Produk"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#2f3a25] placeholder:text-[#b8c4ad] outline-none focus:ring-2 focus:ring-[#86a96f]"
              />

              <input
                type="number"
                placeholder="Harga Jual"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                className="w-full rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#2f3a25] placeholder:text-[#b8c4ad] outline-none focus:ring-2 focus:ring-[#86a96f]"
              />

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#2f3a25]">
                  Upload Gambar Produk
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];

                    if (file) {
                      setImageFile(file);
                      setForm({
                        ...form,
                        imageUrl: URL.createObjectURL(file),
                      });
                    }
                  }}
                  className="w-full rounded-xl border border-[#dfe8d2] bg-white px-4 py-3 text-[#2f3a25] file:mr-4 file:rounded-lg file:border-0 file:bg-[#6f8f5f] file:px-4 file:py-2 file:text-white"
                />
              </div>

              <div className="rounded-2xl border border-[#dfe8d2] bg-[#f8fff4] p-4">
                <p className="mb-3 text-sm font-semibold text-[#2f3a25]">
                  Preview Gambar Produk
                </p>

                <div className="h-48 w-full overflow-hidden rounded-2xl bg-[#eef5e8] flex items-center justify-center">
                  <img
                    src={getImageSrc(form.imageUrl)}
                    alt="Preview produk"
                    className={`h-full w-full ${
                      form.imageUrl ? 'object-cover' : 'object-contain p-10'
                    }`}
                    draggable={false}
                  />
                </div>

                {!form.imageUrl && (
                  <p className="mt-3 text-xs text-[#8a947d]">
                    Jika gambar kosong, sistem otomatis memakai logo default.
                  </p>
                )}
              </div>
            </div>

            {!editId && (
              <div className="mt-6">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-bold text-[#2f3a25]">
                    Resep / Bahan Baku
                  </h3>

                  <button
                    onClick={addIngredient}
                    className="rounded-xl border border-[#6f8f5f] px-4 py-2 text-sm font-semibold text-[#6f8f5f] cursor-pointer"
                  >
                    + Tambah Bahan
                  </button>
                </div>

                <div className="space-y-3">
                  {ingredients.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3">
                      <input
                        placeholder="Nama bahan baku"
                        value={item.rawMaterialName}
                        onChange={(e) =>
                          updateIngredient(
                            index,
                            'rawMaterialName',
                            e.target.value,
                          )
                        }
                        className="col-span-7 rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#2f3a25] placeholder:text-[#b8c4ad] outline-none"
                      />

                      <input
                        type="number"
                        placeholder="Qty"
                        value={item.qty}
                        onChange={(e) =>
                          updateIngredient(index, 'qty', e.target.value)
                        }
                        className="col-span-3 rounded-xl border border-[#dfe8d2] px-4 py-3 text-[#2f3a25] placeholder:text-[#b8c4ad] outline-none"
                      />

                      <button
                        onClick={() => removeIngredient(index)}
                        className="col-span-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>

                <p className="mt-3 text-sm text-[#8a947d]">
                  Stok produk akan dihitung otomatis dari stok bahan baku paling
                  terbatas.
                </p>
              </div>
            )}

            {editId && (
              <div className="mt-6 rounded-2xl bg-[#eef5e8] p-4 text-sm text-[#6f7b62]">
                Saat edit produk, kamu bisa mengubah nama, harga, dan gambar.
                Resep bahan baku tetap mengikuti data produk yang sudah dibuat.
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-xl border border-[#dfe8d2] px-5 py-3 text-[#6f7b62] hover:bg-[#eef5e8] cursor-pointer"
              >
                Batal
              </button>

              <button
                onClick={saveProduct}
                className="rounded-xl bg-[#6f8f5f] px-5 py-3 font-semibold text-white hover:bg-[#5f7f4f] cursor-pointer"
              >
                {editId ? 'Simpan Perubahan' : 'Simpan Produk'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}