'use client';

import Image from 'next/image';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import { PaymentOrderDetail } from '@/types';
import { HiOutlineQrcode, HiOutlineClock, HiOutlineCheckCircle } from 'react-icons/hi';

interface PaymentCardProps {
  payment: PaymentOrderDetail;
  onRefresh?: () => void;
}

export default function PaymentCard({ payment, onRefresh }: PaymentCardProps) {
  const isExpired = payment.expiredAt && new Date(payment.expiredAt) < new Date();
  const isPaid = payment.status === 'PAID';

  return (
    <div className="card animate-fade-in">
      <div className="text-center">
        {/* Status Badge */}
        <div className="mb-4">
          {isPaid ? (
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full">
              <HiOutlineCheckCircle className="w-5 h-5" />
              <span className="font-medium">Pembayaran Berhasil!</span>
            </div>
          ) : isExpired ? (
            <div className="inline-flex items-center gap-2 bg-red-100 text-red-700 px-4 py-2 rounded-full">
              <HiOutlineClock className="w-5 h-5" />
              <span className="font-medium">QR Code Kedaluwarsa</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-yellow-100 text-yellow-700 px-4 py-2 rounded-full pulse-green">
              <HiOutlineQrcode className="w-5 h-5" />
              <span className="font-medium">Menunggu Pembayaran</span>
            </div>
          )}
        </div>

        {/* Amount */}
        <p className="text-3xl font-bold text-dark-900 mb-1">
          {formatRupiah(payment.totalAmount)}
        </p>
        <p className="text-sm text-dark-400 mb-4">
          Iuran mingguan via QRIS
        </p>

        {/* QR Code */}
        {payment.qrUrl && !isPaid && !isExpired && (
          <div className="bg-white rounded-xl p-4 inline-block border-2 border-gray-100 mb-4">
            <Image
              src={payment.qrUrl}
              alt="QRIS QR Code"
              width={250}
              height={250}
              className="mx-auto"
              unoptimized
            />
            <p className="text-xs text-dark-400 mt-2">
              Scan QR code dengan aplikasi e-wallet / m-banking
            </p>
          </div>
        )}

        {/* Details */}
        <div className="bg-gray-50 rounded-lg p-4 text-left mt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-dark-500">Ref</span>
            <span className="text-dark-800 font-mono text-xs">{payment.merchantRef}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-dark-500">Metode</span>
            <span className="text-dark-800">{payment.paymentMethod}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-dark-500">Dibuat</span>
            <span className="text-dark-800">{formatDateTime(payment.createdAt)}</span>
          </div>
          {payment.expiredAt && (
            <div className="flex justify-between text-sm">
              <span className="text-dark-500">Kedaluwarsa</span>
              <span className={`${isExpired ? 'text-red-600' : 'text-dark-800'}`}>
                {formatDateTime(payment.expiredAt)}
              </span>
            </div>
          )}
          {payment.paidAt && (
            <div className="flex justify-between text-sm">
              <span className="text-dark-500">Dibayar</span>
              <span className="text-green-600 font-medium">{formatDateTime(payment.paidAt)}</span>
            </div>
          )}
        </div>

        {/* Refresh Button */}
        {!isPaid && !isExpired && onRefresh && (
          <button
            onClick={onRefresh}
            className="mt-4 text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Refresh status pembayaran
          </button>
        )}
      </div>
    </div>
  );
}
