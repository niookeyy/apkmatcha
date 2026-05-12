'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin() {
    try {
      setLoading(true);
      setError('');

      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Login gagal');
      }

      localStorage.setItem('user', JSON.stringify(data));

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
    const guest = {
      name: 'Guest',
      username: 'guest',
      role: 'GUEST',
    };

    localStorage.setItem('user', JSON.stringify(guest));
    router.push('/cashier');
  }

  return (
    <main className="min-h-screen bg-[#f4f7ef] flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl border border-[#dfe8d2]">
        <div className="text-center mb-8">
          <img
            src="/logo.svg"
            alt="Matchaboy Logo"
            className="mx-auto mb-4 h-20 w-20 object-contain"
          />

          <h1 className="text-3xl font-bold text-[#2f3a25]">Matchaboy</h1>

          <p className="text-sm text-[#6f7b62] mt-2">
            Sistem kasir & inventory matcha
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#3f4b35]">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Masukkan username"
              className="mt-2 w-full rounded-xl border border-[#d6dfc8] px-4 py-3 text-[#2f3a25] placeholder:text-[#b8c4ad] outline-none focus:ring-2 focus:ring-[#86a96f]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#3f4b35]">
              Password
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password"
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
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </p>
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