import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { getWeekNumber, formatDate } from '@/lib/utils';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    const monthParam = url.searchParams.get('month');
    const yearParam = url.searchParams.get('year');

    // Report mode
    if (type === 'report' && monthParam && yearParam) {
      const month = parseInt(monthParam);
      const year = parseInt(yearParam);

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);

      const contributions = await prisma.contribution.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          user: { select: { name: true, sampName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const expenses = await prisma.expense.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
        },
        include: {
          admin: { select: { name: true, sampName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      const totalIncome = contributions
        .filter((c) => c.status === 'PAID')
        .reduce((sum, c) => sum + c.amount, 0);

      const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);

      return NextResponse.json({
        success: true,
        data: {
          period: `${month}/${year}`,
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          contributions: contributions.map((c) => ({
            user: c.user.name,
            sampName: c.user.sampName,
            amount: c.amount,
            week: c.weekNumber,
            status: c.status,
            date: formatDate(c.createdAt),
          })),
          expenses: expenses.map((e) => ({
            category: e.category,
            description: e.description,
            amount: e.amount,
            admin: e.admin.sampName,
            date: formatDate(e.createdAt),
          })),
        },
      });
    }

    // Dashboard stats mode
    const currentWeek = getWeekNumber();
    const currentYear = new Date().getFullYear();

    // Get total balance
    const cashBalance = await prisma.cashBalance.findFirst();
    
    // Calculate totals
    const paidContributions = await prisma.contribution.aggregate({
      where: { status: 'PAID' },
      _sum: { amount: true },
    });

    const totalExpenses = await prisma.expense.aggregate({
      _sum: { amount: true },
    });

    const totalIncome = paidContributions._sum.amount || 0;
    const totalExpense = totalExpenses._sum.amount || 0;

    // Staff counts
    const totalMembers = await prisma.user.count({ where: { isActive: true } });

    // This week's contribution status
    const thisWeekContributions = await prisma.contribution.findMany({
      where: { weekNumber: currentWeek, year: currentYear },
    });
    const paidThisWeek = thisWeekContributions.filter((c) => c.status === 'PAID').length;
    const unpaidThisWeek = totalMembers - paidThisWeek;

    // Recent transactions (last 10)
    const recentContributions = await prisma.contribution.findMany({
      where: { status: 'PAID' },
      include: { user: { select: { sampName: true } } },
      orderBy: { paidAt: 'desc' },
      take: 5,
    });

    const recentExpenses = await prisma.expense.findMany({
      include: { admin: { select: { sampName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const recentTransactions = [
      ...recentContributions.map((c) => ({
        id: c.id,
        type: 'income' as const,
        amount: c.amount,
        description: `Iuran W${c.weekNumber}`,
        userName: c.user.sampName,
        date: (c.paidAt || c.createdAt).toISOString(),
      })),
      ...recentExpenses.map((e) => ({
        id: e.id,
        type: 'expense' as const,
        amount: e.amount,
        description: e.description,
        userName: e.admin.sampName,
        date: e.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 8);

    // Monthly data for chart (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const m = d.getMonth();
      const y = d.getFullYear();
      const monthStart = new Date(y, m, 1);
      const monthEnd = new Date(y, m + 1, 0, 23, 59, 59);

      const monthIncome = await prisma.contribution.aggregate({
        where: {
          status: 'PAID',
          paidAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      });

      const monthExpense = await prisma.expense.aggregate({
        where: {
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      });

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
      monthlyData.push({
        month: monthNames[m],
        income: monthIncome._sum.amount || 0,
        expense: monthExpense._sum.amount || 0,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        totalBalance: cashBalance?.balance ?? (totalIncome - totalExpense),
        totalIncome,
        totalExpense,
        totalMembers,
        paidThisWeek,
        unpaidThisWeek: Math.max(0, unpaidThisWeek),
        recentTransactions,
        monthlyData,
      },
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
