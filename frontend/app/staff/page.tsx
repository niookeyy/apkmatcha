'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Sidebar from '../components/Sidebar';

export default function StaffPage() {
  const [staffs, setStaffs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    name: '',
    username: '',
    password: '',
    role: 'ADMIN',
  });

  useEffect(() => {
    fetchStaffs();
  }, []);

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

  async function fetchStaffs() {
    try {
      setLoading(true);

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`);
      const data = await res.json();

      if (Array.isArray(data)) {
        setStaffs(data);
      } else {
        setStaffs([]);
      }
    } catch (error) {
      console.error(error);
      setStaffs([]);

      await showSwal(
        'error',
        'Gagal memuat staff',
        'Pastikan backend menyala dan koneksi internet stabil.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function createStaff() {
    if (!form.name || !form.username || !form.password || !form.role) {
      await showSwal(
        'warning',
        'Data belum lengkap',
        'Nama, username, password, dan role wajib diisi.',
      );
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || 'Gagal menambahkan staff');
      }

      setOpen(false);

      setForm({
        name: '',
        username: '',
        password: '',
        role: 'ADMIN',
      });

      await Swal.fire({
        icon: 'success',
        title: 'Staff ditambahkan',
        text: 'Akun staff berhasil dibuat.',
        confirmButtonText: 'Oke',
        confirmButtonColor: '#2f4f32',
      });

      fetchStaffs();
    } catch (error: any) {
      await showSwal(
        'error',
        'Gagal menambahkan staff',
        error.message || 'Terjadi kesalahan.',
      );
    }
  }

  async function deleteStaff(staff: any) {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Hapus staff?',
      text: `Akun ${staff.name} akan dihapus dari sistem.`,
      showCancelButton: true,
      confirmButtonText: 'Ya, hapus',
      cancelButtonText: 'Batal',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#2f4f32',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${staff.id}`,
        {
          method: 'DELETE',
        },
      );

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || 'Gagal menghapus staff');
      }

      await Swal.fire({
        icon: 'success',
        title: 'Staff dihapus',
        text: 'Akun staff berhasil dihapus.',
        confirmButtonText: 'Oke',
        confirmButtonColor: '#2f4f32',
      });

      fetchStaffs();
    } catch (error: any) {
      await showSwal(
        'error',
        'Gagal menghapus staff',
        error.message || 'Terjadi kesalahan.',
      );
    }
  }

  const ownerCount = staffs.filter((staff) => staff.role === 'OWNER').length;
  const adminCount = staffs.filter((staff) => staff.role === 'ADMIN').length;

  return (
    <main className="min-h-screen bg-[#f4f7ef] flex overflow-x-hidden">
      <Sidebar />

      <section className="flex-1 min-w-0 p-8 max-md:w-full max-md:p-4 max-md:pt-20 max-md:overflow-x-hidden">
        <div className="mb-8 flex items-center justify-between gap-4 max-md:flex-col max-md:items-start">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-[#2f3a25] max-md:text-2xl">
              Management Staff
            </h1>

            <p className="mt-1 text-[#6f7b62] max-md:text-sm">
              Kelola akun admin dan owner Matchaboy POS.
            </p>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="rounded-xl bg-[#6f8f5f] px-5 py-3 font-semibold text-white hover:bg-[#5f7f4f] transition cursor-pointer max-md:w-full"
          >
            + Tambah Staff
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-md:grid-cols-2">
          <SummaryCard label="Total Staff" value={staffs.length} />
          <SummaryCard label="Owner" value={ownerCount} />
          <SummaryCard label="Admin" value={adminCount} />
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-8 shadow border border-[#dfe8d2] text-[#6f7b62]">
            Memuat data staff...
          </div>
        ) : (
          <>
            {/* MOBILE CARD LIST */}
            <div className="hidden max-md:block space-y-4">
              {staffs.length === 0 && (
                <div className="rounded-3xl bg-white p-6 text-center text-[#8a947d] shadow border border-[#dfe8d2]">
                  Belum ada staff.
                </div>
              )}

              {staffs.map((staff) => (
                <div
                  key={staff.id}
                  className="rounded-3xl bg-white p-5 shadow border border-[#dfe8d2]"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-lg font-bold text-[#2f3a25] leading-snug">
                        {staff.name}
                      </p>

                      <p className="mt-1 text-sm text-[#6f7b62] break-words">
                        @{staff.username}
                      </p>
                    </div>

                    <RoleBadge role={staff.role} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <InfoBox label="Role" value={staff.role} />
                    <InfoBox label="User ID" value={String(staff.id).slice(0, 8)} />
                  </div>

                  <button
                    onClick={() => deleteStaff(staff)}
                    className="mt-4 w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                  >
                    Hapus Staff
                  </button>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE */}
            <div className="rounded-3xl bg-white shadow border border-[#dfe8d2] overflow-hidden max-md:hidden">
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
                        <RoleBadge role={staff.role} />
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => deleteStaff(staff)}
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
          </>
        )}
      </section>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl bg-white p-8 shadow-2xl max-md:p-5 max-md:rounded-2xl max-md:max-h-[90vh] max-md:overflow-y-auto">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h2 className="text-3xl font-bold text-[#2f3a25] max-md:text-2xl">
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

                <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
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
                    <p className="font-bold text-[#2f3a25]">OWNER</p>

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
                    <p className="font-bold text-[#2f3a25]">ADMIN</p>

                    <p className="mt-1 text-xs text-[#6f7b62]">
                      Staff operasional dan kasir.
                    </p>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3 max-md:flex-col">
              <button
                onClick={() => setOpen(false)}
                className="rounded-2xl border border-[#dfe8d2] px-5 py-3 text-[#6f7b62] hover:bg-[#eef5e8] transition cursor-pointer max-md:w-full"
              >
                Batal
              </button>

              <button
                onClick={createStaff}
                className="rounded-2xl bg-[#6f8f5f] px-6 py-3 font-semibold text-white hover:bg-[#5f7f4f] transition cursor-pointer max-md:w-full"
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

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow border border-[#dfe8d2]">
      <p className="text-sm text-[#6f7b62]">{label}</p>
      <p className="mt-2 text-3xl font-bold text-[#2f3a25] max-md:text-2xl">
        {value}
      </p>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-bold ${
        role === 'OWNER'
          ? 'bg-[#0e4b01] text-[#e2e9d6]'
          : 'bg-[#dff6ea] text-[#007a4d]'
      }`}
    >
      {role}
    </span>
  );
}

function InfoBox({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[#f8fff4] p-3 border border-[#eef2e8]">
      <p className="text-xs text-[#8a947d]">{label}</p>

      <p className="mt-1 break-words text-sm font-bold text-[#2f3a25]">
        {value}
      </p>
    </div>
  );
}