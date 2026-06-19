'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAuth } from './lib/auth';

export default function Home() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    if (!username.trim() || !password) {
      setError('Username dan password wajib diisi.');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login gagal');
      }

      // Simpan token ke cookie + user info ke localStorage
      saveAuth(data);

      if (data.role === 'OWNER' || data.role === 'ADMIN') {
        router.push('/dashboard');
      } else {
        router.push('/cashier');
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }

  function handleGuest() {
    // Guest tidak punya token — simpan hanya di localStorage untuk UI
    // Middleware akan bypass karena GUEST tetap boleh akses /cashier
    // tapi perlu token dummy — kita arahkan kasir tanpa proteksi JWT
    // Solusi: buat endpoint /auth/guest di backend yang return token GUEST
    try {
      localStorage.setItem('user', JSON.stringify({
        id: 'guest',
        name: 'Guest',
        username: 'guest',
        role: 'GUEST',
      }));
      // Cookie guest — middleware akan izinkan /cashier untuk GUEST
      document.cookie = `mb_token=guest_demo; path=/; max-age=${3600}; SameSite=Strict`;
    } catch { /* ignore */ }
    router.push('/cashier');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleLogin();
  }

  return (
    <main className="min-h-screen bg-[#f4f7ef] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-[#dfe8d2]">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Matchaboy Logo" className="mx-auto mb-4 h-20 w-20 object-contain" />
          <h1 className="text-3xl font-bold text-[#2f3a25]">Matchaboy</h1>
          <p className="text-sm text-[#6f7b62] mt-2">Sistem kasir & inventory matcha</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#3f4b35]">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Masukkan username"
              autoComplete="username"
              className="mt-2 w-full rounded-xl border border-[#d6dfc8] px-4 py-3 text-[#2f3a25] placeholder:text-[#b8c4ad] outline-none focus:ring-2 focus:ring-[#86a96f]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#3f4b35]">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Masukkan password"
                autoComplete="current-password"
                className="mt-2 w-full rounded-xl border border-[#d6dfc8] px-4 py-3 pr-12 text-[#2f3a25] placeholder:text-[#b8c4ad] outline-none focus:ring-2 focus:ring-[#86a96f]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#7a8a6b] cursor-pointer hover:scale-110 transition"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-xl bg-[#6f8f5f] py-3 text-white font-semibold hover:bg-[#5f7f4f] transition disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>

          <button
            onClick={handleGuest}
            className="w-full rounded-xl border border-[#6f8f5f] py-3 text-[#6f8f5f] font-semibold hover:bg-[#f4f7ef] transition cursor-pointer"
          >
            Coba Demo Kasir
          </button>
        </div>

        <p className="text-xs text-center text-[#9aa78f] mt-6">
          OWNER & ADMIN masuk ke dashboard, Guest masuk ke kasir demo.
        </p>
      </div>
    </main>
  );
}