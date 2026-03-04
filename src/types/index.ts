import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'ADMIN' | 'STAFF';
      sampName: string;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    role: 'ADMIN' | 'STAFF';
    sampName: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    role: 'ADMIN' | 'STAFF';
    sampName: string;
  }
}

export interface DashboardStats {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
  totalMembers: number;
  paidThisWeek: number;
  unpaidThisWeek: number;
  recentTransactions: RecentTransaction[];
  monthlyData: MonthlyData[];
}

export interface RecentTransaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  userName: string;
  date: string;
}

export interface MonthlyData {
  month: string;
  income: number;
  expense: number;
}

export interface ContributionWithUser {
  id: string;
  amount: number;
  weekNumber: number;
  year: number;
  status: string;
  paidAt: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    sampName: string;
    email: string;
  };
}

export interface ExpenseWithAdmin {
  id: string;
  amount: number;
  category: string;
  description: string;
  receiptUrl: string | null;
  createdAt: string;
  admin: {
    id: string;
    name: string;
    sampName: string;
  };
}

export interface PaymentOrderDetail {
  id: string;
  merchantRef: string;
  midtransId: string | null;
  amount: number;
  fee: number;
  totalAmount: number;
  paymentMethod: string;
  status: string;
  qrUrl: string | null;
  qrString: string | null;
  expiredAt: string | null;
  paidAt: string | null;
  createdAt: string;
}
