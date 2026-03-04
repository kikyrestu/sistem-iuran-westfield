'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import ExpenseForm from '@/components/ExpenseForm';
import { ExpenseWithAdmin } from '@/types';
import { formatRupiah, formatDateTime, getCategoryLabel } from '@/lib/utils';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineCash } from 'react-icons/hi';

export default function ExpensesPage() {
  const { data: session } = useSession();
  const [expenses, setExpenses] = useState<ExpenseWithAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json();
      if (data.success) {
        setExpenses(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (formData: {
    amount: number;
    category: string;
    description: string;
  }) => {
    const res = await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    const data = await res.json();

    if (data.success) {
      toast.success('Pengeluaran berhasil dicatat!');
      setShowForm(false);
      fetchExpenses();
    } else {
      toast.error(data.message || 'Gagal menambah pengeluaran');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Yakin ingin menghapus pengeluaran ini?')) return;

    try {
      const res = await fetch(`/api/expenses?id=${id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Pengeluaran berhasil dihapus');
        fetchExpenses();
      } else {
        toast.error(data.message || 'Gagal menghapus');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

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
          <h1 className="text-2xl font-bold text-dark-900">Pengeluaran Kas</h1>
          <p className="text-dark-500 text-sm mt-1">
            Total pengeluaran: <span className="font-semibold text-red-600">{formatRupiah(totalExpenses)}</span>
          </p>
        </div>
        {isAdmin && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <HiOutlinePlus className="w-4 h-4" />
            Tambah Pengeluaran
          </button>
        )}
      </div>

      {/* Expense Form */}
      {showForm && isAdmin && (
        <ExpenseForm onSubmit={handleAddExpense} onCancel={() => setShowForm(false)} />
      )}

      {/* Expense List */}
      <div className="space-y-3">
        {expenses.length === 0 ? (
          <div className="card text-center py-12">
            <HiOutlineCash className="w-12 h-12 text-dark-300 mx-auto mb-3" />
            <p className="text-dark-400 text-sm">Belum ada pengeluaran tercatat</p>
          </div>
        ) : (
          expenses.map((expense) => (
            <div key={expense.id} className="card animate-fade-in">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge bg-red-100 text-red-700">
                      {getCategoryLabel(expense.category)}
                    </span>
                    <span className="text-xs text-dark-400">
                      oleh {expense.admin.sampName}
                    </span>
                  </div>
                  <p className="text-sm text-dark-800 font-medium">
                    {expense.description}
                  </p>
                  <p className="text-xs text-dark-400 mt-1">
                    {formatDateTime(expense.createdAt)}
                  </p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <p className="text-lg font-bold text-red-600">
                    -{formatRupiah(expense.amount)}
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => handleDeleteExpense(expense.id)}
                      className="p-1.5 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Hapus"
                    >
                      <HiOutlineTrash className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
