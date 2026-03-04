'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { formatRupiah, formatDateTime, getStatusColor, getStatusLabel, getWeekNumber } from '@/lib/utils';
import { HiOutlineSearch, HiOutlineFilter } from 'react-icons/hi';

interface ContributionRecord {
  id: string;
  amount: number;
  weekNumber: number;
  year: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
  user: {
    name: string;
    sampName: string;
  };
}

export default function TransactionsPage() {
  const { data: session } = useSession();
  const [contributions, setContributions] = useState<ContributionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'PAID' | 'UNPAID' | 'EXPIRED'>('all');
  const [search, setSearch] = useState('');

  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions');
      const data = await res.json();
      if (data.success) {
        setContributions(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredContributions = contributions.filter((c) => {
    const matchFilter = filter === 'all' || c.status === filter;
    const matchSearch =
      search === '' ||
      c.user.sampName.toLowerCase().includes(search.toLowerCase()) ||
      c.user.name.toLowerCase().includes(search.toLowerCase());
    return matchFilter && matchSearch;
  });

  const totalPaid = contributions
    .filter((c) => c.status === 'PAID')
    .reduce((sum, c) => sum + c.amount, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <svg className="animate-spin h-8 w-8 text-primary-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-900">Riwayat Iuran</h1>
          <p className="text-dark-500 text-sm mt-1">
            Total terkumpul: <span className="font-semibold text-green-600">{formatRupiah(totalPaid)}</span>
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        {isAdmin && (
          <div className="relative flex-1 max-w-xs">
            <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama staff..."
              className="input-field pl-9 py-2 text-sm"
            />
          </div>
        )}

        {/* Status Filter */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
          {[
            { value: 'all', label: 'Semua' },
            { value: 'PAID', label: 'Lunas' },
            { value: 'UNPAID', label: 'Belum' },
            { value: 'EXPIRED', label: 'Expired' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as any)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f.value
                  ? 'bg-white text-dark-900 shadow-sm'
                  : 'text-dark-500 hover:text-dark-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">
                  Staff
                </th>
                <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-4 py-3">
                  Minggu
                </th>
                <th className="text-right text-xs font-medium text-dark-500 uppercase tracking-wider px-4 py-3">
                  Nominal
                </th>
                <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-right text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">
                  Tanggal Bayar
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredContributions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-dark-400">
                    <HiOutlineFilter className="w-8 h-8 mx-auto mb-2 text-dark-300" />
                    <p className="text-sm">Tidak ada data transaksi</p>
                  </td>
                </tr>
              ) : (
                filteredContributions.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3">
                      <div>
                        <p className="text-sm font-medium text-dark-800">
                          {c.user.sampName}
                        </p>
                        <p className="text-xs text-dark-400">{c.user.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-dark-600">
                        W{c.weekNumber}/{c.year}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-dark-800">
                        {formatRupiah(c.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${getStatusColor(c.status)}`}>
                        {getStatusLabel(c.status)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <span className="text-xs text-dark-400">
                        {c.paidAt ? formatDateTime(c.paidAt) : '-'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
