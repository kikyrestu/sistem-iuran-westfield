'use client';

import { useSession, signOut } from 'next-auth/react';
import { HiOutlineMenuAlt2, HiOutlineLogout, HiOutlineUser } from 'react-icons/hi';
import toast from 'react-hot-toast';

interface NavbarProps {
  onMenuClick: () => void;
  title?: string;
}

export default function Navbar({ onMenuClick, title }: NavbarProps) {
  const { data: session } = useSession();

  const handleLogout = async () => {
    toast.success('Berhasil logout');
    await signOut({ callbackUrl: '/login' });
  };

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Left Side */}
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <HiOutlineMenuAlt2 className="w-5 h-5" />
          </button>
          {title && (
            <h1 className="text-lg font-semibold text-dark-900">{title}</h1>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-3">
          {/* User Info */}
          <div className="hidden sm:flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5">
            <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center">
              <HiOutlineUser className="w-4 h-4 text-primary-600" />
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-dark-800 leading-tight">
                {session?.user?.sampName || session?.user?.name}
              </p>
              <p className="text-xs text-dark-500 leading-tight">
                {session?.user?.role === 'ADMIN' ? 'Admin' : 'Staff'}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Logout"
          >
            <HiOutlineLogout className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
