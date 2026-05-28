'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const allMenus = [
    { label: 'Dashboard', path: '/dashboard', roles: ['OWNER', 'ADMIN'] },
    { label: 'Kasir', path: '/cashier', roles: ['OWNER', 'ADMIN', 'GUEST'] },
    { label: 'Produk', path: '/products', roles: ['OWNER'] },
    { label: 'Bahan Baku', path: '/raw-materials', roles: ['OWNER', 'ADMIN'] },
    { label: 'Stock Opname', path: '/stock-opname', roles: ['OWNER', 'ADMIN'] },
    { label: 'Management Staff', path: '/staff', roles: ['OWNER'] },
    { label: 'Laporan', path: '/reports', roles: ['OWNER'] },
    { label: 'Struk', path: '/receipt-settings', roles: ['OWNER', 'ADMIN'] },
  ];

  const role = user?.role || 'ADMIN';
  const menus = allMenus.filter((menu) => menu.roles.includes(role));

  function goToPage(path: string) {
    router.push(path);
    setMobileOpen(false);
  }

  function logout() {
    localStorage.removeItem('user');
    router.push('/');
  }

  const SidebarContent = (
    <>
      <div className="mb-10">
        <img
          src="/logo.svg"
          alt="Matchaboy"
          className="mb-3 h-14 w-14"
          draggable={false}
        />

        <h1 className="text-xl font-bold">Matchaboy</h1>

        <p className="text-sm text-[#c9d8bf]">
          {user?.role || 'POS Dashboard'}
        </p>
      </div>

      <nav className="space-y-3">
        {menus.map((menu) => {
          const active = pathname === menu.path;

          return (
            <button
              key={menu.path}
              onClick={() => goToPage(menu.path)}
              className={`w-full rounded-xl px-4 py-3 text-left font-medium transition cursor-pointer ${
                active
                  ? 'bg-[#6f8f5f] text-white shadow'
                  : 'text-[#dce8d2] hover:bg-[#456b49]'
              }`}
            >
              {menu.label}
            </button>
          );
        })}
      </nav>

      <div className="mt-10 rounded-2xl bg-[#456b49] p-4">
        <p className="text-xs uppercase tracking-wider text-[#dce8d2]">
          Login sebagai
        </p>

        <p className="mt-2 font-bold text-white">
          {user?.name || 'User'}
        </p>

        <p className="text-sm text-[#dce8d2]">
          {user?.username || '-'}
        </p>
      </div>

      <button
        onClick={logout}
        className="mt-4 w-full rounded-xl border border-[#dce8d2]/30 px-4 py-3 text-left font-medium text-[#dce8d2] hover:bg-red-500/20 hover:text-white transition cursor-pointer"
      >
        Keluar
      </button>
    </>
  );

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-xl bg-[#2f4f32] px-4 py-3 font-bold text-white shadow md:hidden"
      >
        ☰
      </button>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-y-auto bg-[#2f4f32] p-6 text-white md:block">
        {SidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/40"
          />

          <aside className="relative h-full w-64 overflow-y-auto bg-[#2f4f32] p-6 text-white shadow-2xl">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-4 top-4 text-2xl text-white"
            >
              ×
            </button>

            {SidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}