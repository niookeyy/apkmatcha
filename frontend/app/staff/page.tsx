'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function StaffPage() {
  const [staffs, setStaffs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'ADMIN',
  });

  useEffect(() => {
    fetchStaffs();
  }, []);

  async function fetchStaffs() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users`,
      );

      const data = await res.json();

      if (Array.isArray(data)) {
        setStaffs(data);
      } else {
        setStaffs([]);
      }
    } catch (error) {
      console.error(error);
      setStaffs([]);
    }
  }

  async function createStaff() {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(form),
        },
      );

      if (!res.ok) {
        alert('Gagal menambahkan staff');
        return;
      }

      setOpen(false);

      setForm({
        name: '',
        username: '',
        password: '',
        role: 'ADMIN',
      });

      fetchStaffs();
    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan');
    }
  }

  async function deleteStaff(id: string) {
    const confirmDelete = confirm(
      'Yakin ingin menghapus staff ini?',
    );

    if (!confirmDelete) return;

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${id}`,
        {
          method: 'DELETE',
        },
      );

      fetchStaffs();
    } catch (error) {
      console.error(error);
      alert('Gagal menghapus staff');
    }
  }

  return (
    <main className="min-h-screen bg-[#f4f7ef] flex select-none">
      <Sidebar />

      <section className="flex-1 p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#2f3a25]">
              Management Staff
            </h1>

            <p className="mt-1 text-[#6f7b62]">
              Kelola akun admin dan owner Matchaboy POS.
            </p>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="rounded-xl bg-[#6f8f5f] px-5 py-3 font-semibold text-white hover:bg-[#5f7f4f] transition cursor-pointer"
          >
            + Tambah Staff
          </button>
        </div>

        <div className="rounded-3xl bg-white shadow border border-[#dfe8d2] overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-[#eef5e8] text-[#2f3a25]">
              <tr>
                <th className="px-6 py-4">Nama</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4 text-right">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {staffs.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-8 text-center text-[#8a947d]"
                  >
                    Belum ada staff.
                  </td>
                </tr>
              )}

              {staffs.map((staff) => (
                <tr
                  key={staff.id}
                  className="border-t border-[#eef2e8]"
                >
                  <td className="px-6 py-4 font-semibold text-[#2f3a25]">
                    {staff.name}
                  </td>

                  <td className="px-6 py-4 text-[#6f7b62]">
                    {staff.username}
                  </td>

                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        staff.role === 'OWNER'
                          ? 'bg-[#0e4b01] text-[#e2e9d6]'
                          : 'bg-[#dff6ea] text-[#007a4d]'
                      }`}
                    >
                      {staff.role}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => deleteStaff(staff.id)}
                      className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-3xl font-bold text-[#2f3a25]">
                Tambah Staff
              </h2>

              <button
                onClick={() => setOpen(false)}
                className="text-2xl text-[#8a947d] hover:text-black cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-[#3f4b35]">
                  Nama Staff
                </label>

                <input
                  placeholder="Masukkan nama staff"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-[#dfe8d2] bg-[#fdfefd] px-5 py-4 text-[#2f3a25] outline-none transition focus:border-[#86a96f] focus:ring-4 focus:ring-[#dfe8d2]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#3f4b35]">
                  Username
                </label>

                <input
                  placeholder="Masukkan username"
                  value={form.username}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      username: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-[#dfe8d2] bg-[#fdfefd] px-5 py-4 text-[#2f3a25] outline-none transition focus:border-[#86a96f] focus:ring-4 focus:ring-[#dfe8d2]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#3f4b35]">
                  Password
                </label>

                <input
                  type="password"
                  placeholder="Masukkan password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      password: e.target.value,
                    })
                  }
                  className="w-full rounded-2xl border border-[#dfe8d2] bg-[#fdfefd] px-5 py-4 text-[#2f3a25] outline-none transition focus:border-[#86a96f] focus:ring-4 focus:ring-[#dfe8d2]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-[#3f4b35]">
                  Role Staff
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        role: 'OWNER',
                      })
                    }
                    className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
                      form.role === 'OWNER'
                        ? 'border-[#6f8f5f] bg-[#eef5e8] shadow'
                        : 'border-[#dfe8d2] bg-white hover:bg-[#f8fff4]'
                    }`}
                  >
                    <p className="font-bold text-[#2f3a25]">
                      OWNER
                    </p>

                    <p className="mt-1 text-xs text-[#6f7b62]">
                      Pemilik bisnis, akses penuh.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        role: 'ADMIN',
                      })
                    }
                    className={`rounded-2xl border p-4 text-left transition cursor-pointer ${
                      form.role === 'ADMIN'
                        ? 'border-[#6f8f5f] bg-[#eef5e8] shadow'
                        : 'border-[#dfe8d2] bg-white hover:bg-[#f8fff4]'
                    }`}
                  >
                    <p className="font-bold text-[#2f3a25]">
                      ADMIN
                    </p>

                    <p className="mt-1 text-xs text-[#6f7b62]">
                      Staff operasional dan kasir.
                    </p>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-[#dfe8d2] px-5 py-3 text-[#6f7b62] hover:bg-[#eef5e8] transition cursor-pointer"
              >
                Batal
              </button>

              <button
                onClick={createStaff}
                className="rounded-2xl bg-[#6f8f5f] px-6 py-3 font-semibold text-white hover:bg-[#5f7f4f] transition cursor-pointer"
              >
                Simpan Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}