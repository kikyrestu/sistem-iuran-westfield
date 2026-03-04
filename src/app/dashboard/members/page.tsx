'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { formatDateTime } from '@/lib/utils';
import {
  HiOutlinePlus,
  HiOutlineTrash,
  HiOutlineUsers,
  HiOutlineBan,
  HiOutlineCheckCircle,
  HiOutlineEye,
  HiOutlineEyeOff,
} from 'react-icons/hi';

interface Member {
  id: string;
  name: string;
  email: string;
  sampName: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  _count: {
    contributions: number;
  };
}

export default function MembersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    sampName: '',
    role: 'STAFF',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    if (!isAdmin) {
      router.push('/dashboard');
      return;
    }
    fetchMembers();
  }, [isAdmin]);

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (data.success) {
        setMembers(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Staff berhasil ditambahkan!');
        setShowAddForm(false);
        setFormData({ name: '', email: '', password: '', sampName: '', role: 'STAFF' });
        fetchMembers();
      } else {
        toast.error(data.message || 'Gagal menambah staff');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, isActive: !currentStatus }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success(currentStatus ? 'Staff dinonaktifkan' : 'Staff diaktifkan kembali');
        fetchMembers();
      } else {
        toast.error(data.message || 'Gagal update status');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  const handleDeleteMember = async (userId: string, name: string) => {
    if (!confirm(`Yakin ingin menghapus ${name}? Semua data terkait akan ikut terhapus.`)) return;

    try {
      const res = await fetch(`/api/users?id=${userId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Staff berhasil dihapus');
        fetchMembers();
      } else {
        toast.error(data.message || 'Gagal menghapus');
      }
    } catch {
      toast.error('Terjadi kesalahan');
    }
  };

  if (!isAdmin) return null;

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
          <h1 className="text-2xl font-bold text-dark-900">Kelola Staff</h1>
          <p className="text-dark-500 text-sm mt-1">
            Total {members.length} staff terdaftar
          </p>
        </div>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn-primary flex items-center gap-2"
          >
            <HiOutlinePlus className="w-4 h-4" />
            Tambah Staff
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="card animate-fade-in">
          <h3 className="text-lg font-semibold text-dark-900 mb-4">Tambah Staff Baru</h3>
          <form onSubmit={handleAddMember} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">Nama Lengkap</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">Nama In-Game (SAMP)</label>
              <input
                type="text"
                value={formData.sampName}
                onChange={(e) => setFormData({ ...formData, sampName: e.target.value })}
                placeholder="John_Doe"
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input-field pr-10"
                  minLength={6}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400"
                >
                  {showPassword ? <HiOutlineEyeOff className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-700 mb-1">Role</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="input-field"
              >
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={submitting} className="btn-primary flex-1">
                {submitting ? 'Menyimpan...' : 'Tambah Staff'}
              </button>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-outline">
                Batal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Members List */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">
                  Staff
                </th>
                <th className="text-left text-xs font-medium text-dark-500 uppercase tracking-wider px-4 py-3">
                  Email
                </th>
                <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-4 py-3">
                  Role
                </th>
                <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-4 py-3">
                  Kontribusi
                </th>
                <th className="text-center text-xs font-medium text-dark-500 uppercase tracking-wider px-4 py-3">
                  Status
                </th>
                <th className="text-right text-xs font-medium text-dark-500 uppercase tracking-wider px-6 py-3">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-3">
                    <div>
                      <p className="text-sm font-medium text-dark-800">{member.sampName}</p>
                      <p className="text-xs text-dark-400">{member.name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-dark-600">{member.email}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${member.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="text-sm text-dark-600">{member._count.contributions}x</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`badge ${member.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {member.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggleActive(member.id, member.isActive)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          member.isActive
                            ? 'text-dark-400 hover:text-orange-600 hover:bg-orange-50'
                            : 'text-dark-400 hover:text-green-600 hover:bg-green-50'
                        }`}
                        title={member.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        {member.isActive ? <HiOutlineBan className="w-4 h-4" /> : <HiOutlineCheckCircle className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDeleteMember(member.id, member.sampName)}
                        className="p-1.5 text-dark-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <HiOutlineTrash className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
