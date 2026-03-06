'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { formatRupiah, getWeekNumber } from '@/lib/utils';
import { HiOutlineQrcode, HiOutlineCash, HiOutlineClock } from 'react-icons/hi';

const AMOUNT_OPTIONS = [5000, 6000, 7000, 8000, 9000, 10000];

export default function PaymentPage() {
  const { data: session } = useSession();
  const [amount, setAmount] = useState(5000);
  const [loading, setLoading] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(true);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [waitingConfirmation, setWaitingConfirmation] = useState(false);
  const [showQris, setShowQris] = useState(false);
  const [existingAmount, setExistingAmount] = useState(0);

  const currentWeek = getWeekNumber();
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    checkExistingContribution();
  }, []);

  const checkExistingContribution = async () => {
    try {
      const res = await fetch('/api/contributions');
      const data = await res.json();

      if (data.success && data.data) {
        const thisWeek = data.data.find(
          (c: { weekNumber: number; year: number }) =>
            c.weekNumber === currentWeek && c.year === currentYear
        );

        if (thisWeek) {
          if (thisWeek.status === 'PAID') {
            setAlreadyPaid(true);
          } else if (thisWeek.status === 'UNPAID') {
            setWaitingConfirmation(true);
            setExistingAmount(thisWeek.amount);
          }
        }
      }
    } catch (error) {
      console.error('Error checking contribution:', error);
    } finally {
      setCheckingExisting(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (amount < 5000 || amount > 10000) {
      toast.error('Nominal harus antara Rp 5.000 - Rp 10.000');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/contributions', {
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
        setWaitingConfirmation(true);
        setExistingAmount(amount);
        setShowQris(false);
        toast.success('Iuran berhasil dicatat! Menunggu konfirmasi admin.');
      } else {
        toast.error(data.message || 'Gagal mencatat iuran');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setLoading(false);
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

      {/* Waiting Confirmation */}
      {waitingConfirmation && (
        <div className="card text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <HiOutlineClock className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-xl font-semibold text-dark-900 mb-2">
            Menunggu Konfirmasi Admin
          </h2>
          <p className="text-dark-500 text-sm mb-3">
            Iuran sebesar <span className="font-semibold text-dark-800">{formatRupiah(existingAmount)}</span> sudah dicatat.
            Admin akan segera mengkonfirmasi pembayaran kamu.
          </p>
          <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 px-4 py-2 rounded-full text-sm">
            <HiOutlineClock className="w-4 h-4" />
            <span className="font-medium">Belum Dikonfirmasi</span>
          </div>
        </div>
      )}

      {/* Create New Payment */}
      {!alreadyPaid && !waitingConfirmation && (
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
                className={`py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${amount === opt
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
          </div>

          {/* Show QRIS Button or QRIS Image */}
          {!showQris ? (
            <button
              onClick={() => setShowQris(true)}
              className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2"
            >
              <HiOutlineQrcode className="w-5 h-5" />
              Tampilkan QRIS
            </button>
          ) : (
            <div className="space-y-4">
              {/* QRIS Image */}
              <div className="bg-white rounded-xl p-4 border-2 border-gray-100 text-center">
                <Image
                  src="/qris.jpeg"
                  alt="QRIS Pembayaran"
                  width={300}
                  height={400}
                  className="mx-auto rounded-lg"
                  priority
                />
                <p className="text-xs text-dark-400 mt-3">
                  Scan QR code di atas dengan aplikasi e-wallet / m-banking
                </p>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                <p className="font-semibold mb-2">Cara Bayar:</p>
                <ol className="list-decimal list-inside space-y-1 text-blue-700">
                  <li>Buka aplikasi e-wallet / m-banking kamu</li>
                  <li>Scan QRIS di atas</li>
                  <li>Masukkan nominal: <span className="font-semibold">{formatRupiah(amount)}</span></li>
                  <li>Selesaikan pembayaran</li>
                  <li>Klik tombol &quot;Saya Sudah Bayar&quot; di bawah</li>
                </ol>
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleSubmitPayment}
                disabled={loading}
                className="w-full btn-primary py-3 text-base flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memproses...
                  </>
                ) : (
                  <>
                    <HiOutlineCash className="w-5 h-5" />
                    Saya Sudah Bayar
                  </>
                )}
              </button>

              <p className="text-xs text-dark-400 text-center">
                Setelah klik, admin akan memverifikasi dan mengkonfirmasi pembayaran kamu.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
