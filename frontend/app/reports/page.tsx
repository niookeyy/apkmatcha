'use client';

import { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import Sidebar from '../components/Sidebar';

export default function ReportsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [today, setToday] = useState<any>(null);
  const [cashflow, setCashflow] = useState<any>(null);
  const [profitLoss, setProfitLoss] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function formatRupiah(value: number) {
    return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
  }

  async function fetchReports() {
    try {
      setLoading(true);

      const [
        summaryRes,
        todayRes,
        cashflowRes,
        profitLossRes,
        topProductsRes,
      ] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/summary`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/today`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/cashflow/summary`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/profit-loss`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/reports/top-products`),
      ]);

      setSummary(await summaryRes.json());
      setToday(await todayRes.json());
      setCashflow(await cashflowRes.json());
      setProfitLoss(await profitLossRes.json());

      const topProductsData = await topProductsRes.json();
      setTopProducts(Array.isArray(topProductsData) ? topProductsData : []);
    } catch (error) {
      console.error('Gagal mengambil laporan:', error);
    } finally {
      setLoading(false);
    }
  }

  function exportToExcel() {
    const date = new Date().toISOString().split('T')[0];

    const laporanRingkasan = [
      {
        'Tanggal Export': date,
        'Penjualan Hari Ini': today?.totalSales || 0,
        'Transaksi Hari Ini': today?.totalTransactions || 0,
        'Total Penjualan': summary?.totalSales || 0,
        'Total Transaksi': summary?.totalTransactions || 0,
        'Total Masuk': cashflow?.totalIn || 0,
        'Total Keluar': cashflow?.totalOut || 0,
        'Saldo Cashflow': cashflow?.balance || 0,
        Revenue: profitLoss?.revenue || 0,
        HPP: profitLoss?.cogs || 0,
        'Laba Kotor': profitLoss?.grossProfit || 0,
        Pengeluaran: profitLoss?.expenses || 0,
        'Laba Bersih': profitLoss?.netProfit || 0,
      },
    ];

    const labaRugi = [
      { Keterangan: 'Revenue', Nominal: profitLoss?.revenue || 0 },
      { Keterangan: 'HPP / COGS', Nominal: profitLoss?.cogs || 0 },
      { Keterangan: 'Laba Kotor', Nominal: profitLoss?.grossProfit || 0 },
      { Keterangan: 'Pengeluaran', Nominal: profitLoss?.expenses || 0 },
      { Keterangan: 'Laba Bersih', Nominal: profitLoss?.netProfit || 0 },
    ];

    const cashflowSheetData = [
      { Keterangan: 'Total Masuk', Nominal: cashflow?.totalIn || 0 },
      { Keterangan: 'Total Keluar', Nominal: cashflow?.totalOut || 0 },
      { Keterangan: 'Balance', Nominal: cashflow?.balance || 0 },
    ];

    const produkTerlaris =
      topProducts.length > 0
        ? topProducts.map((item) => ({
            Produk: item.name,
            'Qty Terjual': item.totalQty,
            Revenue: item.totalRevenue,
          }))
        : [{ Produk: '-', 'Qty Terjual': 0, Revenue: 0 }];

    const workbook = XLSX.utils.book_new();

    const summarySheet = XLSX.utils.json_to_sheet(laporanRingkasan);
    const labaRugiSheet = XLSX.utils.json_to_sheet(labaRugi);
    const cashflowSheet = XLSX.utils.json_to_sheet(cashflowSheetData);
    const topProductsSheet = XLSX.utils.json_to_sheet(produkTerlaris);

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');
    XLSX.utils.book_append_sheet(workbook, labaRugiSheet, 'Laba Rugi');
    XLSX.utils.book_append_sheet(workbook, cashflowSheet, 'Cashflow');
    XLSX.utils.book_append_sheet(workbook, topProductsSheet, 'Produk Terlaris');

    XLSX.writeFile(workbook, `laporan-matchaboy-${date}.xlsx`);
  }

  useEffect(() => {
    fetchReports();
  }, []);

  return (
    <main className="min-h-screen bg-[#f4f7ef] flex">
      <Sidebar />

      <section className="flex-1 p-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#2f3a25]">Laporan</h1>
            <p className="mt-1 text-[#6f7b62]">
              Ringkasan penjualan, cashflow, laba rugi, dan produk terlaris.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={fetchReports}
              className="rounded-xl bg-[#6f8f5f] px-5 py-3 font-semibold text-white hover:bg-[#5f7f4f] transition cursor-pointer"
            >
              Refresh
            </button>

            <button
              onClick={exportToExcel}
              disabled={loading}
              className="rounded-xl border border-[#6f8f5f] bg-white px-5 py-3 font-semibold text-[#6f8f5f] hover:bg-[#eef5e8] transition cursor-pointer disabled:opacity-50"
            >
              Export Excel
            </button>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl bg-white p-8 shadow border border-[#dfe8d2] text-[#6f7b62]">
            Memuat laporan...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
              <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2]">
                <p className="text-sm text-[#6f7b62]">Penjualan Hari Ini</p>
                <h3 className="mt-3 text-2xl font-bold text-[#2f3a25]">
                  {formatRupiah(today?.totalSales)}
                </h3>
                <p className="mt-2 text-sm text-[#8a947d]">
                  {today?.totalTransactions || 0} transaksi
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2]">
                <p className="text-sm text-[#6f7b62]">Total Penjualan</p>
                <h3 className="mt-3 text-2xl font-bold text-[#2f3a25]">
                  {formatRupiah(summary?.totalSales)}
                </h3>
                <p className="mt-2 text-sm text-[#8a947d]">
                  {summary?.totalTransactions || 0} transaksi
                </p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2]">
                <p className="text-sm text-[#6f7b62]">Laba Kotor</p>
                <h3 className="mt-3 text-2xl font-bold text-[#008f67]">
                  {formatRupiah(profitLoss?.grossProfit)}
                </h3>
                <p className="mt-2 text-sm text-[#8a947d]">Revenue - HPP</p>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2]">
                <p className="text-sm text-[#6f7b62]">Saldo Cashflow</p>
                <h3 className="mt-3 text-2xl font-bold text-[#2f3a25]">
                  {formatRupiah(cashflow?.balance)}
                </h3>
                <p className="mt-2 text-sm text-[#8a947d]">
                  Masuk - Keluar
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="rounded-3xl bg-white p-6 shadow border border-[#dfe8d2]">
                <h2 className="text-xl font-bold text-[#2f3a25] mb-5">
                  Laba Rugi
                </h2>

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
                <h2 className="text-xl font-bold text-[#2f3a25] mb-5">
                  Cashflow
                </h2>

                <div className="space-y-4">
                  <ReportRow
                    label="Total Masuk"
                    value={formatRupiah(cashflow?.totalIn)}
                  />
                  <ReportRow
                    label="Total Keluar"
                    value={formatRupiah(cashflow?.totalOut)}
                  />

                  <div className="border-t border-[#eef2e8] pt-4">
                    <ReportRow
                      label="Balance"
                      value={formatRupiah(cashflow?.balance)}
                      bold
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-3xl bg-white shadow border border-[#dfe8d2] overflow-hidden">
              <div className="p-6 border-b border-[#eef2e8]">
                <h2 className="text-xl font-bold text-[#2f3a25]">
                  Produk Terlaris
                </h2>
              </div>

              <table className="w-full text-left">
                <thead className="bg-[#eef5e8] text-[#2f3a25]">
                  <tr>
                    <th className="px-6 py-4">Produk</th>
                    <th className="px-6 py-4">Qty Terjual</th>
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
                        Belum ada data produk terjual.
                      </td>
                    </tr>
                  )}

                  {topProducts.map((item) => (
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

                      <td className="px-6 py-4 text-[#008f67] font-semibold">
                        {formatRupiah(item.totalRevenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </main>
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