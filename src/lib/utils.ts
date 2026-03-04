// Simple classname merger
export function cn(...inputs: (string | undefined | null | false)[]) {
  return inputs.filter(Boolean).join(' ');
}

/**
 * Format angka ke Rupiah
 */
export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format tanggal ke format Indonesia
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
}

/**
 * Format tanggal dengan waktu
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Dapatkan nomor minggu dalam tahun
 */
export function getWeekNumber(date: Date = new Date()): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDays = (date.getTime() - startOfYear.getTime()) / 86400000;
  return Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
}

/**
 * Dapatkan range tanggal untuk minggu tertentu
 */
export function getWeekDateRange(weekNumber: number, year: number): { start: Date; end: Date } {
  const startOfYear = new Date(year, 0, 1);
  const dayOfWeek = startOfYear.getDay();
  const daysToAdd = (weekNumber - 1) * 7 - dayOfWeek + 1;

  const start = new Date(year, 0, 1 + daysToAdd);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return { start, end };
}

/**
 * Status badge color mapping
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'PAID':
      return 'bg-green-100 text-green-800';
    case 'UNPAID':
      return 'bg-yellow-100 text-yellow-800';
    case 'EXPIRED':
      return 'bg-red-100 text-red-800';
    case 'FAILED':
      return 'bg-red-100 text-red-800';
    case 'REFUND':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Status label in Bahasa Indonesia
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'PAID':
      return 'Lunas';
    case 'UNPAID':
      return 'Belum Bayar';
    case 'EXPIRED':
      return 'Kedaluwarsa';
    case 'FAILED':
      return 'Gagal';
    case 'REFUND':
      return 'Refund';
    default:
      return status;
  }
}

/**
 * Expense category labels
 */
export const EXPENSE_CATEGORIES = [
  { value: 'hosting', label: 'Hosting Server' },
  { value: 'domain', label: 'Domain' },
  { value: 'script', label: 'Script/Plugin' },
  { value: 'ads', label: 'Iklan/Promosi' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'other', label: 'Lainnya' },
] as const;

export function getCategoryLabel(value: string): string {
  const category = EXPENSE_CATEGORIES.find((c) => c.value === value);
  return category?.label || value;
}
