import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * GET - List contributions
 * Admin: semua contributions
 * Staff: hanya milik sendiri
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const isAdmin = session.user.role === 'ADMIN';

    const contributions = await prisma.contribution.findMany({
      where: isAdmin ? {} : { userId: session.user.id },
      include: {
        user: {
          select: { id: true, name: true, sampName: true, email: true },
        },
        confirmer: {
          select: { name: true, sampName: true },
        },
      },
      orderBy: [{ year: 'desc' }, { weekNumber: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      data: contributions.map((c) => ({
        id: c.id,
        amount: c.amount,
        weekNumber: c.weekNumber,
        year: c.year,
        status: c.status,
        paidAt: c.paidAt?.toISOString() || null,
        confirmedBy: c.confirmedBy,
        confirmerName: c.confirmer?.sampName || null,
        proofNote: c.proofNote,
        createdAt: c.createdAt.toISOString(),
        user: {
          id: c.user.id,
          name: c.user.name,
          sampName: c.user.sampName,
          email: c.user.email,
        },
      })),
    });
  } catch (error) {
    console.error('Contributions GET error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST - Staff buat contribution baru (setelah scan QRIS statis)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { amount, weekNumber, year } = body;

    // Validate amount
    if (!amount || typeof amount !== 'number' || !Number.isInteger(amount) || amount < 5000 || amount > 10000) {
      return NextResponse.json(
        { success: false, message: 'Nominal harus antara Rp 5.000 - Rp 10.000' },
        { status: 400 }
      );
    }

    // Validate weekNumber and year
    const currentYear = new Date().getFullYear();
    if (
      !weekNumber || typeof weekNumber !== 'number' || !Number.isInteger(weekNumber) ||
      weekNumber < 1 || weekNumber > 53 ||
      !year || typeof year !== 'number' || !Number.isInteger(year) ||
      year < currentYear - 1 || year > currentYear + 1
    ) {
      return NextResponse.json(
        { success: false, message: 'Week dan year tidak valid' },
        { status: 400 }
      );
    }

    // Check if already exists for this week
    const existing = await prisma.contribution.findUnique({
      where: {
        userId_weekNumber_year: {
          userId: session.user.id,
          weekNumber,
          year,
        },
      },
    });

    if (existing?.status === 'PAID') {
      return NextResponse.json(
        { success: false, message: 'Kamu sudah bayar iuran minggu ini!' },
        { status: 400 }
      );
    }

    // If there's an existing UNPAID, update the amount
    if (existing) {
      const updated = await prisma.contribution.update({
        where: { id: existing.id },
        data: { amount },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updated.id,
          amount: updated.amount,
          weekNumber: updated.weekNumber,
          year: updated.year,
          status: updated.status,
        },
      });
    }

    // Create new contribution
    const contribution = await prisma.contribution.create({
      data: {
        userId: session.user.id,
        amount,
        weekNumber,
        year,
        status: 'UNPAID',
      },
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'CONTRIBUTION_CREATED',
        performedBy: session.user.id,
        details: JSON.stringify({ amount, weekNumber, year }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: contribution.id,
        amount: contribution.amount,
        weekNumber: contribution.weekNumber,
        year: contribution.year,
        status: contribution.status,
      },
    });
  } catch (error) {
    console.error('Contributions POST error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Admin konfirmasi pembayaran
 */
export async function PATCH(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { contributionId, proofNote } = body;

    if (!contributionId || typeof contributionId !== 'string') {
      return NextResponse.json(
        { success: false, message: 'contributionId wajib diisi' },
        { status: 400 }
      );
    }

    // Find the contribution
    const contribution = await prisma.contribution.findUnique({
      where: { id: contributionId },
    });

    if (!contribution) {
      return NextResponse.json(
        { success: false, message: 'Contribution tidak ditemukan' },
        { status: 404 }
      );
    }

    if (contribution.status === 'PAID') {
      return NextResponse.json(
        { success: false, message: 'Iuran ini sudah dikonfirmasi' },
        { status: 400 }
      );
    }

    // Use database transaction for atomicity
    await prisma.$transaction(async (tx) => {
      // Update contribution
      await tx.contribution.update({
        where: { id: contributionId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
          confirmedBy: session.user.id,
          proofNote: proofNote || null,
        },
      });

      // Update cash balance
      const existingBalance = await tx.cashBalance.findFirst();
      if (existingBalance) {
        await tx.cashBalance.update({
          where: { id: existingBalance.id },
          data: {
            balance: { increment: contribution.amount },
          },
        });
      } else {
        await tx.cashBalance.create({
          data: {
            balance: contribution.amount,
          },
        });
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          action: 'PAYMENT_CONFIRMED',
          performedBy: session.user.id,
          details: JSON.stringify({
            contributionId,
            amount: contribution.amount,
            userId: contribution.userId,
            proofNote,
          }),
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contributions PATCH error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Admin hapus contribution
 */
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, message: 'ID wajib diisi' },
        { status: 400 }
      );
    }

    const contribution = await prisma.contribution.findUnique({
      where: { id },
    });

    if (!contribution) {
      return NextResponse.json(
        { success: false, message: 'Contribution tidak ditemukan' },
        { status: 404 }
      );
    }

    // If it was PAID, restore the cash balance
    if (contribution.status === 'PAID') {
      await prisma.$transaction(async (tx) => {
        await tx.contribution.delete({ where: { id } });

        const existingBalance = await tx.cashBalance.findFirst();
        if (existingBalance) {
          await tx.cashBalance.update({
            where: { id: existingBalance.id },
            data: {
              balance: { decrement: contribution.amount },
            },
          });
        }
      });
    } else {
      await prisma.contribution.delete({ where: { id } });
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: 'CONTRIBUTION_DELETED',
        performedBy: session.user.id,
        details: JSON.stringify({
          contributionId: id,
          amount: contribution.amount,
          status: contribution.status,
        }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contributions DELETE error:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
