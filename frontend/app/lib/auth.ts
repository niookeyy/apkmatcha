// app/lib/auth.ts
// Helper terpusat untuk login, logout, dan baca user

export interface AuthUser {
  id: string;
  name: string;
  username: string;
  role: 'OWNER' | 'ADMIN' | 'GUEST';
  token: string;
}

// Simpan token ke cookie (httpOnly tidak bisa dari JS, pakai SameSite=Strict)
// dan simpan info user ke localStorage untuk UI
export function saveAuth(data: AuthUser) {
  try {
    // Simpan token ke cookie — 12 jam
    const maxAge = 12 * 60 * 60;
    document.cookie = `mb_token=${data.token}; path=/; max-age=${maxAge}; SameSite=Strict`;

    // Simpan user info (tanpa token) ke localStorage untuk UI
    const { token: _token, ...userInfo } = data;
    localStorage.setItem('user', JSON.stringify(userInfo));
  } catch {
    // Ignore storage errors
  }
}

export function getUser(): Omit<AuthUser, 'token'> | null {
  try {
    const raw = localStorage.getItem('user');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    clearAuth();
    return null;
  }
}

export function clearAuth() {
  try {
    localStorage.removeItem('user');
    // Hapus cookie dengan expire di masa lalu
    document.cookie = 'mb_token=; path=/; max-age=0; SameSite=Strict';
  } catch {
    // Ignore
  }
}

export function isLoggedIn(): boolean {
  return getUser() !== null;
}