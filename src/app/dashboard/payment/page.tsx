'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import PaymentCard from '@/components/PaymentCard';
import { PaymentOrderDetail } from '@/types';
import { formatRupiah, getWeekNumber } from '@/lib/utils';
import { HiOutlineQrcode, HiOutlineCash } from 'react-icons/hi';

const AMOUNT_OPTIONS = [5000, 6000, 7000, 8000, 9000, 10000];

export default function PaymentPage() {
  const { data: session } = useSession();
  const [amount, setAmount] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [activePayment, setActivePayment] = useState<PaymentOrderDetail | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [alreadyPaid, setAlreadyPaid] = useState(false);

  const currentWeek = getWeekNumber();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    checkExistingPayment();
  }, []);

  const checkExistingPayment = async () => {
    try {
      const res = await fetch(
        `/api/payment/create?week=${currentWeek}&year=${currentYear}`
      );
      const data = await res.json();

      if (data.success && data.data) {
        if (data.data.status === 'PAID') {
          setAlreadyPaid(true);
        } else if (data.data.status === 'UNPAID') {
          setActivePayment(data.data);
        }
      }
    } catch (error) {
      console.error('Error checking payment:', error);
    } finally {
      setCheckingExisting(false);
    }
  };

  const handleCreatePayment = async () => {
    if (amount < 5000 || amount > 10000) {
      toast.error('Nominal harus antara Rp 5.000 - Rp 10.000');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          weekNumber: currentWeek,
          year: currentYear,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setActivePayment(data.data);
        toast.success('QR Code berhasil dibuat! Silakan scan untuk bayar.');
      } else {
        toast.error(data.message || 'Gagal membuat pembayaran');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!activePayment) return;

    try {
      const res = await fetch(
        `/api/payment/create?week=${currentWeek}&year=${currentYear}`
      );
      const data = await res.json();

      if (data.success && data.data) {
        setActivePayment(data.data);
        if (data.data.status === 'PAID') {
          setAlreadyPaid(true);
          setActivePayment(null);
          toast.success('Pembayaran sudah diterima!');
        }
      }
    } catch {
      toast.error('Gagal refresh status');
    }
  };

  if (checkingExisting) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 text-primary-600 mx-auto mb-3" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-dark-400 text-sm">Memeriksa status pembayaran...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-bold text-dark-900">Bayar Iuran</h1>
        <p className="text-dark-500 text-sm mt-1">
          Minggu ke-{currentWeek}, {currentYear}
        </p>
      </div>

      {/* Already Paid */}
      {alreadyPaid && (
        <div className="card text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HiOutlineCash className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-dark-900 mb-2">
            Iuran Minggu Ini Sudah Lunas!
          </h2>
          <p className="text-dark-500 text-sm">
            Terima kasih sudah bayar iuran minggu ini, {session?.user?.sampName}. 
            Kamu sudah berkontribusi untuk server kita!
          </p>
        </div>
      )}

      {/* Active Payment QR */}
      {activePayment && (
        <PaymentCard payment={activePayment} onRefresh={handleRefresh} />
      )}

      {/* Create New Payment */}
      {!alreadyPaid && !activePayment && (
        <div className="card">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <HiOutlineQrcode className="w-7 h-7 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-dark-900">
              Pilih Nominal Iuran
            </h2>
            <p className="text-sm text-dark-500 mt-1">
              Semampu kamu, range Rp 5.000 - Rp 10.000
            </p>
          </div>

          {/* Amount Selection */}
          <div className="grid grid-cols-3 gap-2 mb-6">
            {AMOUNT_OPTIONS.map((opt) => (
              <button
                key={opt}
                onClick={() => setAmount(opt)}
                className={`py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  amount === opt
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30 scale-105'
                    : 'bg-gray-100 text-dark-700 hover:bg-gray-200'
                }`}
              >
                {formatRupiah(opt)}
              </button>
            ))}
          </div>

          {/* Selected Amount Display */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-dark-500">Nominal yang dipilih</p>
            <p className="text-3xl font-bold text-dark-900 mt-1">
              {formatRupiah(amount)}
            </p>
            <p className="text-xs text-dark-400 mt-1">
              Tanpa biaya tambahan via QRIS
            </p>
          </div>

          {/* Pay Button */}
          <button
            onClick={handleCreatePayment}
            disabled={loading}
            className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Membuat QR Code...
              </>
            ) : (
              <>
                <HiOutlineQrcode className="w-5 h-5" />
                Bayar via QRIS
              </>
            )}
          </button>

          <p className="text-xs text-dark-400 text-center mt-4">
            QR Code berlaku selama 24 jam. Bayar pakai e-wallet atau m-banking.
          </p>
        </div>
      )}
    </div>
  );
}
