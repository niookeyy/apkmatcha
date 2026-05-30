'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../components/Sidebar';

type Range = '1d' | '7d' | '30d' | '3m' | '12m' | 'all';

const RANGE_OPTIONS: { label: string; value: Range }[] = [
  { label: '1 Hari', value: '1d' },
  { label: '1 Minggu', value: '7d' },
  { label: '30 Hari', value: '30d' },
  { label: '3 Bulan', value: '3m' },
  { label: '12 Bulan', value: '12m' },
  { label: 'Semua', value: 'all' },
];

export default function DashboardPage() {
  const router = useRouter();

  const [range, setRange] = useState<Range>('30d');
  const [user, setUser] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [today, setToday] = useState<any>(null);
  const [cashflow, setCashflow] = useState<any>(null);
  const [profitLoss, setProfitLoss] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    fetchDashboard(range);
  }, [range]);

  function formatRupiah(value: number) {
    return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
  }

  function formatCompactRupiah(value: number) {
    const number = Number(value || 0);
    if (number >= 1000000) return `Rp${(number / 1000000).toFixed(1)}jt`;
    if (number >= 1000) return `Rp${(number / 1000).toFixed(0)}rb`;
    return `Rp${number.toLocaleString('id-ID')}`;
  }

  async function fetchDashboard(r: Range) {
    try {
      setLoading(true);

      // Selalu kirim range ke query param, 'all' berarti tidak ada filter tanggal
      const q = `?range=${r}`;

      console.log(`[dashboard] fetching with range=${r} query=${q}`);

      const [
        summaryRes,
        todayRes,
        cashflowRes,
        profitLossRes,
        topProductsRes,
        materialsRes,
        transactionsRes,
      ] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/summary${q}`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/today`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/cashflow/summary`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/profit-loss${q}`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/top-products${q}`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/raw-materials`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/transactions`),
      ]);

      const summaryData = await summaryRes.json();
      const todayData = await todayRes.json();
      const cashflowData = await cashflowRes.json();
      const profitLossData = await profitLossRes.json();
      const topProductsData = await topProductsRes.json();
      const materialsData = await materialsRes.json();
      const transactionsData = await transactionsRes.json();

      console.log('[dashboard] summary:', summaryData);
      console.log('[dashboard] profitLoss:', profitLossData);

      setSummary(summaryData);
      setToday(todayData);
      setCashflow(cashflowData);
      setProfitLoss(profitLossData);
      setTopProducts(Array.isArray(topProductsData) ? topProductsData : []);
      setMaterials(Array.isArray(materialsData) ? materialsData : []);
      setTransactions(Array.isArray(transactionsData) ? transactionsData.slice(0, 5) : []);
    } catch (error) {
      console.error('Gagal mengambil data dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  const lowStockMaterials = materials.filter((item) => Number(item.stock) <= 0);
  const latestTransaction = transactions?.[0];
  const rangeLabel = RANGE_OPTIONS.find((o) => o.value === range)?.label || '';

  return (
    <main className="min-h-screen bg-[#f4f7ef] flex overflow-x-hidden">
      <Sidebar />

      <section className="flex-1 min-w-0 p-8 max-md:w-full max-md:p-4 max-md:pt-20 max-md:overflow-x-hidden">

        {/* MOBILE LAYOUT */}
        <div className="hidden max-md:block w-full max-w-full overflow-hidden">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold text-[#2f3a25]">Dashboard</h2>
              <p className="mt-1 text-sm text-[#6f7b62]">Ringkasan operasional</p>
            </div>
            <button
              onClick={() => fetchDashboard(range)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#dfe8d2] bg-white text-[#5f7f4f] shadow-sm"
            >
              ↻
            </button>
          </div>

          {/* RANGE FILTER MOBILE */}
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition cursor-pointer ${
                  range === opt.value
                    ? 'bg-[#2f4f32] text-white shadow'
                    : 'bg-white border border-[#dfe8d2] text-[#6f7b62]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2] text-[#6f7b62]">
              Memuat dashboard...
            </div>
          ) : (
            <>
              {/* GREETING */}
              <div className="mb-7 w-full overflow-hidden rounded-3xl bg-[#6f8f5f] p-6 text-white shadow">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="break-words text-lg font-bold leading-snug">
                      Selamat datang, {user?.name || 'User'}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-white/85">
                      Data ditampilkan untuk: <span className="font-bold">{rangeLabel}</span>
                    </p>
                  </div>
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-xl font-bold">
                    {(user?.name || 'U').slice(0, 1).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* SALES PERFORMANCE */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#2f3a25]">Sales Performance</h3>
                <span className="rounded-full bg-[#2f4f32] px-4 py-2 text-xs font-bold text-white">
                  {rangeLabel}
                </span>
              </div>

              <div className="-mx-4 mb-8 overflow-x-auto px-4 pb-3 scrollbar-hide">
                <div className="flex w-max gap-4">
                  <MobileMetricCard
                    label="Penjualan Hari Ini"
                    value={formatCompactRupiah(today?.totalSales)}
                    sub={`${today?.totalTransactions || 0} transaksi`}
                  />
                  <MobileMetricCard
                    label={`Total Penjualan`}
                    value={formatCompactRupiah(summary?.totalSales)}
                    sub={`${summary?.totalTransactions || 0} transaksi`}
                  />
                  <MobileMetricCard
                    label="Laba Bersih"
                    value={formatCompactRupiah(profitLoss?.netProfit)}
                    sub="Setelah pengeluaran"
                  />
                  <MobileMetricCard
                    label="Cash Balance"
                    value={formatCompactRupiah(cashflow?.balance)}
                    sub="Masuk - keluar"
                  />
                </div>
              </div>

              {/* SMART SUGGESTIONS */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold text-[#2f3a25]">Smart Suggestions</h3>
                <button onClick={() => fetchDashboard(range)} className="text-sm font-semibold text-[#5f7f4f]">
                  Refresh
                </button>
              </div>

              <div className="mb-8 w-full space-y-3">
                {lowStockMaterials.length > 0 ? (
                  lowStockMaterials.slice(0, 3).map((item) => (
                    <MobileSuggestionCard
                      key={item.id}
                      icon="!"
                      title={`Cek stok ${item.name}`}
                      desc={`Stok tersisa ${item.stock} ${item.unit}. Segera lakukan stock opname atau tambah bahan.`}
                      danger
                      onClick={() => router.push('/stock-opname')}
                    />
                  ))
                ) : (
                  <MobileSuggestionCard
                    icon="✓"
                    title="Stok bahan aman"
                    desc="Tidak ada bahan baku yang kosong saat ini."
                    onClick={() => router.push('/raw-materials')}
                  />
                )}
                {latestTransaction ? (
                  <MobileSuggestionCard
                    icon="Rp"
                    title="Transaksi terbaru"
                    desc={`${formatRupiah(latestTransaction.total)} - ${latestTransaction.paymentStatus}`}
                    onClick={() => router.push('/reports')}
                  />
                ) : (
                  <MobileSuggestionCard
                    icon="i"
                    title="Belum ada transaksi"
                    desc="Mulai transaksi pertama dari halaman kasir."
                    onClick={() => router.push('/cashier')}
                  />
                )}
              </div>

              {/* SHORTCUTS */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-[#2f3a25]">Continue Working On</h3>
              </div>
              <div className="mb-8 grid grid-cols-2 gap-4">
                <MobileShortcut label="Kasir" icon="▦" onClick={() => router.push('/cashier')} />
                <MobileShortcut label="Produk" icon="□" onClick={() => router.push('/products')} />
                <MobileShortcut label="Bahan Baku" icon="◈" onClick={() => router.push('/raw-materials')} />
                <MobileShortcut label="Laporan" icon="≡" onClick={() => router.push('/reports')} />
              </div>

              {/* LABA RUGI */}
              <div className="mb-6 w-full rounded-3xl bg-white p-5 shadow border border-[#dfe8d2]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="font-bold text-[#2f3a25]">Ringkasan Laba Rugi</h3>
                  <span className="shrink-0 rounded-full bg-[#eef5e8] px-3 py-1 text-xs font-bold text-[#5f7f4f]">
                    {rangeLabel}
                  </span>
                </div>
                <div className="space-y-4">
                  <ReportRow label="Revenue" value={formatRupiah(profitLoss?.revenue)} />
                  <ReportRow label="HPP / COGS" value={formatRupiah(profitLoss?.cogs)} />
                  <ReportRow label="Laba Kotor" value={formatRupiah(profitLoss?.grossProfit)} />
                  <ReportRow label="Pengeluaran" value={formatRupiah(profitLoss?.expenses)} />
                  <div className="border-t border-[#eef2e8] pt-4">
                    <ReportRow label="Laba Bersih" value={formatRupiah(profitLoss?.netProfit)} bold />
                  </div>
                </div>
              </div>

              {/* PRODUK TERLARIS */}
              <div className="mb-6 w-full rounded-3xl bg-white p-5 shadow border border-[#dfe8d2]">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <h3 className="font-bold text-[#2f3a25]">Produk Terlaris</h3>
                  <span className="shrink-0 rounded-full bg-[#eef5e8] px-3 py-1 text-xs font-bold text-[#5f7f4f]">
                    {rangeLabel}
                  </span>
                </div>
                {topProducts.length === 0 ? (
                  <p className="rounded-2xl bg-[#eef5e8] p-4 text-center text-sm text-[#6f7b62]">
                    Belum ada produk terjual.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {topProducts.slice(0, 5).map((item, index) => (
                      <div key={item.productId} className="flex w-full items-center justify-between gap-3 rounded-2xl border border-[#eef2e8] p-4">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef5e8] text-sm font-bold text-[#5f7f4f]">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-[#2f3a25]">{item.name}</p>
                            <p className="text-xs text-[#6f7b62]">Qty {item.totalQty}</p>
                          </div>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-[#008f67]">
                          {formatCompactRupiah(item.totalRevenue)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* TRANSAKSI TERBARU */}
              <div className="mb-6 w-full rounded-3xl bg-white p-5 shadow border border-[#dfe8d2]">
                <h3 className="mb-4 font-bold text-[#2f3a25]">Transaksi Terbaru</h3>
                {transactions.length === 0 ? (
                  <p className="rounded-2xl bg-[#eef5e8] p-4 text-center text-sm text-[#6f7b62]">Belum ada transaksi.</p>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((trx) => (
                      <div key={trx.id} className="rounded-2xl border border-[#eef2e8] p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#2f3a25]">{formatRupiah(trx.total)}</p>
                            <p className="mt-1 text-xs text-[#6f7b62]">{new Date(trx.createdAt).toLocaleString('id-ID')}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                            trx.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700'
                            : trx.paymentStatus === 'CANCELLED' ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {trx.paymentStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* DESKTOP LAYOUT */}
        <div className="max-md:hidden">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold text-[#2f3a25]">Dashboard</h2>
              <p className="text-[#6f7b62] mt-1">Selamat datang, {user?.name || 'User'}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchDashboard(range)}
                className="rounded-xl border border-[#6f8f5f] bg-white px-5 py-3 font-semibold text-[#6f8f5f] hover:bg-[#eef5e8] transition cursor-pointer"
              >
                Refresh
              </button>
              <div className="rounded-2xl bg-white px-5 py-3 shadow border border-[#dfe8d2]">
                <p className="text-sm text-[#6f7b62]">Role</p>
                <p className="font-semibold text-[#2f3a25]">{user?.role || '-'}</p>
              </div>
            </div>
          </div>

          {/* RANGE FILTER DESKTOP */}
          <div className="mb-6 flex gap-2 flex-wrap">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`rounded-xl px-4 py-2 font-semibold text-sm transition cursor-pointer ${
                  range === opt.value
                    ? 'bg-[#2f4f32] text-white shadow'
                    : 'bg-white border border-[#dfe8d2] text-[#6f7b62] hover:bg-[#eef5e8]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="rounded-3xl bg-white p-8 shadow border border-[#dfe8d2] text-[#6f7b62]">
              Memuat dashboard...
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
                <DashboardCard
                  label="Penjualan Hari Ini"
                  value={formatRupiah(today?.totalSales)}
                  sub={`${today?.totalTransactions || 0} transaksi hari ini`}
                />
                <DashboardCard
                  label={`Total Penjualan (${rangeLabel})`}
                  value={formatRupiah(summary?.totalSales)}
                  sub={`${summary?.totalTransactions || 0} transaksi`}
                />
                <DashboardCard
                  label={`Laba Bersih (${rangeLabel})`}
                  value={formatRupiah(profitLoss?.netProfit)}
                  sub="Setelah pengeluaran"
                  green
                />
                <DashboardCard
                  label="Cash Balance"
                  value={formatRupiah(cashflow?.balance)}
                  sub="Total masuk - keluar"
                />
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 rounded-3xl bg-white p-6 shadow border border-[#dfe8d2]">
                  <div className="mb-5 flex items-center justify-between">
                    <h3 className="text-xl font-bold text-[#2f3a25]">Ringkasan Laba Rugi</h3>
                    <span className="rounded-full bg-[#eef5e8] px-3 py-1 text-xs font-bold text-[#5f7f4f]">
                      {rangeLabel}
                    </span>
                  </div>
                  <div className="space-y-4">
                    <ReportRow label="Revenue" value={formatRupiah(profitLoss?.revenue)} />
                    <ReportRow label="HPP / COGS" value={formatRupiah(profitLoss?.cogs)} />
                    <ReportRow label="Laba Kotor" value={formatRupiah(profitLoss?.grossProfit)} />
                    <ReportRow label="Pengeluaran" value={formatRupiah(profitLoss?.expenses)} />
                    <div className="border-t border-[#eef2e8] pt-4">
                      <ReportRow label="Laba Bersih" value={formatRupiah(profitLoss?.netProfit)} bold />
                    </div>
                  </div>
                </div>

                <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2]">
                  <h3 className="text-xl font-bold text-[#2f3a25] mb-5">Stok Perlu Dicek</h3>
                  {lowStockMaterials.length === 0 ? (
                    <div className="rounded-2xl bg-[#eef5e8] p-5 text-[#6f7b62]">
                      Semua stok bahan baku masih tersedia.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {lowStockMaterials.slice(0, 5).map((item) => (
                        <div key={item.id} className="rounded-2xl border border-red-100 bg-red-50 p-4">
                          <p className="font-bold text-red-700">{item.name}</p>
                          <p className="text-sm text-red-500">Stok: {item.stock} {item.unit}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div className="rounded-3xl bg-white shadow border border-[#dfe8d2] overflow-hidden">
                  <div className="p-6 border-b border-[#eef2e8] flex items-center justify-between">
                    <h3 className="text-xl font-bold text-[#2f3a25]">Produk Terlaris</h3>
                    <span className="rounded-full bg-[#eef5e8] px-3 py-1 text-xs font-bold text-[#5f7f4f]">{rangeLabel}</span>
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-[#eef5e8] text-[#2f3a25]">
                      <tr>
                        <th className="px-6 py-4">Produk</th>
                        <th className="px-6 py-4">Qty</th>
                        <th className="px-6 py-4">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-[#8a947d]">Belum ada produk terjual.</td>
                        </tr>
                      )}
                      {topProducts.slice(0, 5).map((item) => (
                        <tr key={item.productId} className="border-t border-[#eef2e8]">
                          <td className="px-6 py-4 font-semibold text-[#2f3a25]">{item.name}</td>
                          <td className="px-6 py-4 text-[#2f3a25]">{item.totalQty}</td>
                          <td className="px-6 py-4 font-semibold text-[#008f67]">{formatRupiah(item.totalRevenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-3xl bg-white shadow border border-[#dfe8d2] overflow-hidden">
                  <div className="p-6 border-b border-[#eef2e8]">
                    <h3 className="text-xl font-bold text-[#2f3a25]">Transaksi Terbaru</h3>
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-[#eef5e8] text-[#2f3a25]">
                      <tr>
                        <th className="px-6 py-4">Tanggal</th>
                        <th className="px-6 py-4">Total</th>
                        <th className="px-6 py-4">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-6 py-8 text-center text-[#8a947d]">Belum ada transaksi.</td>
                        </tr>
                      )}
                      {transactions.map((trx) => (
                        <tr key={trx.id} className="border-t border-[#eef2e8]">
                          <td className="px-6 py-4 text-[#6f7b62]">{new Date(trx.createdAt).toLocaleString('id-ID')}</td>
                          <td className="px-6 py-4 font-semibold text-[#2f3a25]">{formatRupiah(trx.total)}</td>
                          <td className="px-6 py-4">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                              trx.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700'
                              : trx.paymentStatus === 'CANCELLED' ? 'bg-red-100 text-red-700'
                              : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {trx.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function DashboardCard({ label, value, sub, green = false }: { label: string; value: string; sub: string; green?: boolean }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2]">
      <p className="text-sm text-[#6f7b62]">{label}</p>
      <h3 className={`mt-3 text-2xl font-bold ${green ? 'text-[#008f67]' : 'text-[#2f3a25]'}`}>{value}</h3>
      <p className="mt-2 text-sm text-[#8a947d]">{sub}</p>
    </div>
  );
}

function MobileMetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="w-[165px] shrink-0 rounded-3xl bg-white p-5 shadow border border-[#dfe8d2]">
      <p className="text-sm text-[#6f7b62]">{label}</p>
      <h3 className="mt-3 text-2xl font-bold text-[#2f3a25]">{value}</h3>
      <div className="mt-4 h-1 w-10 rounded-full bg-[#6f8f5f]" />
      <p className="mt-3 text-xs text-[#8a947d]">{sub}</p>
    </div>
  );
}

function MobileSuggestionCard({ icon, title, desc, danger = false, onClick }: { icon: string; title: string; desc: string; danger?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full max-w-full rounded-3xl bg-white p-4 text-left shadow border border-[#dfe8d2]">
      <div className="flex items-center gap-4">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${danger ? 'bg-red-50 text-red-600' : 'bg-[#eef5e8] text-[#5f7f4f]'}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-[#2f3a25]">{title}</p>
          <p className="mt-1 break-words text-sm text-[#6f7b62]">{desc}</p>
        </div>
      </div>
    </button>
  );
}

function MobileShortcut({ label, icon, onClick }: { label: string; icon: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="min-h-[118px] rounded-3xl bg-white p-4 text-center shadow border border-[#dfe8d2]">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eef5e8] text-lg font-bold text-[#5f7f4f]">
        {icon}
      </div>
      <p className="text-sm font-semibold text-[#6f7b62]">{label}</p>
    </button>
  );
}

function ReportRow({ label, value, bold = false }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className={`min-w-0 ${bold ? 'font-bold text-[#2f3a25]' : 'text-[#6f7b62]'}`}>{label}</p>
      <p className={`shrink-0 text-right ${bold ? 'font-bold text-[#008f67]' : 'text-[#2f3a25]'}`}>{value}</p>
    </div>
  );
}