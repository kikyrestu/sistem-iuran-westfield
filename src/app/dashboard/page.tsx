'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import StatsCard from '@/components/StatsCard';
import DashboardChart from '@/components/DashboardChart';
import TransactionTable from '@/components/TransactionTable';
import { DashboardStats } from '@/types';
import { formatRupiah, getWeekNumber } from '@/lib/utils';
import {
  HiOutlineCash,
  HiOutlineTrendingUp,
  HiOutlineTrendingDown,
  HiOutlineUsers,
  HiOutlineCheckCircle,
  HiOutlineExclamationCircle,
} from 'react-icons/hi';

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar');

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto mb-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-dark-400 text-sm">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  const currentWeek = getWeekNumber();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark-900">Dashboard</h1>
        <p className="text-dark-500 text-sm mt-1">
          Selamat datang, {session?.user?.sampName}! Minggu ke-{currentWeek} tahun {new Date().getFullYear()}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard
          title="Saldo Kas"
          value={formatRupiah(stats?.totalBalance || 0)}
          icon={<HiOutlineCash className="w-5 h-5" />}
          color="green"
        />
        <StatsCard
          title="Total Pemasukan"
          value={formatRupiah(stats?.totalIncome || 0)}
          icon={<HiOutlineTrendingUp className="w-5 h-5" />}
          color="blue"
        />
        <StatsCard
          title="Total Pengeluaran"
          value={formatRupiah(stats?.totalExpense || 0)}
          icon={<HiOutlineTrendingDown className="w-5 h-5" />}
          color="red"
        />
        <StatsCard
          title="Jumlah Staff"
          value={`${stats?.totalMembers || 0}`}
          icon={<HiOutlineUsers className="w-5 h-5" />}
          color="purple"
        />
        <StatsCard
          title="Sudah Bayar"
          value={`${stats?.paidThisWeek || 0}`}
          subtitle="Minggu ini"
          icon={<HiOutlineCheckCircle className="w-5 h-5" />}
          color="green"
        />
        <StatsCard
          title="Belum Bayar"
          value={`${stats?.unpaidThisWeek || 0}`}
          subtitle="Minggu ini"
          icon={<HiOutlineExclamationCircle className="w-5 h-5" />}
          color="orange"
        />
      </div>

      {/* Chart & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-900">
              Grafik Kas Bulanan
            </h2>
            <div className="flex bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartType === 'bar'
                    ? 'bg-white text-dark-900 shadow-sm'
                    : 'text-dark-500 hover:text-dark-700'
                }`}
              >
                Bar
              </button>
              <button
                onClick={() => setChartType('line')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartType === 'line'
                    ? 'bg-white text-dark-900 shadow-sm'
                    : 'text-dark-500 hover:text-dark-700'
                }`}
              >
                Line
              </button>
            </div>
          </div>
          {stats?.monthlyData && stats.monthlyData.length > 0 ? (
            <DashboardChart data={stats.monthlyData} type={chartType} />
          ) : (
            <div className="h-[300px] flex items-center justify-center text-dark-400 text-sm">
              Belum ada data untuk ditampilkan
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-dark-900 mb-4">
            Transaksi Terbaru
          </h2>
          <TransactionTable
            transactions={stats?.recentTransactions || []}
            compact
          />
        </div>
      </div>
    </div>
  );
}
