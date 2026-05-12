'use client';

import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';

export default function DashboardPage() {
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

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    fetchDashboard();
  }, []);

  function formatRupiah(value: number) {
    return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
  }

  async function fetchDashboard() {
    try {
      setLoading(true);

      const [
        summaryRes,
        todayRes,
        cashflowRes,
        profitLossRes,
        topProductsRes,
        materialsRes,
        transactionsRes,
      ] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/summary`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/today`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/cashflow/summary`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/profit-loss`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/top-products`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/raw-materials`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/transactions`),
      ]);

      setSummary(await summaryRes.json());
      setToday(await todayRes.json());
      setCashflow(await cashflowRes.json());
      setProfitLoss(await profitLossRes.json());

      const topProductsData = await topProductsRes.json();
      const materialsData = await materialsRes.json();
      const transactionsData = await transactionsRes.json();

      setTopProducts(Array.isArray(topProductsData) ? topProductsData : []);
      setMaterials(Array.isArray(materialsData) ? materialsData : []);
      setTransactions(
        Array.isArray(transactionsData) ? transactionsData.slice(0, 5) : [],
      );
    } catch (error) {
      console.error('Gagal mengambil data dashboard:', error);
    } finally {
      setLoading(false);
    }
  }

  const lowStockMaterials = materials.filter((item) => Number(item.stock) <= 0);

  return (
    <main className="min-h-screen bg-[#f4f7ef] flex">
      <Sidebar />

      <section className="flex-1 p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-[#2f3a25]">Dashboard</h2>
            <p className="text-[#6f7b62] mt-1">
              Selamat datang, {user?.name || 'User'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchDashboard}
              className="rounded-xl border border-[#6f8f5f] bg-white px-5 py-3 font-semibold text-[#6f8f5f] hover:bg-[#eef5e8] transition cursor-pointer"
            >
              Refresh
            </button>

            <div className="rounded-2xl bg-white px-5 py-3 shadow border border-[#dfe8d2]">
              <p className="text-sm text-[#6f7b62]">Role</p>
              <p className="font-semibold text-[#2f3a25]">
                {user?.role || '-'}
              </p>
            </div>
          </div>
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
                label="Total Penjualan"
                value={formatRupiah(summary?.totalSales)}
                sub={`${summary?.totalTransactions || 0} total transaksi`}
              />

              <DashboardCard
                label="Laba Bersih"
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
                  <h3 className="text-xl font-bold text-[#2f3a25]">
                    Ringkasan Laba Rugi
                  </h3>
                  <span className="rounded-full bg-[#eef5e8] px-3 py-1 text-xs font-bold text-[#5f7f4f]">
                    Live Data
                  </span>
                </div>

                <div className="space-y-4">
                  <ReportRow
                    label="Revenue"
                    value={formatRupiah(profitLoss?.revenue)}
                  />
                  <ReportRow
                    label="HPP / COGS"
                    value={formatRupiah(profitLoss?.cogs)}
                  />
                  <ReportRow
                    label="Laba Kotor"
                    value={formatRupiah(profitLoss?.grossProfit)}
                  />
                  <ReportRow
                    label="Pengeluaran"
                    value={formatRupiah(profitLoss?.expenses)}
                  />
                  <div className="border-t border-[#eef2e8] pt-4">
                    <ReportRow
                      label="Laba Bersih"
                      value={formatRupiah(profitLoss?.netProfit)}
                      bold
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2]">
                <h3 className="text-xl font-bold text-[#2f3a25] mb-5">
                  Stok Perlu Dicek
                </h3>

                {lowStockMaterials.length === 0 ? (
                  <div className="rounded-2xl bg-[#eef5e8] p-5 text-[#6f7b62]">
                    Semua stok bahan baku masih tersedia.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lowStockMaterials.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-red-100 bg-red-50 p-4"
                      >
                        <p className="font-bold text-red-700">{item.name}</p>
                        <p className="text-sm text-red-500">
                          Stok: {item.stock} {item.unit}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-3xl bg-white shadow border border-[#dfe8d2] overflow-hidden">
                <div className="p-6 border-b border-[#eef2e8]">
                  <h3 className="text-xl font-bold text-[#2f3a25]">
                    Produk Terlaris
                  </h3>
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
                        <td
                          colSpan={3}
                          className="px-6 py-8 text-center text-[#8a947d]"
                        >
                          Belum ada produk terjual.
                        </td>
                      </tr>
                    )}

                    {topProducts.slice(0, 5).map((item) => (
                      <tr
                        key={item.productId}
                        className="border-t border-[#eef2e8]"
                      >
                        <td className="px-6 py-4 font-semibold text-[#2f3a25]">
                          {item.name}
                        </td>
                        <td className="px-6 py-4 text-[#2f3a25]">
                          {item.totalQty}
                        </td>
                        <td className="px-6 py-4 font-semibold text-[#008f67]">
                          {formatRupiah(item.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="rounded-3xl bg-white shadow border border-[#dfe8d2] overflow-hidden">
                <div className="p-6 border-b border-[#eef2e8]">
                  <h3 className="text-xl font-bold text-[#2f3a25]">
                    Transaksi Terbaru
                  </h3>
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
                        <td
                          colSpan={3}
                          className="px-6 py-8 text-center text-[#8a947d]"
                        >
                          Belum ada transaksi.
                        </td>
                      </tr>
                    )}

                    {transactions.map((trx) => (
                      <tr key={trx.id} className="border-t border-[#eef2e8]">
                        <td className="px-6 py-4 text-[#6f7b62]">
                          {new Date(trx.createdAt).toLocaleString('id-ID')}
                        </td>
                        <td className="px-6 py-4 font-semibold text-[#2f3a25]">
                          {formatRupiah(trx.total)}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${
                              trx.paymentStatus === 'PAID'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
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
      </section>
    </main>
  );
}

function DashboardCard({
  label,
  value,
  sub,
  green = false,
}: {
  label: string;
  value: string;
  sub: string;
  green?: boolean;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2]">
      <p className="text-sm text-[#6f7b62]">{label}</p>
      <h3
        className={`mt-3 text-2xl font-bold ${
          green ? 'text-[#008f67]' : 'text-[#2f3a25]'
        }`}
      >
        {value}
      </h3>
      <p className="mt-2 text-sm text-[#8a947d]">{sub}</p>
    </div>
  );
}

function ReportRow({
  label,
  value,
  bold = false,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className={bold ? 'font-bold text-[#2f3a25]' : 'text-[#6f7b62]'}>
        {label}
      </p>
      <p className={bold ? 'font-bold text-[#008f67]' : 'text-[#2f3a25]'}>
        {value}
      </p>
    </div>
  );
}