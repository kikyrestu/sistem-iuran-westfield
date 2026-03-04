'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  HiOutlineHome,
  HiOutlineCreditCard,
  HiOutlineClipboardList,
  HiOutlineCash,
  HiOutlineUsers,
  HiOutlineDocumentReport,
  HiOutlineShieldCheck,
  HiOutlineX,
} from 'react-icons/hi';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const menuItems = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: HiOutlineHome,
    roles: ['ADMIN', 'STAFF'],
  },
  {
    href: '/dashboard/payment',
    label: 'Bayar Iuran',
    icon: HiOutlineCreditCard,
    roles: ['ADMIN', 'STAFF'],
  },
  {
    href: '/dashboard/transactions',
    label: 'Riwayat Transaksi',
    icon: HiOutlineClipboardList,
    roles: ['ADMIN', 'STAFF'],
  },
  {
    href: '/dashboard/expenses',
    label: 'Pengeluaran',
    icon: HiOutlineCash,
    roles: ['ADMIN', 'STAFF'],
  },
  {
    href: '/dashboard/members',
    label: 'Kelola Staff',
    icon: HiOutlineUsers,
    roles: ['ADMIN'],
  },
  {
    href: '/dashboard/reports',
    label: 'Laporan',
    icon: HiOutlineDocumentReport,
    roles: ['ADMIN', 'STAFF'],
  },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role || 'STAFF';

  const filteredMenu = menuItems.filter((item) => item.roles.includes(userRole));

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-dark-900 border-r border-dark-700 
                    transform transition-transform duration-300 ease-in-out lg:translate-x-0
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-dark-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20">
              <HiOutlineShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm">Westfield RP</h1>
              <p className="text-dark-500 text-xs">Sistem Kas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-dark-400 hover:text-white transition-colors"
          >
            <HiOutlineX className="w-5 h-5" />
          </button>
        </div>

        {/* Menu */}
        <nav className="px-3 py-4 space-y-1">
          {filteredMenu.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium 
                           transition-all duration-200 group
                           ${
                             isActive
                               ? 'bg-primary-600/20 text-primary-400'
                               : 'text-dark-400 hover:bg-dark-800 hover:text-white'
                           }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${
                    isActive ? 'text-primary-400' : 'text-dark-500 group-hover:text-dark-300'
                  }`}
                />
                {item.label}
                {isActive && (
                  <div className="ml-auto w-1.5 h-1.5 bg-primary-400 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-dark-700">
          <div className="bg-dark-800 rounded-lg p-3">
            <p className="text-xs text-dark-500 mb-1">Iuran Mingguan</p>
            <p className="text-sm text-white font-semibold">Rp 5.000 - Rp 10.000</p>
            <p className="text-xs text-dark-500 mt-1">Semampu kamu, yang penting rutin!</p>
          </div>
        </div>
      </aside>
    </>
  );
}
