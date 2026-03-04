'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import { formatRupiah, formatDate } from '@/lib/utils';
import {
  HiOutlineDocumentDownload,
  HiOutlineTable,
  HiOutlineDocumentText,
  HiOutlineCalendar,
} from 'react-icons/hi';

interface ReportData {
  period: string;
  totalIncome: number;
  totalExpense: number;
  balance: number;
  contributions: {
    user: string;
    sampName: string;
    amount: number;
    week: number;
    status: string;
    date: string;
  }[];
  expenses: {
    category: string;
    description: string;
    amount: number;
    admin: string;
    date: string;
  }[];
}

export default function ReportsPage() {
  const { data: session } = useSession();
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    fetchReport();
  }, [month, year]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?month=${month}&year=${year}&type=report`);
      const data = await res.json();
      if (data.success) {
        setReportData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    if (!reportData) return;
    setExporting('excel');

    try {
      const XLSX = await import('xlsx');

      // Contributions sheet
      const contribData = reportData.contributions.map((c) => ({
        'Nama Staff': c.user,
        'Nama In-Game': c.sampName,
        'Minggu Ke': c.week,
        'Nominal': c.amount,
        'Status': c.status === 'PAID' ? 'Lunas' : 'Belum Bayar',
        'Tanggal': c.date,
      }));

      // Expenses sheet
      const expenseData = reportData.expenses.map((e) => ({
        'Kategori': e.category,
        'Deskripsi': e.description,
        'Nominal': e.amount,
        'Dicatat Oleh': e.admin,
        'Tanggal': e.date,
      }));

      // Summary sheet
      const summaryData = [
        { 'Keterangan': 'Total Pemasukan', 'Nominal': reportData.totalIncome },
        { 'Keterangan': 'Total Pengeluaran', 'Nominal': reportData.totalExpense },
        { 'Keterangan': 'Saldo', 'Nominal': reportData.balance },
      ];

      const wb = XLSX.utils.book_new();
      
      const ws1 = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Ringkasan');
      
      const ws2 = XLSX.utils.json_to_sheet(contribData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Iuran');
      
      const ws3 = XLSX.utils.json_to_sheet(expenseData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Pengeluaran');

      XLSX.writeFile(wb, `Laporan-Kas-Westfield-${month}-${year}.xlsx`);
      toast.success('File Excel berhasil diunduh!');
    } catch (error) {
      toast.error('Gagal export Excel');
      console.error(error);
    } finally {
      setExporting(null);
    }
  };

  const exportToPDF = async () => {
    if (!reportData) return;
    setExporting('pdf');

    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF();

      // Title
      doc.setFontSize(18);
      doc.text('Laporan Kas Server Westfield RP', 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      doc.text(`Periode: ${getMonthName(month)} ${year}`, 14, 30);

      // Summary
      doc.setFontSize(12);
      doc.setTextColor(0);
      doc.text('Ringkasan', 14, 42);

      autoTable(doc, {
        startY: 46,
        head: [['Keterangan', 'Nominal']],
        body: [
          ['Total Pemasukan', formatRupiah(reportData.totalIncome)],
          ['Total Pengeluaran', formatRupiah(reportData.totalExpense)],
          ['Saldo', formatRupiah(reportData.balance)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74] },
      });

      // Contributions
      const finalY1 = (doc as any).lastAutoTable.finalY + 10;
      doc.text('Riwayat Iuran', 14, finalY1);

      autoTable(doc, {
        startY: finalY1 + 4,
        head: [['Staff', 'Minggu', 'Nominal', 'Status', 'Tanggal']],
        body: reportData.contributions.map((c) => [
          c.sampName,
          `W${c.week}`,
          formatRupiah(c.amount),
          c.status === 'PAID' ? 'Lunas' : 'Belum',
          c.date,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [22, 163, 74] },
        styles: { fontSize: 8 },
      });

      // Expenses (new page if needed)
      const finalY2 = (doc as any).lastAutoTable.finalY + 10;
      if (finalY2 > 250) doc.addPage();
      const expY = finalY2 > 250 ? 20 : finalY2;

      doc.text('Pengeluaran', 14, expY);

      autoTable(doc, {
        startY: expY + 4,
        head: [['Kategori', 'Deskripsi', 'Nominal', 'Oleh', 'Tanggal']],
        body: reportData.expenses.map((e) => [
          e.category,
          e.description,
          formatRupiah(e.amount),
          e.admin,
          e.date,
        ]),
        theme: 'grid',
        headStyles: { fillColor: [239, 68, 68] },
        styles: { fontSize: 8 },
      });

      // Footer
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(
          `Digenerate pada ${new Date().toLocaleString('id-ID')} - Halaman ${i}/${pageCount}`,
          14,
          doc.internal.pageSize.height - 10
        );
      }

      doc.save(`Laporan-Kas-Westfield-${month}-${year}.pdf`);
      toast.success('File PDF berhasil diunduh!');
    } catch (error) {
      toast.error('Gagal export PDF');
      console.error(error);
    } finally {
      setExporting(null);
    }
  };

  const getMonthName = (m: number) => {
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ];
    return months[m - 1];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark-900">Laporan Keuangan</h1>
        <p className="text-dark-500 text-sm mt-1">
          Export laporan kas dalam format PDF atau Excel
        </p>
      </div>

      {/* Period Selector */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">
              <HiOutlineCalendar className="w-4 h-4 inline mr-1" />
              Bulan
            </label>
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value))}
              className="input-field"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {getMonthName(i + 1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-700 mb-1">Tahun</label>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value))}
              className="input-field"
            >
              {Array.from({ length: 5 }, (_, i) => {
                const y = new Date().getFullYear() - 2 + i;
                return (
                  <option key={y} value={y}>{y}</option>
                );
              })}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToPDF}
              disabled={loading || !reportData || exporting !== null}
              className="btn-danger flex items-center gap-2"
            >
              {exporting === 'pdf' ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <HiOutlineDocumentText className="w-4 h-4" />
              )}
              Export PDF
            </button>
            <button
              onClick={exportToExcel}
              disabled={loading || !reportData || exporting !== null}
              className="btn-primary flex items-center gap-2"
            >
              {exporting === 'excel' ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : (
                <HiOutlineTable className="w-4 h-4" />
              )}
              Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-8 w-8 text-primary-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : reportData ? (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card bg-green-50 border-green-200">
              <p className="text-sm text-green-600 font-medium">Pemasukan</p>
              <p className="text-2xl font-bold text-green-700 mt-1">
                {formatRupiah(reportData.totalIncome)}
              </p>
              <p className="text-xs text-green-500 mt-1">
                {reportData.contributions.filter((c) => c.status === 'PAID').length} transaksi
              </p>
            </div>
            <div className="card bg-red-50 border-red-200">
              <p className="text-sm text-red-600 font-medium">Pengeluaran</p>
              <p className="text-2xl font-bold text-red-700 mt-1">
                {formatRupiah(reportData.totalExpense)}
              </p>
              <p className="text-xs text-red-500 mt-1">
                {reportData.expenses.length} transaksi
              </p>
            </div>
            <div className="card bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-600 font-medium">Saldo Periode</p>
              <p className="text-2xl font-bold text-blue-700 mt-1">
                {formatRupiah(reportData.balance)}
              </p>
              <p className="text-xs text-blue-500 mt-1">
                {getMonthName(month)} {year}
              </p>
            </div>
          </div>

          {/* Data Preview */}
          <div className="card">
            <h3 className="text-sm font-semibold text-dark-700 mb-3 flex items-center gap-2">
              <HiOutlineDocumentDownload className="w-4 h-4" />
              Preview Data ({reportData.contributions.length} iuran, {reportData.expenses.length} pengeluaran)
            </h3>
            <p className="text-xs text-dark-400">
              Klik Export PDF atau Export Excel di atas untuk mengunduh laporan lengkap periode {getMonthName(month)} {year}.
            </p>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <HiOutlineDocumentText className="w-12 h-12 text-dark-300 mx-auto mb-3" />
          <p className="text-dark-400 text-sm">Tidak ada data untuk periode ini</p>
        </div>
      )}
    </div>
  );
}
