'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { EXPENSE_CATEGORIES } from '@/lib/utils';

interface ExpenseFormProps {
  onSubmit: (data: {
    amount: number;
    category: string;
    description: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function ExpenseForm({ onSubmit, onCancel }: ExpenseFormProps) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseInt(amount.replace(/\D/g, ''));
    if (!parsedAmount || parsedAmount < 1000) {
      toast.error('Jumlah minimal Rp 1.000');
      return;
    }

    if (!category) {
      toast.error('Pilih kategori pengeluaran');
      return;
    }

    if (!description.trim()) {
      toast.error('Deskripsi tidak boleh kosong');
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        amount: parsedAmount,
        category,
        description: description.trim(),
      });
    } catch {
      toast.error('Gagal menyimpan pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  const formatInputRupiah = (value: string) => {
    const number = value.replace(/\D/g, '');
    if (!number) return '';
    return new Intl.NumberFormat('id-ID').format(parseInt(number));
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm animate-fade-in">
      <h3 className="text-lg font-semibold text-dark-900 mb-4">
        Tambah Pengeluaran Baru
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-dark-700 mb-1">
            Jumlah (Rp)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm">
              Rp
            </span>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(formatInputRupiah(e.target.value))}
              placeholder="0"
              className="input-field pl-10"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-700 mb-1">
            Kategori
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-field"
            required
          >
            <option value="">Pilih kategori...</option>
            {EXPENSE_CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-dark-700 mb-1">
            Deskripsi
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Contoh: Bayar hosting server bulan Maret"
            className="input-field resize-none"
            rows={3}
            required
          />
        </div>

        <div className="flex gap-2 pt-2">
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Menyimpan...' : 'Simpan Pengeluaran'}
          </button>
          <button type="button" onClick={onCancel} className="btn-outline">
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}
