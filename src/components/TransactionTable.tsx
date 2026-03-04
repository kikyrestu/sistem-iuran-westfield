'use client';

import { formatRupiah, formatDateTime, getStatusColor, getStatusLabel } from '@/lib/utils';

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  userName: string;
  status?: string;
  date: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  showStatus?: boolean;
  compact?: boolean;
}

export default function TransactionTable({
  transactions,
  showStatus = false,
  compact = false,
}: TransactionTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-dark-400">
        <p className="text-sm">Belum ada transaksi</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider pb-3 pr-4">
              Deskripsi
            </th>
            {!compact && (
              <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider pb-3 pr-4">
                Staff
              </th>
            )}
            <th className="text-right text-xs font-medium text-dark-500 uppercase tracking-wider pb-3 pr-4">
              Jumlah
            </th>
            {showStatus && (
              <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider pb-3 pr-4">
                Status
              </th>
            )}
            <th className="text-right text-xs font-medium text-dark-500 uppercase tracking-wider pb-3">
              Tanggal
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {transactions.map((tx) => (
            <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      tx.type === 'income' ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  />
                  <span className="text-sm text-dark-800 font-medium">
                    {tx.description}
                  </span>
                </div>
              </td>
              {!compact && (
                <td className="py-3 pr-4">
                  <span className="text-sm text-dark-600">{tx.userName}</span>
                </td>
              )}
              <td className="py-3 pr-4 text-right">
                <span
                  className={`text-sm font-semibold ${
                    tx.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {tx.type === 'income' ? '+' : '-'} {formatRupiah(tx.amount)}
                </span>
              </td>
              {showStatus && tx.status && (
                <td className="py-3 pr-4 text-center">
                  <span className={`badge ${getStatusColor(tx.status)}`}>
                    {getStatusLabel(tx.status)}
                  </span>
                </td>
              )}
              <td className="py-3 text-right">
                <span className="text-xs text-dark-400">
                  {formatDateTime(tx.date)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
