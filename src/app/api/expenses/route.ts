import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const expenses = await prisma.expense.findMany({
      include: {
        admin: {
          select: { id: true, name: true, sampName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: expenses.map((e) => ({
        id: e.id,
        amount: e.amount,
        category: e.category,
        description: e.description,
        receiptUrl: e.receiptUrl,
        createdAt: e.createdAt.toISOString(),
        admin: {
          id: e.admin.id,
          name: e.admin.name,
          sampName: e.admin.sampName,
        },
      })),
    });
  } catch (error) {
    console.error('Expenses GET error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Hanya admin yang bisa menambah pengeluaran' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { amount, category, description } = body;

    if (!amount || !category || !description) {
      return NextResponse.json(
        { success: false, message: 'Amount, category, dan description wajib diisi' },
        { status: 400 }
      );
    }

    // Type and range validation
    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1000 || amount > 100000000) {
      return NextResponse.json(
        { success: false, message: 'Jumlah harus angka bulat antara Rp 1.000 - Rp 100.000.000' },
        { status: 400 }
      );
    }

    // Category validation
    const validCategories = ['hosting', 'domain', 'script', 'ads', 'maintenance', 'other'];
    if (typeof category !== 'string' || !validCategories.includes(category)) {
      return NextResponse.json(
        { success: false, message: 'Kategori tidak valid' },
        { status: 400 }
      );
    }

    // Description length limit
    if (typeof description !== 'string' || description.trim().length === 0 || description.length > 500) {
      return NextResponse.json(
        { success: false, message: 'Deskripsi wajib diisi (maksimal 500 karakter)' },
        { status: 400 }
      );
    }

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        adminId: session.user.id,
        amount,
        category,
        description,
      },
      include: {
        admin: { select: { id: true, name: true, sampName: true } },
      },
    });

    // Update cash balance
    await prisma.cashBalance.updateMany({
      data: {
        balance: { decrement: amount },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'EXPENSE_CREATED',
        performedBy: session.user.id,
        details: JSON.stringify({
          amount,
          category,
          description,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: expense.id,
        amount: expense.amount,
        category: expense.category,
        description: expense.description,
        createdAt: expense.createdAt.toISOString(),
        admin: expense.admin,
      },
    });
  } catch (error) {
    console.error('Expenses POST error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Hanya admin yang bisa menghapus pengeluaran' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID pengeluaran wajib diisi' },
        { status: 400 }
      );
    }

    const expense = await prisma.expense.findUnique({ where: { id } });
    if (!expense) {
      return NextResponse.json(
        { success: false, message: 'Pengeluaran tidak ditemukan' },
        { status: 404 }
      );
    }

    // Delete expense
    await prisma.expense.delete({ where: { id } });

    // Restore cash balance
    await prisma.cashBalance.updateMany({
      data: {
        balance: { increment: expense.amount },
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'EXPENSE_DELETED',
        performedBy: session.user.id,
        details: JSON.stringify({
          expenseId: id,
          amount: expense.amount,
          category: expense.category,
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Expenses DELETE error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
